import os
import sys
import uuid
from pathlib import Path

# Ensure backend root is on python path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Isolated throwaway SQLite DB for tests (kept under backend/data, i.e. on the project drive)
_data = Path(__file__).parent.parent / "data"
_data.mkdir(exist_ok=True)
_TEST_DB = _data / f"test_{uuid.uuid4().hex[:8]}.db"
os.environ["KOODE_DB_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"

from app.db import init_db  # noqa: E402

init_db()


def pytest_sessionfinish(session, exitstatus):
    from app.db import engine
    engine.dispose()
    for suffix in ("", "-wal", "-shm"):
        try:
            Path(str(_TEST_DB) + suffix).unlink()
        except OSError:
            pass
