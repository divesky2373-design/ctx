# ctx

Shared project context for humans and AI agents. File-based, zero-dependency, works everywhere.

## Why

`AGENTS.md` tells agents *how* to work in your repo. `ctx` tracks *what's happening* — status, decisions, tasks, handoffs — so any agent (or human) can pick up where the last one left off.

## Install

```bash
npm i -g ctx-protocol
```

## Quick Start

```bash
ctx init                    # creates .context/ with 4 YAML files

ctx status set \
  --goal "Build auth system" \
  --phase building \
  --stack "node,postgres"

ctx decide "Use JWT" --why "Stateless, scales horizontally"

ctx task add "Implement login endpoint"
ctx task add "Add rate limiting"
ctx task doing t001
ctx task done t001

ctx handoff                 # generate handoff summary
ctx briefing                # full context dump for the next agent
```

Output of `ctx briefing`:

```
═══ CTX BRIEFING ═══

Project:  my-app
Goal:     Build auth system
Phase:    building
Status:   🟢 green
Stack:    node, postgres

── Tasks ──
  ○ [t002] Add rate limiting (todo)

── Decisions ──
  [d001] Use JWT
         Why: Stateless, scales horizontally

── Last Handoff ──
  my-app is in building phase, status green
  Needs doing:
    → Add rate limiting

═══════════════════
```

## Commands

| Command | Description |
|---------|-------------|
| `ctx init` | Create `.context/` directory with template files |
| `ctx status` | Show project status |
| `ctx status set --phase <p> --status <s> --goal <g>` | Update project status |
| `ctx decide "what" --why "why"` | Record a decision |
| `ctx task list` | List all tasks |
| `ctx task add "title"` | Add a task |
| `ctx task doing <id>` | Mark task in progress |
| `ctx task done <id>` | Mark task complete |
| `ctx task block <id>` | Mark task blocked |
| `ctx handoff` | Generate handoff summary from current state |
| `ctx briefing` | Output full project briefing |
| `ctx log` | Show timeline of all events |

## How it works

Everything lives in `.context/` at your project root:

```
.context/
├── status.yaml      # project goal, phase, status, stack, blockers
├── decisions.yaml   # decision log with rationale
├── tasks.yaml       # task list with status tracking
└── handoff.yaml     # generated handoff summary
```

All files are YAML — human-readable, git-diffable, no database needed.

## With AGENTS.md

| | Purpose |
|---|---|
| `AGENTS.md` | Static — *how* to work in this repo (conventions, architecture, rules) |
| `.context/` | Dynamic — *what's happening* right now (status, tasks, decisions) |

Put both in your repo. Agents read `AGENTS.md` for guidelines and `ctx briefing` for current state.

## Design Principles

- **Files are the protocol** — `.context/` is the entire system, no server needed
- **YAML over JSON** — human-editable, clean diffs
- **Zero dependencies** — pure Node.js ESM, built-in YAML parser
- **CLI-first** — any agent, IDE, or CI can call it
- **Cross-tool** — not tied to any specific AI provider or framework

## License

MIT
