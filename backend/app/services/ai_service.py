from abc import ABC, abstractmethod
from typing import List, Dict


class AIService(ABC):
    """Abstract AI provider interface for swappable backends."""

    @abstractmethod
    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
    ) -> str:
        pass
