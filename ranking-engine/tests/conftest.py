import sys
import os

# Ensure ranking-engine/ is on the path so strategy/engine imports resolve
# whether pytest is run from the repo root or from ranking-engine/.
_ranking_engine_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ranking_engine_root not in sys.path:
    sys.path.insert(0, _ranking_engine_root)
