# Hack Club Tools

A browser extension for Chrome and Firefox with small tools that bring Hack Club to the web.

## Tools

| Tool | Site | What it does |
| --- | --- | --- |
| **Shipped ring** | github.com | Adds a Hack Club red ring around the avatar of anyone who has shipped a project with Hack Club. Hover the avatar to see how many. |

Every tool can be switched on or off from the toolbar popup. Changes apply to open tabs right away.

### How "shipped" is decided

The extension checks the GitHub usernames on the page against the approved projects in Hack Club's [You Ship, We Ship](https://hackclub.com/programs) database, through the public `api2.hackclub.com` endpoint. A person counts as shipped when at least one approved project lists their GitHub username.

Projects submitted without a GitHub username aren't matched yet: the public API doesn't allow matching against repo URLs.

## Install

Store listings are coming. Until then, load it from source:

**Chrome / Edge / Brave / Arc**
1. Clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the `extension/` folder.

**Firefox** (140 or newer)
1. Clone this repo.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and pick `extension/manifest.json`.

## Development

Uses [Bun](https://bun.sh).

```sh
bun install
bun run start:chrome     # or start:firefox: opens a fresh browser with the extension loaded and reloads on save
bun test                 # unit tests
bun run lint             # web-ext lint (Firefox's add-on linter)
bun run build            # zips extension/ into dist/, ready for the Chrome Web Store and AMO
```

The ring is built to cost almost nothing on GitHub: the content script runs at `document_start` with the cache preloaded, so known users get their ring in the same frame their avatar appears. It only looks at nodes the page adds, never reads layout, and shows expired results right away while it refreshes them in the background.

There's no bundler or build step: the files in `extension/` are what ships. One manifest works in both browsers. Chrome reads `background.service_worker` and Firefox reads `background.scripts`, so `web-ext lint` shows one expected warning about that.

### Layout

```
extension/
  manifest.json
  src/
    background.js          # API lookups with batching and caching (shared by all tabs)
    lib/ships.js           # api2 query building and parsing (unit tested)
    tools.js               # list of tools shown in the popup
    popup/                 # toolbar popup and options page
    tools/
      shipped-ring/        # content script + CSS for github.com
tests/
```

### Adding a tool

1. Create `extension/src/tools/<your-tool>/` with a content script (and CSS if needed).
2. Register it under `content_scripts` in `extension/manifest.json`, with the narrowest `matches` that works.
3. Add an entry to `extension/src/tools.js`. Its `id` is the on/off key in `chrome.storage.sync`.
4. In the content script, read that key (default `true`) and listen to `chrome.storage.onChanged`, so the popup toggle applies right away. `shipped-ring/content.js` shows the pattern.
5. If it calls a new host, add it to `host_permissions` and to [PRIVACY.md](PRIVACY.md).

See [CONTRIBUTING.md](CONTRIBUTING.md) for more.

## Privacy

No analytics, no accounts, and nothing is collected by this extension. The only network request sends GitHub usernames to `api2.hackclub.com`. Full details are in [PRIVACY.md](PRIVACY.md).

## License

[MIT](LICENSE)
