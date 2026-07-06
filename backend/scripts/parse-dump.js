const fs = require('fs');

// Parses a single `INSERT INTO \`table\` VALUES (...),(...),...;` statement (mysqldump format)
// into an array of row arrays. Handles quoted strings with backslash escapes, NULL, numbers.
function parseInsertValues(sql) {
  const match = sql.match(/INSERT INTO `[^`]+` VALUES\s*([\s\S]*?);\s*(?:\/\*!40000|$)/);
  if (!match) return [];
  const body = match[1];

  const rows = [];
  let i = 0;
  const n = body.length;

  function skipWs() {
    while (i < n && /\s/.test(body[i])) i++;
  }

  while (i < n) {
    skipWs();
    if (body[i] === ',') { i++; continue; }
    if (body[i] !== '(') break;
    i++; // consume (
    const row = [];
    while (true) {
      skipWs();
      if (body[i] === ')') { i++; break; }
      if (body[i] === "'") {
        i++;
        let val = '';
        while (i < n && body[i] !== "'") {
          if (body[i] === '\\') {
            const next = body[i + 1];
            const map = { n: '\n', r: '\r', t: '\t', '0': '\0', Z: '\x1a', "'": "'", '"': '"', '\\': '\\' };
            val += map[next] !== undefined ? map[next] : next;
            i += 2;
          } else {
            val += body[i];
            i++;
          }
        }
        i++; // consume closing '
        row.push(val);
      } else if (body.startsWith('NULL', i)) {
        row.push(null);
        i += 4;
      } else {
        let start = i;
        while (i < n && body[i] !== ',' && body[i] !== ')') i++;
        const raw = body.slice(start, i).trim();
        row.push(raw.includes('.') ? parseFloat(raw) : parseInt(raw, 10));
      }
      skipWs();
      if (body[i] === ',') i++;
    }
    rows.push(row);
  }

  return rows;
}

function loadTable(dumpDir, tableFile, columns) {
  const sql = fs.readFileSync(`${dumpDir}/${tableFile}`, 'utf8');
  const rows = parseInsertValues(sql);
  return rows.map((r) => Object.fromEntries(columns.map((c, idx) => [c, r[idx]])));
}

module.exports = { parseInsertValues, loadTable };
