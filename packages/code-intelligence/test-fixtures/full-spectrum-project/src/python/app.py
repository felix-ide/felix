from flask import Flask, jsonify, request
from utils.graph import compute_layout, GraphSnapshot, stream_snapshots
from async_worker import consume_queue
from pathlib import Path
import json

app = Flask(__name__)

CONFIG_PATH = Path(__file__).resolve().parents[2] / "json" / "config.json"


def load_config():
    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


@app.get("/healthz")
def health_check():
    return {"status": "ok"}


@app.post("/graph")
def graph_endpoint():
    payload = request.json or {}
    snapshot = GraphSnapshot(nodes=payload.get("nodes", []), edges=payload.get("edges", []))
    layout = compute_layout(snapshot, mode="force-directed")
    return jsonify(layout)


def notify_failure(reason: str) -> None:
    from php_bridge import send_email

    send_email(subject="Fixture Failure", body=reason, recipients=["ops@example.com"])


async def hydrate_from_file(path: str) -> None:
    import asyncio

    queue: "asyncio.Queue[dict]" = asyncio.Queue()
    consumer = asyncio.create_task(consume_queue(queue))

    async for line in stream_snapshots(path):
        await queue.put({"nodes": line.split(","), "edges": []})

    await queue.put(None)
    await queue.join()
    await consumer


if __name__ == "__main__":
    app.run(port=5050)
