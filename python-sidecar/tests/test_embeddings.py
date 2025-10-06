import json
from fastapi.testclient import TestClient

from app import app


client = TestClient(app)


def test_health():
    r = client.post("/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["dims"] is None or isinstance(data["dims"], int)


def test_embeddings_string():
    r = client.post("/v1/embeddings", json={"inputs": "hello world"})
    assert r.status_code == 200
    data = r.json()
    assert "embeddings" in data and isinstance(data["embeddings"], list)
    assert len(data["embeddings"]) == 1


def test_embeddings_batch():
    texts = ["alpha", "beta", "gamma"]
    r = client.post("/v1/embeddings", json={"inputs": texts, "normalize": True})
    assert r.status_code == 200
    data = r.json()
    embs = data["embeddings"]
    assert len(embs) == len(texts)
    # normalized vectors should have ~unit norm
    for v in embs:
        s = sum(x * x for x in v) ** 0.5
        assert 0.9 < s < 1.1

