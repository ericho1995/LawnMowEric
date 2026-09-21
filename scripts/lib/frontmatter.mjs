// Minimal front matter: a leading block of `key: value` lines between two
// `---` fences. Values are plain strings; only the first colon splits, so
// titles like "Services: pricing" survive intact.
export function parseFrontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1 || !line.trim()) continue;
    data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { data, body: text.slice(match[0].length) };
}
