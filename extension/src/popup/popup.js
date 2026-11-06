import { TOOLS } from '../tools.js';

const list = document.getElementById('tools');
const template = document.getElementById('tool');
const settings = await chrome.storage.sync.get(
  Object.fromEntries(TOOLS.map((t) => [t.id, t.defaultEnabled])),
);

for (const tool of TOOLS) {
  const item = template.content.cloneNode(true);
  item.querySelector('.name').textContent = tool.name;
  item.querySelector('.description').textContent = `${tool.description} (${tool.site})`;
  const toggle = item.querySelector('input');
  toggle.checked = settings[tool.id];
  toggle.addEventListener('change', () => chrome.storage.sync.set({ [tool.id]: toggle.checked }));
  list.append(item);
}
