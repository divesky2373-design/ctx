import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from './yaml.js';

const CTX_DIR = '.context';

export function ctxDir(cwd = process.cwd()) {
  return join(cwd, CTX_DIR);
}

export function ensureCtx(cwd) {
  const dir = ctxDir(cwd);
  if (!existsSync(dir)) {
    throw new Error('.context/ not found. Run `ctx init` first.');
  }
  return dir;
}

export function readYaml(filePath) {
  if (!existsSync(filePath)) return null;
  const text = readFileSync(filePath, 'utf8');
  return parse(text);
}

export function writeYaml(filePath, data) {
  writeFileSync(filePath, stringify(data), 'utf8');
}

export function initCtx(cwd = process.cwd()) {
  const dir = ctxDir(cwd);
  mkdirSync(dir, { recursive: true });

  const now = new Date().toISOString();
  const projectName = cwd.split('/').pop() || 'my-project';

  if (!existsSync(join(dir, 'status.yaml'))) {
    writeYaml(join(dir, 'status.yaml'), {
      project: projectName,
      goal: '',
      phase: 'planning',
      status: 'green',
      stack: [],
      blockers: [],
      updated_at: now,
      updated_by: 'human',
    });
  }

  if (!existsSync(join(dir, 'decisions.yaml'))) {
    writeYaml(join(dir, 'decisions.yaml'), { decisions: [] });
  }

  if (!existsSync(join(dir, 'tasks.yaml'))) {
    writeYaml(join(dir, 'tasks.yaml'), { tasks: [] });
  }

  if (!existsSync(join(dir, 'handoff.yaml'))) {
    writeYaml(join(dir, 'handoff.yaml'), {
      handoff: {
        summary: '',
        what_was_done: [],
        what_needs_doing: [],
        key_context: [],
        generated_at: now,
        generated_by: 'human',
      },
    });
  }

  return dir;
}

export function nextId(prefix, items) {
  if (!items || items.length === 0) return `${prefix}001`;
  const nums = items
    .map(i => i.id)
    .filter(Boolean)
    .map(id => parseInt(id.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}
