from typing import List, Dict
from openai import AsyncOpenAI

from app.services.ai_service import AIService
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class OpenAIService(AIService):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
    ) -> str:
        try:
            full_messages = [{"role": "system", "content": system_prompt}] + messages
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                temperature=0.4,
                max_tokens=600,
            )
            reply = response.choices[0].message.content or ""
            logger.info(f"OpenAI response generated ({len(reply)} chars)")
            return reply
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
