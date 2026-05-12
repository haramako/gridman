#!/usr/bin/env python3
"""multica issues - Fetch all issues with token usage from the Multica API."""

import json
import sys
import urllib.request
import urllib.error
import argparse
from pathlib import Path


def load_config():
    config_path = Path.home() / ".multica" / "config.json"
    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


def api_get(server_url, token, workspace_id, path):
    req = urllib.request.Request(
        f"{server_url}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Workspace-ID": workspace_id,
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_all_issues(server_url, token, workspace_id, status=None, project=None):
    issues = []
    offset = 0
    params = "limit=50"
    if status:
        params += f"&status={status}"
    if project:
        params += f"&project={project}"

    while True:
        data = api_get(server_url, token, workspace_id, f"/api/issues?{params}&offset={offset}")
        batch = data["issues"]
        issues.extend(batch)
        if not data.get("has_more"):
            break
        offset += len(batch)

    return issues


def fetch_usage(server_url, token, workspace_id, issue_id):
    try:
        return api_get(server_url, token, workspace_id, f"/api/issues/{issue_id}/usage")
    except urllib.error.HTTPError:
        return None


def main():
    parser = argparse.ArgumentParser(description="Fetch Multica issues as JSON")
    parser.add_argument("--status", help="Filter by status (e.g. todo, in_review, done)")
    parser.add_argument("--project", help="Filter by project ID")
    parser.add_argument("--usage", action="store_true", help="Include token usage per issue")
    parser.add_argument("--sort-by-usage", action="store_true", help="Sort by total token usage (implies --usage)")
    parser.add_argument("--top", type=int, help="Limit output to top N issues")
    args = parser.parse_args()

    config = load_config()
    server_url = config["server_url"]
    token = config["token"]
    workspace_id = config["workspace_id"]

    issues = fetch_all_issues(server_url, token, workspace_id, status=args.status, project=args.project)

    include_usage = args.usage or args.sort_by_usage

    results = []
    for issue in issues:
        entry = {
            "id": issue["id"],
            "identifier": issue["identifier"],
            "title": issue["title"],
            "status": issue["status"],
            "priority": issue["priority"],
            "assignee_type": issue.get("assignee_type"),
            "assignee_id": issue.get("assignee_id"),
            "created_at": issue["created_at"],
            "updated_at": issue["updated_at"],
        }

        if include_usage:
            usage = fetch_usage(server_url, token, workspace_id, issue["id"])
            if usage:
                entry["usage"] = {
                    "input_tokens": usage["total_input_tokens"],
                    "output_tokens": usage["total_output_tokens"],
                    "cache_read_tokens": usage["total_cache_read_tokens"],
                    "cache_write_tokens": usage["total_cache_write_tokens"],
                    "runs": usage["task_count"],
                    "total_tokens": (
                        usage["total_input_tokens"]
                        + usage["total_output_tokens"]
                        + usage["total_cache_read_tokens"]
                        + usage["total_cache_write_tokens"]
                    ),
                }
            else:
                entry["usage"] = None

        results.append(entry)

    if args.sort_by_usage:
        results.sort(key=lambda x: (x.get("usage") or {}).get("total_tokens", 0), reverse=True)

    if args.top:
        results = results[: args.top]

    sys.stdout.buffer.write(json.dumps(results, ensure_ascii=False, indent=2).encode("utf-8"))
    sys.stdout.buffer.write(b"\n")


if __name__ == "__main__":
    main()
