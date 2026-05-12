---
name: multica
description: Query the Multica managed-agent platform — list issues, inspect token usage, read execution logs, search. Use when the user asks about Multica issues, agent runs, token consumption, or execution history.
user-invocable: true
allowed-tools:
  - Bash(python .claude/skills/multica/scripts/multica_api.py *)
  - Bash(python .claude/skills/multica/scripts/issues.py *)
---

# /multica — Multica API skill

Provides read access to the user's Multica workspace via the API tool at
`.claude/skills/multica/scripts/multica_api.py`. All output is JSON; pipe through
`python -c "import sys; sys.stdout.buffer.write(sys.stdin.buffer.read())"` if
the terminal needs explicit UTF-8 passthrough.

Arguments passed: `$ARGUMENTS`

---

## Tool reference

```
python .claude/skills/multica/scripts/multica_api.py <command> [flags]
```

| Command | Purpose |
|---------|---------|
| `issues` | List all issues (supports filtering and sorting) |
| `issue <id>` | Single issue with description, usage, and all runs |
| `runs <id>` | Execution run history for an issue |
| `messages <run-id>` | Summarised step-by-step messages for one run |
| `search <query>` | Full-text search over issue titles and descriptions |

`<id>` accepts either a UUID or a short identifier like `LIN-42`.

### Key flags for `issues`

| Flag | Effect |
|------|--------|
| `--usage` | Add token usage totals to each issue |
| `--sort-by-usage` | Sort by total token consumption (implies `--usage`) |
| `--top N` | Return only the top N results |
| `--status STATUS` | Filter: `todo` / `in_progress` / `in_review` / `done` / `cancelled` |

---

## Dispatch on arguments

### No arguments — workspace overview

Run `issues --usage` and summarise:
- Total issue count and breakdown by status
- Top 3 issues by token usage
- Any issues currently `in_review` or `in_progress`

### `list` or `issues [filters]`

Run `issues` with whatever filters the user specified. Present as a readable
table (identifier, title, status, priority). If the user mentioned token cost,
add `--sort-by-usage`.

### `<identifier>` (e.g. `LIN-16`) or `show <id>`

Run `issue <id>` and present:
1. Title, status, priority, description
2. Token usage summary (input / output / cache read / cache write / total)
3. Run history: for each run show started_at, duration, status, and the
   `result.output` summary

### `log <id>` or `messages <id>`

1. Run `runs <id>` to get run list
2. Run `messages <run-id>` for the most recent run (or the one the user
   specified)
3. Walk through the message summary and identify:
   - Tool calls that errored (`has_error: true`)
   - Retries or repeated identical tool calls
   - Unexpectedly long gaps between steps
   - Where the agent recovered or gave up

### `search <query>`

Run `search <query>` and present matching issues with identifier, title, and status.

### `usage [--by-date]`

Run `issues --usage`, then:
- Without `--by-date`: rank all issues by `total_tokens` desc
- With `--by-date`: group by `updated_at` date and sum tokens per day

---

## Output style

- Present data as concise markdown tables or bullet lists, not raw JSON
- For token counts, format with thousands separators (e.g. `18,416,149`)
- Abbreviate cache_read/write as "Cache R/W" in tables to save space
- When showing runs, convert ISO timestamps to `HH:MM` local time and show
  duration as e.g. `4m 35s`
- Flag errors or anomalies with a ⚠ marker
