"""Check the project baseline without third-party dependencies."""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "README.md", "AGENTS.md", ".gitignore", ".gitattributes", ".editorconfig",
    "docs/PROJECT.md", "docs/SETUP.md", ".github/workflows/repository.yml",
)


def main():
    errors = []
    for name in REQUIRED:
        path = ROOT / name
        if not path.is_file() or not path.read_text(encoding="utf-8").strip():
            errors.append(f"Missing or empty required file: {name}")
    tracked = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, check=True, capture_output=True
    ).stdout.decode("utf-8").split("\0")
    for name in filter(None, tracked):
        path = Path(name)
        if (
            (path.name.startswith(".env") and path.name != ".env.example")
            or path.suffix.lower() in {".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3", ".db"}
            or path.name == "credentials.json"
            or path.parts[0] in {"data", "backups", "exports"}
        ):
            errors.append(f"Sensitive or local data file tracked by Git: {name}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("Repository baseline OK. This check does not certify application security.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
