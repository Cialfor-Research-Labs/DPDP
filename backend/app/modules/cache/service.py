import os
import hashlib
import json
import logging
from typing import Optional, Any, Dict
import redis

logger = logging.getLogger("dpdpa.cache")

class RedisSemanticCache:
    def __init__(self):
        self.host = os.environ.get("REDIS_HOST", "127.0.0.1")
        self.port = int(os.environ.get("REDIS_PORT", 6379))
        self.client = None
        self.is_offline = True
        self.local_cache: Dict[str, str] = {}
        
        self._connect_redis()

    def _connect_redis(self):
        try:
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                db=0,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
                decode_responses=True
            )
            # Ping test
            self.client.ping()
            self.is_offline = False
            logger.info("Connected to Redis semantic cache.")
        except Exception as e:
            logger.warning(f"Redis cache unreachable. Operating in local memory fallback mode: {str(e)}")

    def _get_hash(self, question: str, answer: str, item_text: str) -> str:
        # Normalize text to catch near-matches semantically
        norm_q = "".join(char for char in question.lower() if char.isalnum())
        norm_a = "".join(char for char in answer.lower() if char.isalnum())
        norm_i = "".join(char for char in item_text.lower() if char.isalnum())
        
        combined = f"q:{norm_q}|a:{norm_a}|i:{norm_i}"
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()

    def get(self, question: str, answer: str, item_text: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves cached response from Redis or local in-memory fallback
        """
        key_hash = self._get_hash(question, answer, item_text)
        redis_key = f"dpdpa:semantic_cache:{key_hash}"
        
        if self.is_offline:
            val = self.local_cache.get(redis_key)
            if val:
                logger.info("Cache HIT (Local memory).")
                return json.loads(val)
            return None

        try:
            val = self.client.get(redis_key)
            if val:
                logger.info("Cache HIT (Redis).")
                return json.loads(val)
        except Exception as e:
            logger.error(f"Redis read error: {str(e)}")
            # Fallback to local memory
            val = self.local_cache.get(redis_key)
            if val:
                return json.loads(val)
        return None

    def set(self, question: str, answer: str, item_text: str, result: Dict[str, Any], ttl: int = 86400):
        """
        Saves query and results into Redis or local memory fallback
        """
        key_hash = self._get_hash(question, answer, item_text)
        redis_key = f"dpdpa:semantic_cache:{key_hash}"
        serialized = json.dumps(result)
        
        # Always write to local memory cache as backup
        self.local_cache[redis_key] = serialized

        if not self.is_offline and self.client:
            try:
                self.client.setex(redis_key, ttl, serialized)
                logger.info("Cached result successfully in Redis.")
            except Exception as e:
                logger.error(f"Redis write error: {str(e)}")
