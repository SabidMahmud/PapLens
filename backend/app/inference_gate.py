"""Bounded admission control for CPU-heavy inference requests."""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator


class InferenceCapacityError(RuntimeError):
    """Raised when an inference request cannot enter the bounded queue."""


class InferenceGate:
    """Limits active inference work and the number of requests waiting for it."""

    def __init__(
        self,
        max_concurrent: int,
        max_queued: int,
        queue_timeout_seconds: float,
    ) -> None:
        if max_concurrent < 1:
            raise ValueError("max_concurrent must be at least 1")
        if max_queued < 0:
            raise ValueError("max_queued cannot be negative")
        if queue_timeout_seconds <= 0:
            raise ValueError("queue_timeout_seconds must be positive")

        self.max_concurrent = max_concurrent
        self.max_queued = max_queued
        self.queue_timeout_seconds = queue_timeout_seconds
        self._active = 0
        self._waiting = 0
        self._condition = asyncio.Condition()

    async def acquire(self) -> bool:
        """Returns False when the queue is full or the wait times out."""
        async with self._condition:
            # Do not let a newly arriving request jump ahead of queued work.
            if self._active < self.max_concurrent and self._waiting == 0:
                self._active += 1
                return True

            if self._waiting >= self.max_queued:
                return False

            self._waiting += 1
            try:
                try:
                    await asyncio.wait_for(
                        self._condition.wait_for(
                            lambda: self._active < self.max_concurrent
                        ),
                        timeout=self.queue_timeout_seconds,
                    )
                except TimeoutError:
                    return False

                self._active += 1
                return True
            finally:
                self._waiting -= 1
                if self._active < self.max_concurrent and self._waiting > 0:
                    self._condition.notify(1)

    async def release(self) -> None:
        async with self._condition:
            if self._active <= 0:
                raise RuntimeError("InferenceGate released without an active slot")
            self._active -= 1
            self._condition.notify(1)

    @asynccontextmanager
    async def slot(self) -> AsyncIterator[None]:
        if not await self.acquire():
            raise InferenceCapacityError(
                "Inference capacity is full. Please retry shortly."
            )
        try:
            yield
        finally:
            await self.release()
