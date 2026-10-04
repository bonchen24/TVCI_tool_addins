"""Path checks shared by scripts that rewrite runtime template DOCX files."""

from pathlib import Path
from typing import Iterable


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
CANONICAL_MASTER_ROOTS = (
    REPOSITORY_ROOT / "canonical_templates",
    REPOSITORY_ROOT / "templates" / "canonical",
)


def _is_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def is_canonical_master_path(path: str | Path, canonical_root: str | Path | None = None) -> bool:
    candidate = Path(path)
    # Check both the supplied spelling and its resolved target so an alias or
    # symlink cannot bypass the protection.
    candidates = (candidate.absolute(), candidate.resolve())
    roots = [root.resolve() for root in CANONICAL_MASTER_ROOTS]
    if canonical_root is not None:
        roots.append(Path(canonical_root).resolve())

    for target in candidates:
        if any(_is_within(target, root) for root in roots):
            return True
        parts = [part.lower() for part in target.parts]
        if any(parts[index - 1:index + 1] == ["templates", "canonical"] for index in range(1, len(parts))):
            return True
    return False


def assert_mutable_runtime_path(path: str | Path) -> None:
    if is_canonical_master_path(path):
        raise ValueError(f"Refusing to modify canonical template master: {Path(path)}")


def filter_runtime_docx(paths: Iterable[str | Path]) -> list[Path]:
    return [Path(path) for path in paths if not is_canonical_master_path(path)]
