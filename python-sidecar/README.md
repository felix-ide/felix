Python Sidecar for GPU-Accelerated Embeddings

Overview
- FastAPI service that generates text embeddings using PyTorch/Sentence-Transformers.
- Designed to run on GPU when available; falls back to CPU or mock mode for offline/dev.
- Future-ready to add vector DB endpoints (FAISS/Milvus/Qdrant).

Key Endpoints
- POST /v1/health -> { status, device, model, dims }
- POST /v1/embeddings -> { embeddings[][], model, dimensions, device, normalized, elapsed_ms }

Environment Variables (suggested defaults)
- MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
- SIDECAR_DEVICE=auto   # auto|cuda|cpu
- SIDECAR_FP16=true     # enable half precision when on GPU
- SIDECAR_BATCH_SIZE=128
- SIDECAR_BATCH_WINDOW_MS=10
- SIDECAR_MAX_INFLIGHT=2
- SIDECAR_QUEUE_MAX=5000
- SIDECAR_BIND_HOST=127.0.0.1
- SIDECAR_BIND_PORT=8088
- SIDECAR_AUTH_TOKEN=   # optional bearer token when exposed beyond localhost
- SIDECAR_ALLOW_MOCK=true  # allow mock embedding backend when transformers not installed

Local (CPU) quick run
1) python3 -m venv .venv && source .venv/bin/activate
2) pip install -r requirements.txt  # requires network access
3) uvicorn app:app --host 127.0.0.1 --port 8088 --reload

Docker (GPU) quick run (compose)
- Requires NVIDIA container toolkit.
1) docker compose -f docker-compose.gpu.yml up --build

Smoke test (Node)
- From repo root: node felix/sidecar-test/sidecar-smoke.cjs

Testing
- Unit tests (pytest) include a mock backend to run without GPU or network.

