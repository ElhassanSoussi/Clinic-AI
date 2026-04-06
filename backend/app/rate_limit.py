from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import time
from typing import Deque

from fastapi import HTTPException, Request, status

from app.utils.logger import get_logger

logger = get_logger(__name__)


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _bucket_key(self, scope: str, identifier: str) -> str:
        return f"{scope}:{identifier}"

    def allow(self, scope: str, identifier: str, *, limit: int, window_seconds: int) -> bool:
        now = time()
        boundary = now - window_seconds
        bucket_key = self._bucket_key(scope, identifier)
        with self._lock:
            bucket = self._buckets[bucket_key]
            while bucket and bucket[0] <= boundary:
                bucket.popleft()
            if len(bucket) >= limit:
                return False
            bucket.append(now)
        return True

    def clear(self) -> None:
        with self._lock:
            self._buckets.clear()


rate_limiter = InMemoryRateLimiter()


def _client_identifier(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0].strip()
        if first_hop:
            return first_hop
    client = request.client
    if client and client.host:
        return client.host
    return "unknown"


def create_rate_limit_dependency(scope: str, limit: int):
    async def dependency(request: Request) -> None:
        identifier = _client_identifier(request)
        if rate_limiter.allow(scope, identifier, limit=limit, window_seconds=60):
            return
        logger.warning(
            "rate_limit_exceeded scope=%s identifier=%s method=%s path=%s",
            scope,
            identifier,
            request.method,
            request.url.path,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a moment and try again.",
        )

    return dependency
