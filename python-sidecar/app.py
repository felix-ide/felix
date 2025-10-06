import os
import time
import hashlib
from typing import List, Optional, Union

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

try:
    import torch  # type: ignore
    from sentence_transformers import SentenceTransformer  # type: ignore
    _TORCH_AVAILABLE = True
except Exception:
    torch = None  # type: ignore
    SentenceTransformer = None  # type: ignore
    _TORCH_AVAILABLE = False


class EmbeddingRequest(BaseModel):
    inputs: Union[str, List[str]]
    model: Optional[str] = Field(default=None)
    normalize: bool = Field(default=True)
    pooling: str = Field(default="mean")  # reserved for future
    dtype: str = Field(default="float32")


class ErrorEnvelope(BaseModel):
    error: dict


def _bool_env(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.lower() in ("1", "true", "yes", "on")


MODEL_NAME = os.getenv("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
ALLOW_MOCK = _bool_env("SIDECAR_ALLOW_MOCK", False)
FORCE_DEVICE = os.getenv("SIDECAR_DEVICE", "auto")  # auto|cuda|mps|cpu
USE_FP16 = _bool_env("SIDECAR_FP16", True)
BIND_HOST = os.getenv("SIDECAR_BIND_HOST", "127.0.0.1")
BIND_PORT = int(os.getenv("SIDECAR_BIND_PORT", "8088"))
AUTH_TOKEN = os.getenv("SIDECAR_AUTH_TOKEN", "")

_device: str = "cpu"
_model = None
_dimensions: Optional[int] = None
_backend: str = "mock"


def select_device() -> str:
    if FORCE_DEVICE == "cpu":
        return "cpu"
    if FORCE_DEVICE == "cuda":
        if _TORCH_AVAILABLE and torch.cuda.is_available():  # type: ignore
            return "cuda"
        return "cpu"
    if FORCE_DEVICE == "mps":
        if _TORCH_AVAILABLE and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():  # type: ignore
            return "mps"
        return "cpu"
    # auto
    if _TORCH_AVAILABLE and torch.cuda.is_available():  # type: ignore
        return "cuda"
    if _TORCH_AVAILABLE and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():  # type: ignore
        return "mps"
    return "cpu"


def load_backend():
    global _model, _backend, _device, _dimensions
    _device = select_device()
    if _TORCH_AVAILABLE and SentenceTransformer is not None:
        try:
            _model = SentenceTransformer(MODEL_NAME, device=_device)
            # probe dims
            vec = _model.encode(["hello"], convert_to_numpy=True, normalize_embeddings=True)
            _dimensions = int(vec.shape[1])
            _backend = "sentence-transformers"
            return
        except Exception as e:
            if not ALLOW_MOCK:
                raise RuntimeError(f"Failed to load embedding model '{MODEL_NAME}' and SIDECAR_ALLOW_MOCK is not enabled. Error: {e}")
    # mock fallback
    if not ALLOW_MOCK and not _TORCH_AVAILABLE:
        raise RuntimeError("PyTorch/sentence-transformers not available and SIDECAR_ALLOW_MOCK is not enabled. Install torch/sentence-transformers or set SIDECAR_ALLOW_MOCK=true")
    _model = None
    _dimensions = 384
    _backend = "mock"


def ensure_auth(req: Request):
    if not AUTH_TOKEN:
        return
    hdr = req.headers.get("authorization", "")
    if not hdr.startswith("Bearer ") or hdr.split(" ", 1)[1] != AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


app = FastAPI(title="Embedding Sidecar", version="1.0.0")


@app.on_event("startup")
def _startup():
    load_backend()


@app.post("/v1/health")
def health(_: Request):
    return {
        "status": "ok",
        "device": _device,
        "model": MODEL_NAME if _backend != "mock" else "mock",
        "backend": _backend,
        "dims": _dimensions,
        "torch": _TORCH_AVAILABLE,
    }


def _mock_encode(texts: List[str], normalize: bool) -> np.ndarray:
    rng = np.random.default_rng(42)
    arr = []
    for t in texts:
        # stable pseudo-embedding via hash as seed for reproducibility
        h = int(hashlib.sha256(t.encode("utf-8")).hexdigest()[:8], 16)
        local = np.random.default_rng(h)
        v = local.standard_normal((_dimensions or 384,), dtype=np.float32)
        arr.append(v)
    out = np.stack(arr, axis=0)
    if normalize:
        norms = np.linalg.norm(out, axis=1, keepdims=True) + 1e-12
        out = out / norms
    return out


@app.post("/v1/embeddings", responses={429: {"model": ErrorEnvelope}})
def embeddings(req: Request, body: EmbeddingRequest):
    ensure_auth(req)
    start = time.perf_counter()
    inputs = body.inputs
    if isinstance(inputs, str):
        inputs = [inputs]
    if not inputs or not all(isinstance(x, str) for x in inputs):
        raise HTTPException(status_code=400, detail="inputs must be string or string[]")

    # Filter out non-string items and log warning
    valid_inputs = []
    for i, item in enumerate(inputs):
        if isinstance(item, str):
            valid_inputs.append(item)
        else:
            print(f"WARNING: Skipping non-string input at index {i}: {type(item)} = {repr(item)[:100]}")

    if not valid_inputs:
        raise HTTPException(status_code=400, detail="No valid string inputs provided")

    inputs = valid_inputs

    try:
        if _backend == "sentence-transformers" and _model is not None:
            kwargs = {}
            if USE_FP16 and _device == "cuda":
                kwargs["dtype"] = np.float16  # type: ignore
            # On MPS, prefer float32 for stability unless explicitly overridden
            if _device == "mps":
                kwargs.pop("dtype", None)
            vecs = _model.encode(
                inputs,
                convert_to_numpy=True,
                normalize_embeddings=body.normalize,
                **kwargs,
            )
        else:
            vecs = _mock_encode(inputs, normalize=body.normalize)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return JSONResponse(
            {
                "embeddings": vecs.tolist(),
                "model": MODEL_NAME if _backend != "mock" else "mock",
                "dimensions": int(vecs.shape[1]),
                "device": _device,
                "normalized": body.normalize,
                "elapsed_ms": elapsed_ms,
            }
        )
    except RuntimeError as e:
        msg = str(e)
        if "out of memory" in msg.lower():
            return JSONResponse(
                status_code=429,
                content={"error": {"code": "OOM", "message": "GPU OOM", "retryable": True}},
            )
        raise


# Entry point helper to run via `python app.py`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=BIND_HOST, port=BIND_PORT, reload=False)
