#!/usr/bin/env python3
"""
multica_sync.py - Sync Multica issue data to local files for offline analysis.

Stores data in multica-data/ (relative to cwd) as a git-friendly single source
of truth. All API calls happen at sync time; query/show commands are fully offline.

USAGE:
  python multica_sync.py sync              # incremental sync (only updated issues)
  python multica_sync.py sync --full       # re-fetch all issues regardless of cache
  python multica_sync.py status            # show sync state and issue breakdown
  python multica_sync.py show <id>         # print stored issue detail (no API call)
  python multica_sync.py query [flags]     # filter/sort stored index (no API call)

QUERY FLAGS:
  --status STATUS    Filter: todo / in_progress / in_review / done / cancelled
  --has-failures     Only issues with at least one failed run
  --sort-by FIELD    duration | tokens | runs | created | updated
  --top N            Return top N results only

OUTPUT: All commands emit JSON to stdout (UTF-8). Progress messages go to stderr.

DATA LAYOUT (multica-data/):
  issues/LIN-16.json   Full issue: description, runs[], usage, derived stats
  index.json           Lightweight index of all issues (for quick queries)
  agents.json          Seen agent IDs with metadata
  sync_state.json      Last sync time and stats
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


# ── Config ─────────────────────────────────────────────────────────────────────

def load_config():
    config_path = Path.home() / ".multica" / "config.json"
    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


CONFIG       = load_config()
SERVER_URL   = CONFIG["server_url"]
TOKEN        = CONFIG["token"]
WORKSPACE_ID = CONFIG["workspace_id"]

DATA_DIR        = Path("multica-data")
ISSUES_DIR      = DATA_DIR / "issues"
INDEX_PATH      = DATA_DIR / "index.json"
AGENTS_PATH     = DATA_DIR / "agents.json"
SYNC_STATE_PATH = DATA_DIR / "sync_state.json"


# ── HTTP ───────────────────────────────────────────────────────────────────────

def api_get(path):
    req = urllib.request.Request(
        f"{SERVER_URL}{path}",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "X-Workspace-ID": WORKSPACE_ID,
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        die({"error": f"HTTP {e.code}", "detail": body})


# ── Output ─────────────────────────────────────────────────────────────────────

def out(data):
    sys.stdout.buffer.write(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8")
    )
    sys.stdout.buffer.write(b"\n")


def log(msg):
    print(f"[sync] {msg}", file=sys.stderr)


def die(data):
    out(data)
    sys.exit(1)


# ── File I/O ───────────────────────────────────────────────────────────────────

def read_json(path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path, data):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


# ── API fetchers ───────────────────────────────────────────────────────────────

def fetch_all_issues():
    issues, offset = [], 0
    while True:
        data = api_get(f"/api/issues?limit=50&offset={offset}")
        issues.extend(data["issues"])
        if not data.get("has_more"):
            break
        offset += len(data["issues"])
    return issues


def fetch_runs(issue_id):
    data = api_get(f"/api/issues/{issue_id}/task-runs")
    return data if isinstance(data, list) else data.get("runs", [])


def fetch_usage(issue_id):
    try:
        return api_get(f"/api/issues/{issue_id}/usage")
    except SystemExit:
        return None


def fetch_agents():
    try:
        return api_get("/api/agents")
    except SystemExit:
        return []


# ── Data shaping ───────────────────────────────────────────────────────────────

def shape_run(run):
    started   = run.get("started_at")
    completed = run.get("completed_at")
    duration  = None
    if started and completed:
        s = datetime.fromisoformat(started.replace("Z", "+00:00"))
        e = datetime.fromisoformat(completed.replace("Z", "+00:00"))
        duration = round((e - s).total_seconds())

    result = run.get("result") or {}
    return {
        "id":              run["id"],
        "status":          run.get("status"),
        "kind":            run.get("kind"),
        "attempt":         run.get("attempt"),
        "max_attempts":    run.get("max_attempts"),
        "started_at":      started,
        "completed_at":    completed,
        "duration_seconds": duration,
        "trigger_summary": run.get("trigger_summary"),
        "result_output":   result.get("output"),
        "pr_url":          result.get("pr_url") or None,
        "error":           run.get("error"),
        "failure_reason":  run.get("failure_reason"),
    }


def shape_usage(raw):
    if not raw:
        return None
    return {
        "input_tokens":       raw.get("total_input_tokens", 0),
        "output_tokens":      raw.get("total_output_tokens", 0),
        "cache_read_tokens":  raw.get("total_cache_read_tokens", 0),
        "cache_write_tokens": raw.get("total_cache_write_tokens", 0),
        "total_tokens": (
            raw.get("total_input_tokens", 0)
            + raw.get("total_output_tokens", 0)
            + raw.get("total_cache_read_tokens", 0)
            + raw.get("total_cache_write_tokens", 0)
        ),
    }


_QUOTA_KEYWORDS = ["ping", "いかがです", "how are you", "作業できますか"]


def compute_has_real_failures(runs):
    """Return True if any failed run is a genuine implementation failure.

    Excludes:
    - platform-artifact: latest failed run with null trigger after a completed run
    - duplicate-trigger: failed run whose trigger matches the adjacent run
    - quota-recovery: failed run followed by a quota-recovery re-trigger
    """
    for i, run in enumerate(runs):  # runs is newest-first
        if run["status"] != "failed":
            continue
        prev = runs[i + 1] if i + 1 < len(runs) else None
        newer = runs[i - 1] if i > 0 else None
        trigger = run.get("trigger_summary")

        # platform-artifact: null trigger, immediately after a completed run
        if trigger is None and prev and prev["status"] == "completed":
            continue
        # duplicate-trigger: a newer run with the same trigger already completed
        # (the failed run is the stale older duplicate, not the one that succeeded)
        if trigger is not None and newer and trigger == newer.get("trigger_summary") and newer["status"] == "completed":
            continue
        # quota-recovery: the next (newer) run was a quota-recovery check
        if newer:
            next_trigger = newer.get("trigger_summary") or ""
            if any(kw in next_trigger for kw in _QUOTA_KEYWORDS):
                continue

        return True
    return False


def build_issue_doc(detail, runs_raw, usage_raw):
    runs             = [shape_run(r) for r in runs_raw]
    total_duration   = sum(r["duration_seconds"] for r in runs if r["duration_seconds"])
    has_failures     = any(r["status"] == "failed" for r in runs)
    has_real_failures = compute_has_real_failures(runs)

    return {
        "id":              detail["id"],
        "identifier":      detail["identifier"],
        "title":           detail["title"],
        "description":     detail.get("description"),
        "status":          detail["status"],
        "priority":        detail.get("priority"),
        "assignee_type":   detail.get("assignee_type"),
        "assignee_id":     detail.get("assignee_id"),
        "parent_issue_id": detail.get("parent_issue_id"),
        "labels":          detail.get("labels", []),
        "created_at":      detail["created_at"],
        "updated_at":      detail["updated_at"],
        "usage":           shape_usage(usage_raw),
        "runs":            runs,
        # Derived fields kept in the doc for quick access without re-computing
        "_derived": {
            "run_count":              len(runs),
            "total_duration_seconds": total_duration,
            "has_failures":           has_failures,
            "has_real_failures":      has_real_failures,
        },
    }


def build_index_entry(doc):
    usage = doc.get("usage") or {}
    d     = doc.get("_derived", {})
    return {
        "identifier":             doc["identifier"],
        "title":                  doc["title"],
        "status":                 doc["status"],
        "priority":               doc.get("priority"),
        "assignee_id":            doc.get("assignee_id"),
        "parent_issue_id":        doc.get("parent_issue_id"),
        "labels":                 doc.get("labels", []),
        "created_at":             doc["created_at"],
        "updated_at":             doc["updated_at"],
        "run_count":              d.get("run_count", 0),
        "total_duration_seconds": d.get("total_duration_seconds", 0),
        "total_tokens":           usage.get("total_tokens", 0),
        "has_failures":           d.get("has_failures", False),
        "has_real_failures":      d.get("has_real_failures", False),
    }


# ── Agent registry ─────────────────────────────────────────────────────────────

def update_agents(agents, api_agents):
    """Merge agents from /api/agents into the local registry, preserving existing entries."""
    for a in api_agents:
        aid = a["id"]
        existing = agents.get(aid, {})
        agents[aid] = {
            "id":         aid,
            "name":       a.get("name") or existing.get("name"),
            "model":      a.get("model") or existing.get("model") or None,
            "created_at": a.get("created_at") or existing.get("created_at"),
        }
    return agents


# ── Commands ───────────────────────────────────────────────────────────────────

def cmd_sync(args):
    ISSUES_DIR.mkdir(parents=True, exist_ok=True)

    sync_state  = read_json(SYNC_STATE_PATH, {})
    last_synced = sync_state.get("last_synced_at")
    agents      = read_json(AGENTS_PATH, {})

    log("Fetching issue list from API...")
    all_issues = fetch_all_issues()

    if args.full or not last_synced:
        to_sync = all_issues
        log(f"Full sync: {len(to_sync)} issues")
    else:
        to_sync = [i for i in all_issues if i["updated_at"] > last_synced]
        log(f"Incremental sync: {len(to_sync)} updated issues (since {last_synced})")

    for issue in to_sync:
        ident = issue["identifier"]
        log(f"  {ident}: fetching detail + runs + usage...")
        detail    = api_get(f"/api/issues/{issue['id']}")
        runs_raw  = fetch_runs(issue["id"])
        usage_raw = fetch_usage(issue["id"])
        doc       = build_issue_doc(detail, runs_raw, usage_raw)
        write_json(ISSUES_DIR / f"{ident}.json", doc)

    # Rebuild index from all stored files
    log("Rebuilding index.json...")
    all_docs = []
    for f in sorted(ISSUES_DIR.glob("*.json")):
        d = read_json(f)
        if d:
            all_docs.append(d)

    log("Fetching agent list from API...")
    api_agents = fetch_agents()
    update_agents(agents, api_agents)
    write_json(AGENTS_PATH, agents)

    index = sorted(
        [build_index_entry(d) for d in all_docs],
        key=lambda x: x["updated_at"],
        reverse=True,
    )
    write_json(INDEX_PATH, index)

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    write_json(SYNC_STATE_PATH, {
        "last_synced_at":   now,
        "total_issues":     len(index),
        "synced_this_run":  len(to_sync),
    })

    out({
        "ok":             True,
        "synced":         len(to_sync),
        "total_issues":   len(index),
        "last_synced_at": now,
    })


def cmd_status(args):
    sync_state    = read_json(SYNC_STATE_PATH, {})
    index         = read_json(INDEX_PATH, [])
    status_counts = {}
    for entry in index:
        s = entry.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    out({
        "last_synced_at": sync_state.get("last_synced_at"),
        "total_issues":   len(index),
        "by_status":      status_counts,
        "data_dir":       str(DATA_DIR.resolve()),
    })


def cmd_show(args):
    path = ISSUES_DIR / f"{args.id.upper()}.json"
    if not path.exists():
        die({"error": f"Not found in local data: {args.id}. Run 'sync' first."})
    out(read_json(path))


def cmd_query(args):
    index = read_json(INDEX_PATH, [])

    results = index
    if args.status:
        results = [r for r in results if r["status"] == args.status]
    if args.has_failures:
        results = [r for r in results if r.get("has_real_failures")]

    sort_key = {
        "duration": lambda x: x.get("total_duration_seconds", 0),
        "tokens":   lambda x: x.get("total_tokens", 0),
        "runs":     lambda x: x.get("run_count", 0),
        "created":  lambda x: x.get("created_at", ""),
        "updated":  lambda x: x.get("updated_at", ""),
    }.get(args.sort_by)

    if sort_key:
        results = sorted(results, key=sort_key, reverse=True)
    if args.top:
        results = results[:args.top]

    out(results)


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sync Multica issues to local files for offline analysis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_sync = sub.add_parser("sync", help="Fetch updates from API and write to multica-data/")
    p_sync.add_argument("--full", action="store_true",
                        help="Re-fetch all issues even if unchanged since last sync")

    sub.add_parser("status", help="Show last sync time and issue count by status (offline)")

    p_show = sub.add_parser("show", help="Print stored issue detail (offline)")
    p_show.add_argument("id", help="Issue identifier, e.g. LIN-16")

    p_query = sub.add_parser("query", help="Filter and sort stored index (offline)")
    p_query.add_argument("--status",       help="Filter by status")
    p_query.add_argument("--has-failures", action="store_true", dest="has_failures",
                         help="Only issues that had at least one failed run")
    p_query.add_argument("--sort-by",      dest="sort_by",
                         choices=["duration", "tokens", "runs", "created", "updated"],
                         help="Sort field (descending)")
    p_query.add_argument("--top",          type=int, help="Return top N results only")

    args = parser.parse_args()
    {
        "sync":   cmd_sync,
        "status": cmd_status,
        "show":   cmd_show,
        "query":  cmd_query,
    }[args.command](args)


if __name__ == "__main__":
    main()
