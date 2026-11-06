# Privacy

Hack Club Tools has no analytics, no tracking and no accounts.

## What leaves your browser

**Shipped ring** (github.com only): the GitHub usernames whose avatars appear on the page you're viewing are sent to `https://api2.hackclub.com`, Hack Club's public API, to check whether they've shipped a project. Only usernames are sent: no cookies, no page URLs, nothing about you. Requests go in batches. Results are refreshed after 12 hours.

## What's stored locally

- `chrome.storage.sync`: which tools you've switched on or off.
- `chrome.storage.local`: cached ship counts per username. Entries not seen for 30 days are deleted.

Nothing else is stored, and nothing is sent anywhere else.
