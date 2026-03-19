// Minimal YAML parser/serializer — zero dependencies
// Supports: scalars, lists, nested maps, flow sequences, multiline strings

export function parse(text) {
  const lines = text.split('\n');
  return parseLines(lines, 0, 0).value;
}

function parseLines(lines, start, baseIndent) {
  const result = {};
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break;
    if (indent > baseIndent && i > start) break;

    const trimmed = line.trim();

    // List item at current level
    if (trimmed.startsWith('- ')) {
      // This shouldn't happen at top level without a key; skip
      i++;
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key = trimmed.slice(0, colonIdx).trim();
    const afterColon = trimmed.slice(colonIdx + 1).trim();

    if (afterColon === '') {
      // Check next line
      const nextNonEmpty = findNextNonEmpty(lines, i + 1);
      if (nextNonEmpty === -1) {
        result[key] = null;
        i++;
        continue;
      }
      const nextIndent = lines[nextNonEmpty].search(/\S/);
      const nextTrimmed = lines[nextNonEmpty].trim();

      if (nextIndent > indent && nextTrimmed.startsWith('- ')) {
        // List
        const list = parseList(lines, nextNonEmpty, nextIndent);
        result[key] = list.value;
        i = list.end;
      } else if (nextIndent > indent) {
        // Nested map
        const nested = parseLines(lines, nextNonEmpty, nextIndent);
        result[key] = nested.value;
        i = nested.end;
      } else {
        result[key] = null;
        i++;
      }
    } else if (afterColon.startsWith('[') && afterColon.endsWith(']')) {
      // Flow sequence
      const inner = afterColon.slice(1, -1).trim();
      result[key] = inner === '' ? [] : inner.split(',').map(s => parseScalar(s.trim()));
      i++;
    } else {
      result[key] = parseScalar(afterColon);
      i++;
    }
  }

  return { value: result, end: i };
}

function parseList(lines, start, baseIndent) {
  const result = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break;

    const trimmed = line.trim();
    if (!trimmed.startsWith('- ')) break;

    const content = trimmed.slice(2).trim();

    // Check if list item has nested key: value
    const colonIdx = content.indexOf(':');
    if (colonIdx > 0 && !content.startsWith('"') && !content.startsWith("'")) {
      // Could be a map item in list
      const afterItemColon = content.slice(colonIdx + 1).trim();
      if (afterItemColon !== '' || findNextNonEmpty(lines, i + 1) !== -1) {
        // Parse as map: first key is on this line
        const firstKey = content.slice(0, colonIdx).trim();
        const firstVal = afterItemColon;
        const itemMap = {};

        if (firstVal === '') {
          const nextNE = findNextNonEmpty(lines, i + 1);
          if (nextNE !== -1) {
            const nextInd = lines[nextNE].search(/\S/);
            if (nextInd > indent + 2) {
              if (lines[nextNE].trim().startsWith('- ')) {
                const sub = parseList(lines, nextNE, nextInd);
                itemMap[firstKey] = sub.value;
                i = sub.end;
              } else {
                const sub = parseLines(lines, nextNE, nextInd);
                itemMap[firstKey] = sub.value;
                i = sub.end;
              }
            } else {
              itemMap[firstKey] = null;
              i++;
            }
          } else {
            itemMap[firstKey] = null;
            i++;
          }
        } else {
          itemMap[firstKey] = parseScalar(firstVal);
          i++;
        }

        // Parse remaining keys at indent + 2
        const mapIndent = indent + 2;
        while (i < lines.length) {
          const ml = lines[i];
          if (ml.trim() === '' || ml.trim().startsWith('#')) { i++; continue; }
          const mi = ml.search(/\S/);
          if (mi < mapIndent) break;
          if (mi !== mapIndent) break;
          const mt = ml.trim();
          if (mt.startsWith('- ')) break;
          const mc = mt.indexOf(':');
          if (mc === -1) { i++; continue; }
          const mk = mt.slice(0, mc).trim();
          const mv = mt.slice(mc + 1).trim();

          if (mv === '') {
            const nextNE = findNextNonEmpty(lines, i + 1);
            if (nextNE !== -1) {
              const nextInd = lines[nextNE].search(/\S/);
              if (nextInd > mapIndent) {
                if (lines[nextNE].trim().startsWith('- ')) {
                  const sub = parseList(lines, nextNE, nextInd);
                  itemMap[mk] = sub.value;
                  i = sub.end;
                } else {
                  const sub = parseLines(lines, nextNE, nextInd);
                  itemMap[mk] = sub.value;
                  i = sub.end;
                }
              } else {
                itemMap[mk] = null;
                i++;
              }
            } else {
              itemMap[mk] = null;
              i++;
            }
          } else if (mv.startsWith('[') && mv.endsWith(']')) {
            const inner = mv.slice(1, -1).trim();
            itemMap[mk] = inner === '' ? [] : inner.split(',').map(s => parseScalar(s.trim()));
            i++;
          } else {
            itemMap[mk] = parseScalar(mv);
            i++;
          }
        }
        result.push(itemMap);
        continue;
      }
    }

    result.push(parseScalar(content));
    i++;
  }

  return { value: result, end: i };
}

function findNextNonEmpty(lines, start) {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim() !== '' && !lines[i].trim().startsWith('#')) return i;
  }
  return -1;
}

function parseScalar(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // Strip quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

export function stringify(obj, indent = 0) {
  if (obj === null || obj === undefined) return 'null\n';
  if (typeof obj !== 'object') return scalarToStr(obj) + '\n';

  const pad = ' '.repeat(indent);
  let out = '';

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]\n';
    for (const item of obj) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const keys = Object.keys(item);
        const firstKey = keys[0];
        out += `${pad}- ${firstKey}: ${inlineOrBlock(item[firstKey], indent + 2)}`;
        for (let k = 1; k < keys.length; k++) {
          out += `${pad}  ${keys[k]}: ${inlineOrBlock(item[keys[k]], indent + 2)}`;
        }
      } else {
        out += `${pad}- ${scalarToStr(item)}\n`;
      }
    }
  } else {
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) {
        out += `${pad}${key}:\n`;
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          out += `${pad}${key}: []\n`;
        } else {
          out += `${pad}${key}:\n`;
          out += stringify(val, indent + 2);
        }
      } else if (typeof val === 'object') {
        out += `${pad}${key}:\n`;
        out += stringify(val, indent + 2);
      } else {
        out += `${pad}${key}: ${scalarToStr(val)}\n`;
      }
    }
  }

  return out;
}

function inlineOrBlock(val, indent) {
  if (val === null || val === undefined) return '\n';
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]\n';
    return '\n' + stringify(val, indent);
  }
  if (typeof val === 'object') return '\n' + stringify(val, indent);
  return scalarToStr(val) + '\n';
}

function scalarToStr(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    if (val === '' || /[:#\[\]{},&*!|>'"%@`]/.test(val) || val.includes('\n') || /^\s|\s$/.test(val)) {
      return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return val;
  }
  return String(val);
}
