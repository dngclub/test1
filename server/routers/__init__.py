"""ez2ai_builder FastAPI routers - auto discovery (v2 conflict guard).

Auto imports every `*.py` in this directory (excluding `__init__.py` and
files starting with `_`) and mounts `router: APIRouter` if defined.

CONFLICT GUARD (78th iteration, 2026-05-17):
On startup we read `.dev_context/host_api_inventory.json` (written by the
parent ez2ai builder env_manager whenever this child project starts) and
skip mounting any router whose `prefix` collides with a path already
served by the parent ez2ai backend. This prevents the child from
hijacking a parent API (e.g. `/api/announcements`) and crashing with
"SECRET_KEY is not injected" - the child has no parent SECRET_KEY when
launched outside env_manager.

NOTE: Must register modules in `sys.modules` for Pydantic 2.x forward
references (e.g. `list[XxxOut]`) - `typing.get_type_hints()` resolves
via `sys.modules[cls.__module__]` globalns, otherwise `is not fully
defined` PydanticUserError is raised.

NOTE: Import-failing routers are skipped with a stderr warning; other
routers keep loading (e.g. `server._ez2ai_db` helper missing -> only
that router is disabled, backend stays alive).

To add a new child API: drop `server/routers/{prefix}.py` - it is
auto-mounted, no separate registration code required. Pick a prefix
that does NOT collide with the parent ez2ai backend.

ASCII-only - some Windows consoles read this file under CP949 when the
parent process pipes stdout/stderr; non-ASCII bytes break parsing.
"""
import importlib.util
import json
import os
import sys
from fastapi import APIRouter

router = APIRouter()

_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(os.path.dirname(_dir))
_inventory_path = os.path.join(
    _project_root, ".dev_context", "host_api_inventory.json"
)


def _load_host_prefixes():
    """Read parent ez2ai backend's API path list.

    Returns the set of paths or an empty set if the inventory file does
    not exist (in which case the conflict guard is a no-op - the child
    is being launched in isolation).

    Standalone mode has no parent backend, so the child must serve every
    API itself (including the /api/auth login router). The conflict guard
    is an embedded-only concern - it only matters while the parent ez2ai
    backend is running - so disable it when RUN_MODE / EZ2AI_RUN_MODE is
    'standalone'. This keeps admin/admin login working in standalone with
    no per-project app.py patch.
    """
    _mode = (os.environ.get("RUN_MODE")
             or os.environ.get("EZ2AI_RUN_MODE")
             or "embedded").strip().lower()
    if _mode == "standalone":
        return set()
    if not os.path.exists(_inventory_path):
        return set()
    try:
        with open(_inventory_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return set()
    paths = data.get("paths") if isinstance(data, dict) else None
    if not isinstance(paths, list):
        return set()
    return {str(p) for p in paths if isinstance(p, str)}


_HOST_PREFIXES = _load_host_prefixes()


def _conflicts_with_host(mounted_prefix):
    """True if `mounted_prefix` overlaps any host API path."""
    if not mounted_prefix or not _HOST_PREFIXES:
        return False
    norm = mounted_prefix.rstrip("/")
    if not norm:
        return False
    for host_path in _HOST_PREFIXES:
        h = host_path.rstrip("/")
        if h == norm or h.startswith(norm + "/") or norm.startswith(h + "/"):
            return True
    return False


def _format_hint(exc):
    """Per-error hint for the SKIP message."""
    msg = str(exc)
    if isinstance(exc, ModuleNotFoundError) and 'server._ez2ai_db' in msg:
        return (
            ' (DB helper missing - register a development DB in the parent'
            ' system settings, then POST'
            ' /api/builder/projects/{code}/databases/compile)'
        )
    return ''


def _auto_discover():
    """Load every `server/routers/*.py`, register in sys.modules, mount router."""
    for fname in sorted(os.listdir(_dir)):
        if not fname.endswith(".py"):
            continue
        if fname == "__init__.py" or fname.startswith("_"):
            continue
        module_name = "_ez2child_routers_" + fname[:-3]
        path = os.path.join(_dir, fname)
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            continue
        mod = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = mod  # required for Pydantic forward-ref
        try:
            spec.loader.exec_module(mod)
        except Exception as exc:
            sys.modules.pop(module_name, None)
            print(
                "[routers] SKIP " + fname + " - "
                + type(exc).__name__ + ": " + str(exc) + _format_hint(exc),
                file=sys.stderr,
            )
            continue
        if not hasattr(mod, "router"):
            continue
        child_prefix = getattr(mod.router, "prefix", "") or ""
        if _conflicts_with_host(child_prefix):
            print(
                "[routers] CONFLICT " + fname + " - child prefix '"
                + child_prefix + "' collides with parent ez2ai backend."
                + " Skipped to prevent hijack."
                + " Rename the child router or remove this file.",
                file=sys.stderr,
            )
            sys.modules.pop(module_name, None)
            continue
        router.include_router(mod.router)


_auto_discover()
