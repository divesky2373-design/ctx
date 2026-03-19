# AGENTS.md

## Project

`ctx` is a CLI tool and file-based protocol for sharing project context across AI agents and humans.

## Architecture

- `bin/ctx.js` — CLI entry point
- `lib/commands.js` — all command implementations
- `lib/store.js` — reads/writes `.context/` YAML files
- `lib/yaml.js` — built-in YAML parser (zero dependencies)

## Conventions

- Zero dependencies. Do not add any npm dependencies.
- Pure ESM (`"type": "module"` in package.json).
- YAML is the only data format — no JSON config files.
- All CLI output goes to stdout. Errors go to stderr.

## Agent Workflow

```bash
ctx briefing          # start of session — read project state
# ... do work ...
ctx handoff           # end of session — write handoff summary
```
