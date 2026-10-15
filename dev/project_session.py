"""Select a project's Codex session using first-record metadata only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re

ID = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")


def sessions(home, project):
    result = {}
    for filename in (home / "sessions").rglob("*.jsonl"):
        try:
            with filename.open(encoding="utf-8") as stream:
                record = json.loads(stream.readline(262144))
            if not isinstance(record, dict):
                continue
            meta = record.get("payload", {})
            if not isinstance(meta, dict) or not isinstance(meta.get("cwd"), str):
                continue
            identity = meta.get("id", "")
            timestamp = meta.get("timestamp", "")
            if (record.get("type") == "session_meta" and isinstance(identity, str) and ID.fullmatch(identity)
                    and isinstance(timestamp, str) and re.match(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d", timestamp)
                    and meta.get("cwd", "").rstrip("/") == str(project).rstrip("/")):
                source = meta.get("source")
                result[identity] = {"id": identity, "timestamp": timestamp, "source": source if isinstance(source, str) else None}
        except (OSError, ValueError, TypeError):
            continue
    return result


def select(home, project, preferred=None, explicit=None, after=None):
    records = sessions(home, project)
    state = home / "alhor-project-sessions" / (hashlib.sha256(str(project).encode()).hexdigest()[:24] + ".json")
    pinned = None
    if state.exists():
        try:
            saved = json.loads(state.read_text(encoding="utf-8"))
            if not isinstance(saved, dict):
                raise ValueError("Invalid saved identity")
            if saved.get("project") == str(project) and isinstance(saved.get("session_id"), str):
                pinned = saved.get("session_id")
        except (OSError, ValueError):
            return {"mode": "missing", "reason": "Unreadable saved session identity", "id": None}
    if explicit:
        if explicit not in records:
            raise ValueError("Requested session is absent or belongs to another project")
        chosen = explicit
    elif after:
        candidates = [item for item in records.values() if item["timestamp"] >= after and item["source"] in {"cli", "vscode"}]
        if len(candidates) > 1:
            return {"mode": "ambiguous", "reason": "Multiple new interactive sessions; select an explicit SessionId", "ids": [item["id"] for item in candidates]}
        chosen = candidates[0]["id"] if candidates else None
        if not chosen:
            return {"mode": "new", "id": None}
    elif pinned:
        if pinned not in records:
            return {"mode": "missing", "reason": "Saved session is absent; start a new session explicitly", "id": pinned}
        chosen = pinned
    else:
        candidates = [item for item in records.values() if item["source"] in {"cli", "vscode"}]
        if preferred in records:
            chosen = preferred
        elif len(candidates) > 1:
            return {"mode": "ambiguous", "reason": "Multiple project sessions; select an explicit SessionId", "ids": [item["id"] for item in candidates]}
        else:
            chosen = candidates[0]["id"] if candidates else None
    if chosen:
        state.parent.mkdir(parents=True, exist_ok=True)
        temporary = state.with_suffix(".tmp")
        temporary.write_text(json.dumps({"project": str(project), "session_id": chosen}), encoding="utf-8")
        os.replace(temporary, state)
        return {"mode": "resume", "id": chosen}
    return {"mode": "new", "id": None}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prefer")
    parser.add_argument("--select")
    parser.add_argument("--after")
    args = parser.parse_args()
    try:
        result = select(Path.home() / ".codex", Path(__file__).resolve().parents[1], args.prefer, args.select, args.after)
        print(json.dumps(result))
    except ValueError as error:
        parser.exit(1, str(error) + "\n")
