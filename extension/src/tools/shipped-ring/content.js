// Shipped ring: outlines GitHub avatars of people with an approved Hack Club YSWS project.
//
// Speed matters here because it runs on every GitHub page:
// - Runs at document_start with the whole cache preloaded, so known users are painted in the same
//   frame their avatar is parsed. No flash, no request, no background wake-up.
// - Only touches nodes the MutationObserver reports, never rescans the page.
// - Never reads layout: ring size comes from the width attribute, painting is one attribute write.
// - Expired cache entries still paint instantly and are refreshed in the background.
(() => {
  const TOOL_ID = 'shippedRing'; // matches src/tools.js
  const PREFIX = 'ship:'; // matches src/background.js
  const TTL = 12 * 60 * 60 * 1000; // matches src/background.js
  const AVATAR = 'img[src^="https://avatars.githubusercontent.com/"]';
  const NAME = '[A-Za-z\\d-]{1,39}';
  const FROM_AT = new RegExp(`^@(${NAME})$`);
  const FROM_PROFILE = new RegExp(`^View (${NAME})'s full-sized avatar$`);
  const FROM_HOVERCARD = new RegExp(`^/users/(${NAME})/hovercard`);
  const FROM_PATH = new RegExp(`^/(${NAME})/?$`);
  const PLAIN = new RegExp(`^${NAME}$`);

  const known = new Map(); // lowercase username -> ship count (fresh or stale)
  const stale = new Set(); // known, but due for a refresh
  const inflight = new Set();
  const waiting = new Map(); // username -> imgs to paint once its count arrives
  let seen = new WeakMap(); // img -> src|alt it was last handled with
  let observer = null;
  let flushQueued = false;

  function usernameOf(img) {
    const hovercard = img.closest('[data-hovercard-url]')?.getAttribute('data-hovercard-url');
    let match = hovercard && FROM_HOVERCARD.exec(hovercard);
    if (match) return match[1];

    const alt = img.alt;
    match = FROM_AT.exec(alt) || FROM_PROFILE.exec(alt);
    if (match) return match[1];

    const link = img.closest('a[href]');
    if (link && link.host === location.host) {
      match = FROM_PATH.exec(link.pathname);
      if (match) return match[1];
      if (link.search.includes('author=')) {
        const author = new URLSearchParams(link.search).get('author'); // commit lists
        if (author && PLAIN.test(author)) return author;
      }
    }

    // Primer React avatars use the bare login as alt text.
    return PLAIN.test(alt) && img.getAttribute('data-component') === 'Avatar' ? alt : null;
  }

  function paint(img, ships) {
    if (!ships) return unpaint(img);
    // Small avatars sit in tight rows, so their ring goes inside the edge instead of outside.
    const size = +img.getAttribute('width') || 32;
    img.setAttribute('data-hct-ring', size >= 100 ? 'l' : size >= 32 ? 'm' : 's');
    if (!img.hasAttribute('title')) {
      img.title = `Shipped ${ships} project${ships === 1 ? '' : 's'} with Hack Club`;
      img.setAttribute('data-hct-title', '');
    }
  }

  function unpaint(img) {
    if (!img.hasAttribute('data-hct-ring')) return;
    img.removeAttribute('data-hct-ring');
    if (img.hasAttribute('data-hct-title')) {
      img.removeAttribute('title');
      img.removeAttribute('data-hct-title');
    }
  }

  function handle(img) {
    const signature = img.src + '|' + img.alt;
    if (seen.get(img) === signature) return;
    seen.set(img, signature);

    const user = usernameOf(img)?.toLowerCase();
    if (!user) return unpaint(img);
    const ships = known.get(user);
    if (ships === undefined) {
      unpaint(img); // React may have reused this <img> for someone else
      const list = waiting.get(user);
      list ? list.push(img) : waiting.set(user, [img]);
    } else {
      paint(img, ships);
      if (!stale.has(user)) return;
      if (!waiting.has(user)) waiting.set(user, []);
    }
    if (!flushQueued) {
      flushQueued = true;
      setTimeout(flush, 50); // coalesce a whole parser chunk / React render into one request
    }
  }

  function handleTree(node) {
    if (node.nodeName === 'IMG') {
      if (node.matches(AVATAR)) handle(node);
    } else if (node.firstElementChild) {
      for (const img of node.querySelectorAll(AVATAR)) handle(img);
    }
  }

  async function flush() {
    flushQueued = false;
    const users = [...waiting.keys()].filter((u) => !inflight.has(u));
    if (!users.length || !observer) return;
    users.forEach((u) => inflight.add(u));

    let result = {};
    try {
      result = (await chrome.runtime.sendMessage({ type: 'ships:lookup', usernames: users })) ?? {};
    } catch {
      // Extension was reloaded or updated under this tab; the next page load recovers.
    }

    let changed = false;
    for (const user of users) {
      inflight.delete(user);
      if (!(user in result)) {
        // Lookup failed: keep any stale ring and retry on a later page, not on every mutation.
        waiting.delete(user);
        stale.delete(user);
        continue;
      }
      const ships = result[user];
      changed ||= stale.has(user) && known.get(user) !== ships;
      known.set(user, ships);
      stale.delete(user);
      if (observer) for (const img of waiting.get(user)) if (img.isConnected) paint(img, ships);
      waiting.delete(user);
    }
    if (changed && observer) rescan(); // a refreshed count differs from what's on screen
  }

  function rescan() {
    seen = new WeakMap();
    handleTree(document.documentElement);
  }

  function enable() {
    if (observer) return;
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.target.matches(AVATAR)) handle(record.target);
        } else {
          for (const node of record.addedNodes) if (node.nodeType === 1) handleTree(node);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'alt'],
    });
    rescan();
  }

  function disable() {
    observer?.disconnect();
    observer = null;
    waiting.clear();
    document.querySelectorAll('img[data-hct-ring]').forEach(unpaint);
  }

  Promise.all([chrome.storage.sync.get({ [TOOL_ID]: true }), chrome.storage.local.get(null)]).then(
    ([settings, cache]) => {
      const now = Date.now();
      for (const key in cache) {
        if (!key.startsWith(PREFIX)) continue;
        const user = key.slice(PREFIX.length);
        known.set(user, cache[key].n);
        if (now - cache[key].t >= TTL) stale.add(user);
      }
      if (settings[TOOL_ID]) enable();
    },
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && TOOL_ID in changes) (changes[TOOL_ID].newValue ?? true) ? enable() : disable();
  });
})();
