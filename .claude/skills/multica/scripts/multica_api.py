#!/usr/bin/env python3
"""
multica_api.py - AI-friendly Multica API client

USAGE:
  python multica_api.py issues [--status STATUS] [--usage] [--sort-by-usage] [--top N]
  python multica_api.py issue <id-or-identifier>
  python multica_api.py runs <issue-id-or-identifier>
  python multica_api.py messages <run-id>
  python multica_api.py search <query>

All output is JSON (UTF-8).
"""

import json
import sys
import urllib.request
import urllib.error
import argparse
from pathlib import Path


# ── Config ──────────────────────────────────────────────────────────────────

def load_config():
    config_path = Path.home() / ".multica" / "config.json"
    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


CONFIG = load_config()
SERVER_URL   = CONFIG["server_url"]
TOKEN        = CONFIG["token"]
WORKSPACE_ID = CONFIG["workspace_id"]


# ── HTTP ─────────────────────────────────────────────────────────────────────

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
        out({"error": f"HTTP {e.code}", "detail": body})
        sys.exit(1)


# ── Output ───────────────────────────────────────────────────────────────────

def out(data):
    sys.stdout.buffer.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))
    sys.stdout.buffer.write(b"\n")


# ── Helpers ──────────────────────────────────────────────────────────────────

def resolve_issue_id(id_or_identifier: str) -> str:
    """Accept UUID or identifier like LIN-12. Returns UUID."""
    if "-" in id_or_identifier and len(id_or_identifier) == 36:
        return id_or_identifier
    # Search by identifier
    data = api_get(f"/api/issues?limit=100")
    for issue in data.get("issues", []):
        if issue.get("identifier", "").upper() == id_or_identifier.upper():
            return issue["id"]
    # Try paginating
    if data.get("has_more"):
        offset = 100
        while True:
            data = api_get(f"/api/issues?limit=100&offset={offset}")
            for issue in data.get("issues", []):
                if issue.get("identifier", "").upper() == id_or_identifier.upper():
                    return issue["id"]
            if not data.get("has_more"):
                break
            offset += 100
    out({"error": f"Issue not found: {id_or_identifier}"})
    sys.exit(1)


def fetch_all_issues(status=None, project=None):
    params = "limit=50"
    if status:
        params += f"&status={status}"
    if project:
        params += f"&project={project}"
    issues, offset = [], 0
    while True:
        data = api_get(f"/api/issues?{params}&offset={offset}")
        issues.extend(data["issues"])
        if not data.get("has_more"):
            break
        offset += len(data["issues"])
    return issues


def fetch_usage(issue_id: str):
    try:
        return api_get(f"/api/issues/{issue_id}/usage")
    except SystemExit:
        return None


def enrich_usage(issue: dict, usage: dict) -> dict:
    if not usage:
        return {**issue, "usage": None}
    return {
        **issue,
        "usage": {
            "input_tokens":       usage["total_input_tokens"],
            "output_tokens":      usage["total_output_tokens"],
            "cache_read_tokens":  usage["total_cache_read_tokens"],
            "cache_write_tokens": usage["total_cache_write_tokens"],
            "runs":               usage["task_count"],
            "total_tokens": (
                usage["total_input_tokens"]
                + usage["total_output_tokens"]
                + usage["total_cache_read_tokens"]
                + usage["total_cache_write_tokens"]
            ),
        },
    }


# ── Commands ─────────────────────────────────────────────────────────────────

def cmd_issues(args):
    issues = fetch_all_issues(status=args.status, project=args.project)
    include_usage = args.usage or args.sort_by_usage
    results = []
    for issue in issues:
        entry = {
            "id":            issue["id"],
            "identifier":    issue["identifier"],
            "title":         issue["title"],
            "status":        issue["status"],
            "priority":      issue["priority"],
            "assignee_type": issue.get("assignee_type"),
            "assignee_id":   issue.get("assignee_id"),
            "created_at":    issue["created_at"],
            "updated_at":    issue["updated_at"],
        }
        if include_usage:
            usage = fetch_usage(issue["id"])
            entry = enrich_usage(entry, usage)
        results.append(entry)
    if args.sort_by_usage:
        results.sort(key=lambda x: (x.get("usage") or {}).get("total_tokens", 0), reverse=True)
    if args.top:
        results = results[:args.top]
    out(results)


def cmd_issue(args):
    issue_id = resolve_issue_id(args.id)
    issue  = api_get(f"/api/issues/{issue_id}")
    usage  = fetch_usage(issue_id)
    runs   = api_get(f"/api/issues/{issue_id}/task-runs")
    result = enrich_usage(issue, usage)
    result["runs"] = runs if isinstance(runs, list) else runs.get("runs", runs)
    out(result)


def cmd_runs(args):
    issue_id = resolve_issue_id(args.id)
    data = api_get(f"/api/issues/{issue_id}/task-runs")
    out(data)


def cmd_messages(args):
    data = api_get(f"/api/task-runs/{args.run_id}/messages")
    # Summarise for AI readability: include seq, type, tool, short content
    summary = []
    for msg in (data if isinstance(data, list) else []):
        t = msg.get("type")
        entry = {"seq": msg.get("seq"), "type": t}
        if t == "tool_use":
            entry["tool"] = msg.get("tool")
            inp = msg.get("input", {})
            entry["input_summary"] = {
                k: (v[:200] if isinstance(v, str) else v)
                for k, v in inp.items()
            }
        elif t == "tool_result":
            raw = str(msg.get("output", ""))
            entry["output_summary"] = raw[:300]
            entry["has_error"] = any(
                kw in raw.lower()
                for kw in ["error", "fail", "not found", "cannot", "denied", "enoent"]
            )
        elif t == "assistant":
            text = msg.get("text", "")
            entry["text_summary"] = text[:400]
        summary.append(entry)
    out(summary)


def cmd_search(args):
    query = urllib.parse.quote(args.query)
    data = api_get(f"/api/issues/search?q={query}")
    out(data)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    import urllib.parse

    parser = argparse.ArgumentParser(
        description="AI-friendly Multica API client",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # issues
    p_issues = sub.add_parser("issues", help="List issues")
    p_issues.add_argument("--status",        help="Filter by status (todo/in_progress/in_review/done/cancelled)")
    p_issues.add_argument("--project",       help="Filter by project ID")
    p_issues.add_argument("--usage",         action="store_true", help="Include token usage per issue")
    p_issues.add_argument("--sort-by-usage", action="store_true", help="Sort by total token usage")
    p_issues.add_argument("--top",           type=int,            help="Return top N issues only")

    # issue
    p_issue = sub.add_parser("issue", help="Get a single issue with usage and runs")
    p_issue.add_argument("id", help="Issue UUID or identifier (e.g. LIN-16)")

    # runs
    p_runs = sub.add_parser("runs", help="List execution runs for an issue")
    p_runs.add_argument("id", help="Issue UUID or identifier")

    # messages
    p_messages = sub.add_parser("messages", help="Get messages for a run (summarised)")
    p_messages.add_argument("run_id", help="Run UUID")

    # search
    p_search = sub.add_parser("search", help="Search issues by title/description")
    p_search.add_argument("query", help="Search query string")

    args = parser.parse_args()

    {
        "issues":   cmd_issues,
        "issue":    cmd_issue,
        "runs":     cmd_runs,
        "messages": cmd_messages,
        "search":   cmd_search,
    }[args.command](args)


if __name__ == "__main__":
    main()
