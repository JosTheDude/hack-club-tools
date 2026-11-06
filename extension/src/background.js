import { isUsername, lookupUrl, countByUser } from './lib/ships.js';

const TTL = 12 * 60 * 60 * 1000; // after this, entries still paint but get refreshed
const KEEP = 30 * 24 * 60 * 60 * 1000; // entries unseen this long are deleted
const BATCH = 30; // ~1.8 KB of URL per request
const MAX_PER_MESSAGE = 500;
const PREFIX = 'ship:';

const pending = new Map(); // lowercase username -> Promise<number>, shared across tabs

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'ships:lookup' || !Array.isArray(message.usernames)) return false;
  lookup(message.usernames).then(sendResponse, () => sendResponse({}));
  return true; // keep the channel open for the async response
});

chrome.runtime.onStartup.addListener(pruneCache);
chrome.runtime.onInstalled.addListener(pruneCache);

async function lookup(names) {
  const users = [...new Set(names.filter(isUsername).map((u) => u.toLowerCase()))].slice(
    0,
    MAX_PER_MESSAGE,
  );
  const cached = await chrome.storage.local.get(users.map((u) => PREFIX + u));
  const now = Date.now();
  const result = {};
  const toFetch = [];

  for (const user of users) {
    const entry = cached[PREFIX + user];
    if (entry && now - entry.t < TTL) result[user] = entry.n;
    else if (!pending.has(user)) toFetch.push(user);
  }

  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    const request = fetchBatch(batch);
    for (const user of batch) {
      pending.set(
        user,
        request.then((counts) => counts[user] ?? 0, () => 0).finally(() => pending.delete(user)),
      );
    }
  }

  await Promise.all(
    users
      .filter((u) => !(u in result) && pending.has(u))
      .map(async (u) => (result[u] = await pending.get(u))),
  );
  return result;
}

async function fetchBatch(batch) {
  const response = await fetch(lookupUrl(batch));
  if (!response.ok) throw new Error(`api2 responded ${response.status}`);
  const counts = countByUser(await response.json());
  const t = Date.now();
  // Cache misses too, so people who haven't shipped don't trigger a request on every page.
  await chrome.storage.local.set(
    Object.fromEntries(batch.map((u) => [PREFIX + u, { n: counts[u] ?? 0, t }])),
  );
  return counts;
}

async function pruneCache() {
  const all = await chrome.storage.local.get(null);
  const now = Date.now();
  const stale = Object.keys(all).filter((k) => k.startsWith(PREFIX) && now - all[k].t >= KEEP);
  if (stale.length) await chrome.storage.local.remove(stale);
}
