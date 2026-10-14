import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTrendingHtml } from '../scripts/update-data.mjs';

test('parses repository facts from a trending row', () => {
  const html = `
    <article class="Box-row">
      <h2><a href="/acme/rocket"> acme / rocket </a></h2>
      <p>A fast launch tool.</p>
      <span itemprop="programmingLanguage">Rust</span>
      <a class="Link--muted">12,345</a>
      <a class="Link--muted">678</a>
      <span class="d-inline-block float-sm-right">1,234 stars today</span>
    </article>`;

  assert.deepEqual(parseTrendingHtml(html), [{
    rank: 1,
    fullName: 'acme/rocket',
    owner: 'acme',
    name: 'rocket',
    url: 'https://github.com/acme/rocket',
    description: 'A fast launch tool.',
    language: 'Rust',
    stars: 12345,
    forks: 678,
    starsToday: 1234,
  }]);
});

test('ignores malformed repository links', () => {
  assert.equal(parseTrendingHtml('<article class="Box-row"><h2><a href="/topics/rust">bad</a></h2></article>').length, 0);
});
