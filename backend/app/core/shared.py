import os
import yaml
from app.core.observability import setup_observability
from app.modules.storage.service import VaultClient
from app.modules.cache.service import RedisSemanticCache

# Shared tracer
tracer = setup_observability()

# Shared core clients
vault_client = VaultClient()
semantic_cache = RedisSemanticCache()

# In-memory sessions store
sessions = {}

# Obligations path
current_dir = os.path.dirname(os.path.abspath(__file__)) # core/
base_dir = os.path.abspath(os.path.join(current_dir, "..", "..")) # backend/
OBLIGATIONS_YAML_PATH = os.path.abspath(
    os.path.join(base_dir, "..", "packages", "knowledge-base", "src", "obligations.yaml")
)

def load_raw_obligations():
    with open(OBLIGATIONS_YAML_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)
