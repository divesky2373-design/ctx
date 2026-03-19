#!/usr/bin/env node

import { cmdInit, cmdStatus, cmdDecide, cmdTask, cmdHandoff, cmdBriefing, cmdLog } from '../lib/commands.js';

const args = process.argv.slice(2);
const cmd = args[0];
const rest = args.slice(1);

const HELP = `ctx — Cross-agent project context protocol

Usage:
  ctx init                              Initialize .context/ directory
  ctx status                            Show project status
  ctx status set --phase <p> --status <s>  Update status
  ctx decide "what" --why "why"         Record a decision
  ctx task list                         List tasks
  ctx task add "title"                  Add a task
  ctx task doing|done|block|todo <id>   Update task status
  ctx handoff                           Generate handoff summary
  ctx briefing                          Full agent briefing
  ctx log                               Timeline of all events
`;

try {
  switch (cmd) {
    case 'init':     cmdInit(); break;
    case 'status':   cmdStatus(rest); break;
    case 'decide':   cmdDecide(rest); break;
    case 'task':     cmdTask(rest); break;
    case 'handoff':  cmdHandoff(); break;
    case 'briefing': cmdBriefing(); break;
    case 'log':      cmdLog(); break;
    case 'help': case '--help': case '-h': case undefined:
      console.log(HELP); break;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
