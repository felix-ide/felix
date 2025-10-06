from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Dict, Callable, AsyncIterator


def log_invocation(func: Callable):
    def wrapper(*args, **kwargs):
        print(f"graph::call {func.__name__}")
        return func(*args, **kwargs)

    return wrapper


@dataclass
class GraphSnapshot:
    nodes: Iterable[Dict]
    edges: Iterable[Dict]


@dataclass
class LayoutContext(GraphSnapshot):
    metadata: Dict[str, str] | None = None

    def tag(self, value: str) -> None:
        if self.metadata is None:
            self.metadata = {}
        self.metadata["tag"] = value


@log_invocation
def normalize_nodes(nodes: Iterable[Dict]) -> List[Dict]:
    return [
        {
            "id": raw["id"],
            "label": raw.get("label", raw["id"]),
            "weight": raw.get("weight", 1.0),
        }
        for raw in nodes
    ]


def compute_layout(snapshot: GraphSnapshot, mode: str = "force-directed") -> Dict:
    nodes = normalize_nodes(snapshot.nodes)
    edges = list(snapshot.edges)
    return {
        "mode": mode,
        "nodes": nodes,
        "edges": edges,
    }


def build_adjacency(edges: Iterable[Dict]) -> Dict[str, List[str]]:
    adjacency: Dict[str, List[str]] = {}
    for edge in edges:
        adjacency.setdefault(edge["source"], []).append(edge["target"])
        adjacency.setdefault(edge["target"], []).append(edge["source"])
    return adjacency


async def stream_snapshots(path: str) -> AsyncIterator[str]:
    import asyncio

    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            await asyncio.sleep(0)
            yield line.strip()
