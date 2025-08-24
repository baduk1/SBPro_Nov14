import asyncio
from collections import defaultdict
from typing import AsyncGenerator, Dict, List


class SSEBroker:
    def __init__(self) -> None:
        self._subs: Dict[str, List[asyncio.Queue]] = defaultdict(list)

    async def publish(self, channel: str, data: dict) -> None:
        for q in list(self._subs.get(channel, [])):
            await q.put(data)

    async def subscribe(self, channel: str) -> AsyncGenerator[dict, None]:
        q: asyncio.Queue = asyncio.Queue()
        self._subs[channel].append(q)
        try:
            while True:
                data = await q.get()
                yield data
        finally:
            if q in self._subs.get(channel, []):
                self._subs[channel].remove(q)


broker = SSEBroker()
