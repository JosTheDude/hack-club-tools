# Contributing

Thanks for helping! Issues and pull requests are welcome.

## Getting set up

```sh
bun install
bun run start:chrome   # or start:firefox
```

## Before opening a PR

- `bun test` and `bun run lint` pass (CI runs both).
- Tested by hand in **both** Chrome and Firefox.
- No new permissions or hosts without a reason in the PR description. New hosts also go in `PRIVACY.md`.
- No bundler, framework or runtime dependencies. The files in `extension/` are what ships, which keeps store review simple.
- Anything from a page that's sent to a server or put in a query is validated first (see `isUsername` in `extension/src/lib/ships.js`).

## Ideas for tools

A tool should be small, need no setup, and make Hack Club visible somewhere people already are. Open an issue to discuss one before building it.
