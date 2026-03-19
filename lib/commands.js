import { join } from 'node:path';
import { readYaml, writeYaml, ensureCtx, initCtx, nextId } from './store.js';

// ─── init ──────────────────────────────────────────
export function cmdInit() {
  const dir = initCtx();
  console.log(`✓ Initialized ${dir}/`);
  console.log('  status.yaml\n  decisions.yaml\n  tasks.yaml\n  handoff.yaml');
}

// ─── status ────────────────────────────────────────
export function cmdStatus(args) {
  const dir = ensureCtx();
  const file = join(dir, 'status.yaml');
  const data = readYaml(file);

  if (args.length === 0 || args[0] !== 'set') {
    // Display
    console.log(`Project: ${data.project}`);
    console.log(`Goal:    ${data.goal || '(not set)'}`);
    console.log(`Phase:   ${data.phase}`);
    console.log(`Status:  ${statusIcon(data.status)} ${data.status}`);
    if (data.stack && data.stack.length) console.log(`Stack:   ${data.stack.join(', ')}`);
    if (data.blockers && data.blockers.length) {
      console.log(`Blockers:`);
      data.blockers.forEach(b => console.log(`  - ${b}`));
    }
    return;
  }

  // Set mode
  const pairs = parseFlags(args.slice(1));
  for (const [k, v] of Object.entries(pairs)) {
    if (k === 'stack') {
      data.stack = v.split(',').map(s => s.trim());
    } else if (k === 'blockers') {
      data.blockers = v.split(',').map(s => s.trim());
    } else if (k in data) {
      data[k] = v;
    }
  }
  data.updated_at = new Date().toISOString();
  writeYaml(file, data);
  console.log('✓ Status updated');
}

// ─── decide ────────────────────────────────────────
export function cmdDecide(args) {
  const dir = ensureCtx();
  const file = join(dir, 'decisions.yaml');
  const data = readYaml(file) || { decisions: [] };
  if (!data.decisions) data.decisions = [];

  const what = args[0];
  if (!what) {
    // List decisions
    if (data.decisions.length === 0) {
      console.log('No decisions recorded.');
      return;
    }
    for (const d of data.decisions) {
      const icon = d.status === 'active' ? '●' : d.status === 'superseded' ? '○' : '?';
      console.log(`${icon} [${d.id}] ${d.what}`);
      if (d.why) console.log(`  Why: ${d.why}`);
    }
    return;
  }

  const flags = parseFlags(args.slice(1));
  const decision = {
    id: nextId('d', data.decisions),
    what,
    why: flags.why || '',
    made_by: flags.by || 'human',
    date: new Date().toISOString().slice(0, 10),
    status: 'active',
  };
  data.decisions.push(decision);
  writeYaml(file, data);
  console.log(`✓ Decision recorded [${decision.id}]: ${what}`);
}

// ─── task ──────────────────────────────────────────
export function cmdTask(args) {
  const dir = ensureCtx();
  const file = join(dir, 'tasks.yaml');
  const data = readYaml(file) || { tasks: [] };
  if (!data.tasks) data.tasks = [];

  const sub = args[0];
  const now = new Date().toISOString();

  if (!sub || sub === 'list') {
    if (data.tasks.length === 0) {
      console.log('No tasks.');
      return;
    }
    const groups = { doing: [], todo: [], blocked: [], done: [] };
    for (const t of data.tasks) {
      (groups[t.status] || groups.todo).push(t);
    }
    for (const status of ['doing', 'todo', 'blocked', 'done']) {
      if (groups[status].length === 0) continue;
      console.log(`\n${statusLabel(status)}`);
      for (const t of groups[status]) {
        const assignee = t.assignee ? ` @${t.assignee}` : '';
        console.log(`  [${t.id}] ${t.title}${assignee}`);
      }
    }
    console.log();
    return;
  }

  if (sub === 'add') {
    const title = args[1];
    if (!title) { console.error('Usage: ctx task add "title"'); return; }
    const flags = parseFlags(args.slice(2));
    const task = {
      id: nextId('t', data.tasks),
      title,
      status: 'todo',
      assignee: flags.assignee || '',
      created_at: now,
      updated_at: now,
    };
    data.tasks.push(task);
    writeYaml(file, data);
    console.log(`✓ Task added [${task.id}]: ${title}`);
    return;
  }

  if (['doing', 'done', 'block', 'todo'].includes(sub)) {
    const id = args[1];
    if (!id) { console.error(`Usage: ctx task ${sub} <id>`); return; }
    const task = data.tasks.find(t => t.id === id);
    if (!task) { console.error(`Task ${id} not found`); return; }
    task.status = sub === 'block' ? 'blocked' : sub;
    task.updated_at = now;
    writeYaml(file, data);
    console.log(`✓ [${id}] → ${task.status}`);
    return;
  }

  console.error(`Unknown task subcommand: ${sub}`);
}

// ─── handoff ───────────────────────────────────────
export function cmdHandoff() {
  const dir = ensureCtx();
  const statusData = readYaml(join(dir, 'status.yaml'));
  const tasksData = readYaml(join(dir, 'tasks.yaml')) || { tasks: [] };
  const decisionsData = readYaml(join(dir, 'decisions.yaml')) || { decisions: [] };

  const done = (tasksData.tasks || []).filter(t => t.status === 'done').map(t => t.title);
  const todo = (tasksData.tasks || []).filter(t => t.status === 'todo' || t.status === 'doing').map(t => t.title);
  const blocked = (tasksData.tasks || []).filter(t => t.status === 'blocked').map(t => t.title);

  const recentDecisions = (decisionsData.decisions || [])
    .filter(d => d.status === 'active')
    .slice(-5)
    .map(d => `${d.what} (${d.why})`);

  const keyContext = [];
  if (blocked.length) keyContext.push(`${blocked.length} blocked task(s): ${blocked.join(', ')}`);
  if (statusData.blockers && statusData.blockers.length) {
    keyContext.push(`Project blockers: ${statusData.blockers.join(', ')}`);
  }
  if (recentDecisions.length) keyContext.push(...recentDecisions.map(d => `Decision: ${d}`));

  const now = new Date().toISOString();
  const handoff = {
    handoff: {
      summary: `${statusData.project} is in ${statusData.phase} phase, status ${statusData.status}`,
      what_was_done: done.length ? done : ['(none yet)'],
      what_needs_doing: todo.length ? todo : ['(all done)'],
      key_context: keyContext.length ? keyContext : ['(no special context)'],
      generated_at: now,
      generated_by: 'ctx',
    },
  };

  writeYaml(join(dir, 'handoff.yaml'), handoff);
  console.log('✓ Handoff generated\n');
  console.log(`Summary: ${handoff.handoff.summary}`);
  console.log(`\nDone:`);
  handoff.handoff.what_was_done.forEach(s => console.log(`  ✓ ${s}`));
  console.log(`\nTodo:`);
  handoff.handoff.what_needs_doing.forEach(s => console.log(`  → ${s}`));
  if (keyContext.length) {
    console.log(`\nContext:`);
    handoff.handoff.key_context.forEach(s => console.log(`  ! ${s}`));
  }
}

// ─── briefing ──────────────────────────────────────
export function cmdBriefing() {
  const dir = ensureCtx();
  const status = readYaml(join(dir, 'status.yaml'));
  const tasks = readYaml(join(dir, 'tasks.yaml')) || { tasks: [] };
  const decisions = readYaml(join(dir, 'decisions.yaml')) || { decisions: [] };
  const handoff = readYaml(join(dir, 'handoff.yaml'));

  console.log('═══ CTX BRIEFING ═══\n');

  // Status
  console.log(`Project:  ${status.project}`);
  console.log(`Goal:     ${status.goal || '(not set)'}`);
  console.log(`Phase:    ${status.phase}`);
  console.log(`Status:   ${statusIcon(status.status)} ${status.status}`);
  if (status.stack && status.stack.length) console.log(`Stack:    ${status.stack.join(', ')}`);
  if (status.blockers && status.blockers.length) {
    console.log(`Blockers: ${status.blockers.join(', ')}`);
  }

  // Active tasks
  const activeTasks = (tasks.tasks || []).filter(t => t.status !== 'done');
  if (activeTasks.length) {
    console.log('\n── Tasks ──');
    for (const t of activeTasks) {
      const icon = t.status === 'doing' ? '▶' : t.status === 'blocked' ? '✖' : '○';
      const assignee = t.assignee ? ` @${t.assignee}` : '';
      console.log(`  ${icon} [${t.id}] ${t.title} (${t.status})${assignee}`);
    }
  }

  // Recent decisions
  const active = (decisions.decisions || []).filter(d => d.status === 'active');
  if (active.length) {
    console.log('\n── Decisions ──');
    for (const d of active.slice(-5)) {
      console.log(`  [${d.id}] ${d.what}`);
      if (d.why) console.log(`         Why: ${d.why}`);
    }
  }

  // Handoff
  if (handoff && handoff.handoff && handoff.handoff.summary) {
    console.log('\n── Last Handoff ──');
    console.log(`  ${handoff.handoff.summary}`);
    if (handoff.handoff.what_needs_doing && handoff.handoff.what_needs_doing.length) {
      console.log('  Needs doing:');
      handoff.handoff.what_needs_doing.forEach(s => console.log(`    → ${s}`));
    }
  }

  console.log('\n═══════════════════');
}

// ─── log ───────────────────────────────────────────
export function cmdLog() {
  const dir = ensureCtx();
  const tasks = readYaml(join(dir, 'tasks.yaml')) || { tasks: [] };
  const decisions = readYaml(join(dir, 'decisions.yaml')) || { decisions: [] };

  const events = [];

  for (const t of (tasks.tasks || [])) {
    events.push({ date: t.created_at, type: 'task', icon: '+', text: `[${t.id}] ${t.title}` });
    if (t.updated_at !== t.created_at) {
      events.push({ date: t.updated_at, type: 'task', icon: '→', text: `[${t.id}] → ${t.status}` });
    }
  }

  for (const d of (decisions.decisions || [])) {
    events.push({ date: d.date + 'T00:00:00Z', type: 'decision', icon: '◆', text: `[${d.id}] ${d.what}` });
  }

  events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  if (events.length === 0) {
    console.log('No events recorded.');
    return;
  }

  console.log('── Timeline ──\n');
  for (const e of events) {
    const date = (e.date || '').slice(0, 16).replace('T', ' ');
    console.log(`  ${date}  ${e.icon} ${e.text}`);
  }
  console.log();
}

// ─── helpers ───────────────────────────────────────
function parseFlags(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return result;
}

function statusIcon(s) {
  return s === 'green' ? '🟢' : s === 'yellow' ? '🟡' : s === 'red' ? '🔴' : '⚪';
}

function statusLabel(s) {
  return s === 'doing' ? '▶ IN PROGRESS' : s === 'todo' ? '○ TODO' : s === 'blocked' ? '✖ BLOCKED' : '✓ DONE';
}
