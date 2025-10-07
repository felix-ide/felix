import os
import sys
import time
import hashlib
import re
from typing import List, Optional, Union

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Fix Windows console encoding for emoji/unicode
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

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


def sanitize_text(text: str) -> str:
    """Ensure text is properly encoded and remove only truly invalid characters"""
    # Ensure proper UTF-8 encoding by re-encoding
    # This handles any encoding inconsistencies from Windows
    try:
        # Encode to UTF-8 bytes and back to ensure consistency
        cleaned = text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        # Remove control characters except newlines, tabs, carriage returns
        cleaned = ''.join(char for char in cleaned if char.isprintable() or char in '\n\t\r ')
        return cleaned
    except Exception:
        # Fallback: remove non-ASCII if there's an encoding issue
        return ''.join(char for char in text if ord(char) < 128)


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
    print("=" * 80)
    print("🔍 GPU DETECTION STARTING")
    print("=" * 80)
    print(f"FORCE_DEVICE setting: {FORCE_DEVICE}")
    print(f"PyTorch available: {_TORCH_AVAILABLE}")

    if FORCE_DEVICE == "cpu":
        print("⚠️  FORCED TO CPU via SIDECAR_DEVICE=cpu")
        return "cpu"

    if FORCE_DEVICE == "cuda":
        if _TORCH_AVAILABLE and torch.cuda.is_available():  # type: ignore
            print("✅ CUDA FORCED and available")
            return "cuda"
        print("❌ CUDA FORCED but NOT available")
        return "cpu"

    if FORCE_DEVICE == "mps":
        if _TORCH_AVAILABLE and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():  # type: ignore
            print("✅ MPS FORCED and available")
            return "mps"
        print("❌ MPS FORCED but NOT available")
        return "cpu"

    # auto detection
    if _TORCH_AVAILABLE:
        print(f"PyTorch version: {torch.__version__}")  # type: ignore

        # Check CUDA
        if torch.cuda.is_available():  # type: ignore
            cuda_version = torch.version.cuda  # type: ignore
            device_count = torch.cuda.device_count()  # type: ignore
            device_name = torch.cuda.get_device_name(0)  # type: ignore
            print(f"✅ CUDA is available!")
            print(f"   CUDA version: {cuda_version}")
            print(f"   GPU count: {device_count}")
            print(f"   GPU 0: {device_name}")
            return "cuda"

        # Check MPS
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():  # type: ignore
            print("✅ MPS (Metal) is available!")
            return "mps"

        print("⚠️  No GPU detected, falling back to CPU")
    else:
        print("❌ PyTorch not available")

    return "cpu"


def load_backend():
    global _model, _backend, _device, _dimensions
    _device = select_device()

    print("=" * 80)
    print(f"🚀 LOADING MODEL: {MODEL_NAME}")
    print(f"📍 Target device: {_device}")
    print(f"🔢 Using FP16: {USE_FP16 and _device == 'cuda'}")

    # Check sentence-transformers version
    if _TORCH_AVAILABLE and SentenceTransformer is not None:
        try:
            import importlib.metadata
            st_version = importlib.metadata.version("sentence-transformers")
            print(f"📦 sentence-transformers: {st_version}")
            major_version = int(st_version.split('.')[0])
            if major_version < 5:
                print("⚠️  WARNING: sentence-transformers is outdated!")
                print("   Please run: npm run setup --auto")
                print("   Or manually: cd python-sidecar && rm -rf .venv && npm run setup")
        except Exception:
            pass

    print("=" * 80)

    if _TORCH_AVAILABLE and SentenceTransformer is not None:
        try:
            load_start = time.perf_counter()
            _model = SentenceTransformer(MODEL_NAME, device=_device)
            load_time = time.perf_counter() - load_start

            # probe dims with timing
            test_start = time.perf_counter()
            vec = _model.encode(["hello"], convert_to_numpy=True, normalize_embeddings=True)
            test_time = time.perf_counter() - test_start

            _dimensions = int(vec.shape[1])
            _backend = "sentence-transformers"

            print(f"✅ MODEL LOADED SUCCESSFULLY!")
            print(f"   Load time: {load_time:.2f}s")
            print(f"   Test encoding time: {test_time*1000:.1f}ms")
            print(f"   Dimensions: {_dimensions}")
            print(f"   Backend: {_backend}")
            print(f"   Device: {_device}")

            # Show actual device the model is on
            if hasattr(_model, '_target_device'):
                print(f"   Model device: {_model._target_device}")

            print("=" * 80)
            return
        except Exception as e:
            print(f"❌ FAILED TO LOAD MODEL: {e}")
            if not ALLOW_MOCK:
                raise RuntimeError(f"Failed to load embedding model '{MODEL_NAME}' and SIDECAR_ALLOW_MOCK is not enabled. Error: {e}")

    # mock fallback
    if not ALLOW_MOCK and not _TORCH_AVAILABLE:
        raise RuntimeError("PyTorch/sentence-transformers not available and SIDECAR_ALLOW_MOCK is not enabled. Install torch/sentence-transformers or set SIDECAR_ALLOW_MOCK=true")

    print("⚠️  USING MOCK EMBEDDINGS (no real model loaded)")
    print("=" * 80)
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

    # Filter out non-string items and invalid strings
    valid_inputs = []
    for i, item in enumerate(inputs):
        if not isinstance(item, str):
            print(f"WARNING: Skipping non-string input at index {i}: {type(item)}")
            continue
        # Filter out empty or whitespace-only strings
        if not item or not item.strip():
            print(f"WARNING: Skipping empty/whitespace input at index {i}")
            continue
        # Clean the string: fix encoding issues and normalize whitespace
        try:
            # Sanitize encoding first
            cleaned = sanitize_text(item)
            # Normalize whitespace
            cleaned = ' '.join(cleaned.split())
            if cleaned:
                valid_inputs.append(cleaned)
            else:
                print(f"WARNING: Input at index {i} became empty after cleaning")
        except Exception as e:
            print(f"WARNING: Failed to clean input at index {i}: {str(e)[:100]}")

    if not valid_inputs:
        raise HTTPException(status_code=400, detail="No valid string inputs provided")

    inputs = valid_inputs

    # Debug: Log what we're about to encode (safe for Windows console)
    print(f"DEBUG: About to encode {len(inputs)} inputs on device={_device}")

    try:
        if _backend == "sentence-transformers" and _model is not None:
            # Try with dtype first (sentence-transformers <5.0), fall back without (5.0+)
            kwargs = {}
            if USE_FP16 and _device == "cuda":
                kwargs["dtype"] = np.float16  # type: ignore
            # On MPS, prefer float32 for stability
            if _device == "mps":
                kwargs.pop("dtype", None)

            try:
                # Try with dtype parameter (works on older versions)
                vecs = _model.encode(
                    inputs,
                    convert_to_numpy=True,
                    normalize_embeddings=body.normalize,
                    **kwargs,
                )
            except (TypeError, ValueError) as dtype_error:
                # sentence-transformers 5.0+ doesn't accept dtype, retry without it
                if "dtype" in str(dtype_error) or "additional keyword arguments" in str(dtype_error):
                    print(f"INFO: Retrying without dtype parameter (sentence-transformers 5.0+)")
                    vecs = _model.encode(
                        inputs,
                        convert_to_numpy=True,
                        normalize_embeddings=body.normalize,
                    )
                    # Successfully encoded, continue
                    te = None  # Clear any error
                else:
                    # Not a dtype error, save for error handling below
                    te = dtype_error

            # If we have a non-dtype error, handle it
            if 'te' in locals() and te is not None:
                # Handle invalid input types from sentence-transformers
                print(f"ERROR: sentence-transformers rejected inputs. Error: {str(te)[:200]}")
                print(f"ERROR: Input count: {len(inputs)}")
                print(f"ERROR: All inputs are strings: {all(isinstance(x, str) for x in inputs)}")
                if inputs:
                    print(f"ERROR: First input length: {len(inputs[0])}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid input format for embedding model: {str(te)}"
                )
        else:
            vecs = _mock_encode(inputs, normalize=body.normalize)
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        # Log performance info
        items_per_sec = len(inputs) / (elapsed_ms / 1000) if elapsed_ms > 0 else 0
        print(f"⚡ Encoded {len(inputs)} inputs in {elapsed_ms}ms ({items_per_sec:.1f} items/sec) on {_device}")

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
