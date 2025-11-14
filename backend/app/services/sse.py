import asyncio
from collections import defaultdict
from typing import AsyncGenerator, Dict, List
import logging

logger = logging.getLogger(__name__)


class SSEBroker:
    """
    In-memory SSE broker with back-pressure handling.

    Features:
    - Bounded queues (max 100 events per subscriber)
    - Heartbeat every 25 seconds
    - Drop oldest events on overflow (keep latest)
    - Auto-cleanup of dead queues
    """

    def __init__(self, max_qsize: int = 100, heartbeat_interval: float = 25.0) -> None:
        self._subs: Dict[str, List[asyncio.Queue]] = defaultdict(list)
        self._max_qsize = max_qsize
        self._heartbeat_interval = heartbeat_interval

    async def publish(self, channel: str, data: dict) -> None:
        """
        Publish event to all subscribers on channel.

        Back-pressure handling:
        - If queue full, drop oldest event and add new one
        - Remove dead queues that can't be written to
        """
        dead_queues = []

        for q in list(self._subs.get(channel, [])):
            try:
                q.put_nowait(data)
            except asyncio.QueueFull:
                # Drop oldest, keep latest
                try:
                    q.get_nowait()  # Remove oldest
                    q.put_nowait(data)  # Add new
                    logger.debug(f"SSE queue full on channel {channel}, dropped oldest event")
                except Exception as e:
                    logger.warning(f"Failed to handle full queue on channel {channel}: {e}")
                    dead_queues.append(q)
            except Exception as e:
                logger.error(f"Failed to publish to queue on channel {channel}: {e}")
                dead_queues.append(q)

        # Clean up dead queues
        for dq in dead_queues:
            if dq in self._subs.get(channel, []):
                self._subs[channel].remove(dq)
                logger.info(f"Removed dead queue from channel {channel}")

    async def subscribe(self, channel: str) -> AsyncGenerator[dict, None]:
        """
        Subscribe to channel with bounded queue and heartbeat.

        Features:
        - Queue bounded to max_qsize events
        - Heartbeat sent every heartbeat_interval seconds
        - Auto-cleanup on disconnect
        """
        q: asyncio.Queue = asyncio.Queue(maxsize=self._max_qsize)
        self._subs[channel].append(q)

        # Heartbeat task
        async def heartbeat_loop():
            """Send periodic heartbeat to keep connection alive"""
            while True:
                try:
                    await asyncio.sleep(self._heartbeat_interval)
                    try:
                        q.put_nowait({"type": "heartbeat"})
                    except asyncio.QueueFull:
                        # Queue full, client likely stalled - don't crash heartbeat
                        logger.debug(f"Heartbeat skipped on channel {channel} (queue full)")
                        pass
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Heartbeat error on channel {channel}: {e}")
                    break

        hb_task = asyncio.create_task(heartbeat_loop())

        try:
            while True:
                data = await q.get()
                yield data
        finally:
            # Cleanup
            hb_task.cancel()
            try:
                await hb_task
            except asyncio.CancelledError:
                pass

            if q in self._subs.get(channel, []):
                self._subs[channel].remove(q)
                logger.debug(f"Unsubscribed from channel {channel}")


broker = SSEBroker()
