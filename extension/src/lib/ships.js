// Lookups against Hack Club's public YSWS "Approved Projects" table, served by api2.hackclub.com.

export const API_URL =
  'https://api2.hackclub.com/v0.1/Unified%20YSWS%20Projects%20DB/Approved%20Projects';

// GitHub's character set. Also the injection guard: names are pasted into an Airtable formula,
// so anything with quotes, braces or backslashes must never get through.
const USERNAME = /^[a-z\d-]{1,39}$/i;

export const isUsername = (value) => typeof value === 'string' && USERNAME.test(value);

// shortcut: only matches the "GitHub Username" field (api2 blocks FIND/SEARCH, so we can't
// match Code URLs). Ships submitted without that field don't count until api2 allows it.
export function lookupUrl(usernames) {
  const terms = usernames.map((u) => {
    if (!isUsername(u)) throw new Error(`Not a GitHub username: ${u}`);
    return `LOWER({GitHub Username})="${u.toLowerCase()}"`;
  });
  const select = { fields: ['GitHub Username'], filterByFormula: `OR(${terms.join(',')})` };
  return `${API_URL}?select=${encodeURIComponent(JSON.stringify(select))}`;
}

// api2 returns [{ id, fields: { 'GitHub Username': 'Name' } }, ...]. Returns { lowercase name: count }.
export function countByUser(records) {
  const counts = {};
  for (const record of Array.isArray(records) ? records : []) {
    const name = record?.fields?.['GitHub Username'];
    if (typeof name !== 'string') continue;
    const key = name.trim().toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
