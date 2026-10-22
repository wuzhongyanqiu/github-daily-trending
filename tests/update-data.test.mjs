import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTrendingHtml, buildSnapshot } from '../scripts/update-data.mjs';

const row = '<article class="Box-row"><h2><a href="/acme/rocket">Rocket</a></h2></article>';
test('API failures retain old metadata without claiming fresh verification', async () => {
  const result = await buildSnapshot({html:row, fetchDetails:async()=>{throw Error('offline');},
    previous:{generatedAt:'2026-10-21T00:00:00Z',repositories:[{fullName:'acme/rocket',license:'MIT',topics:['tool']}]}});
  assert.equal(result.status,'partial');
  assert.equal(result.repositories[0].license,'MIT');
  assert.equal(result.repositories[0].metadataStatus,'stale');
  assert.equal(result.repositories[0].metadataCheckedAt,'2026-10-21T00:00:00Z');
  assert.deepEqual(result.coverage.metadataFailures,['acme/rocket']);
});
test('human editorial wins over sourced AI drafts', async () => {
  const human={status:'reviewed',summary:'human'};
  const research={status:'draft',commit:'a'.repeat(40),sources:[{url:'https://github.com/acme/rocket'}]};
  const result=await buildSnapshot({html:row,editorial:{'acme/rocket':human},research:{'acme/rocket':research},fetchDetails:async()=>({})});
  assert.deepEqual(result.repositories[0].chinese,human);
});
test('empty scrape and ungrounded research cannot replace a snapshot', async () => {
  await assert.rejects(buildSnapshot({html:''}),/拒绝覆盖/);
  await assert.rejects(buildSnapshot({html:row,research:{'acme/rocket':{status:'reviewed'}},fetchDetails:async()=>({})}),/固定版本/);
});

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
