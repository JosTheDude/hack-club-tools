import { describe, expect, test } from 'bun:test';
import { isUsername, lookupUrl, countByUser, API_URL } from '../extension/src/lib/ships.js';

const formulaOf = (url) =>
  JSON.parse(decodeURIComponent(url.slice(`${API_URL}?select=`.length))).filterByFormula;

describe('isUsername', () => {
  test('accepts GitHub usernames', () => {
    for (const name of ['octocat', 'Hack-Club', 'a', '0', 'x'.repeat(39)]) expect(isUsername(name)).toBe(true);
  });

  test('rejects anything that could break out of the formula', () => {
    for (const name of ['', 'x'.repeat(40), 'a"b', "a'b", 'a)b', 'a{b}', 'a\\b', 'a b', 'a/b', null, 42])
      expect(isUsername(name)).toBe(false);
  });
});

describe('lookupUrl', () => {
  test('builds a case-insensitive OR over the GitHub Username field', () => {
    expect(formulaOf(lookupUrl(['Octocat', 'zach']))).toBe(
      'OR(LOWER({GitHub Username})="octocat",LOWER({GitHub Username})="zach")',
    );
  });

  test('refuses unsafe input instead of building a formula', () => {
    expect(() => lookupUrl(['ok', 'x"),TRUE(),("'])).toThrow();
  });
});

describe('countByUser', () => {
  test('counts records per lowercase username and skips junk', () => {
    const records = [
      { fields: { 'GitHub Username': 'Octocat' } },
      { fields: { 'GitHub Username': ' octocat ' } },
      { fields: { 'GitHub Username': 'zach' } },
      { fields: {} },
      null,
    ];
    expect(countByUser(records)).toEqual({ octocat: 2, zach: 1 });
  });

  test('handles a non-array response', () => {
    expect(countByUser({ error: 'nope' })).toEqual({});
  });
});
