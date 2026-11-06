// Every tool in the extension. `id` is its on/off key in chrome.storage.sync.
// Content scripts repeat their own id and default, because they can't import modules.
export const TOOLS = [
  {
    id: 'shippedRing',
    name: 'Shipped ring',
    description:
      'Adds a rotating Hack Club ring around GitHub avatars of people who have shipped a project with Hack Club.',
    site: 'github.com',
    defaultEnabled: true,
  },
];
