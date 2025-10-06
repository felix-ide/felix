import asyncio
from utils.graph import LayoutContext, build_adjacency


async def consume_queue(queue: "asyncio.Queue[dict]") -> None:
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break

        context = LayoutContext(nodes=item.get("nodes", []), edges=item.get("edges", []))
        adjacency = build_adjacency(context.edges)
        context.tag(f"degree:{len(adjacency)}")
        await asyncio.to_thread(print, "processed", context.metadata)
        queue.task_done()


async def drain(iterable):
    for awaitable in iterable:
        await awaitable
