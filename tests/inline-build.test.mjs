import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inlineDist, resolveAsset } from '../scripts/inline-build.mjs';

async function fixture(prefix) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'inline-fixture-'));
  await mkdir(path.join(dir, 'assets'), { recursive: true });
  await writeFile(path.join(dir, 'assets/app.js'), 'document.title="ok";');
  await writeFile(path.join(dir, 'assets/app.css'), 'body{color:#000}');
  await writeFile(
    path.join(dir, 'index.html'),
    `<!doctype html><html><head><link rel="stylesheet" crossorigin href="${prefix}assets/app.css"></head>`
      + `<body><script type="module" crossorigin src="${prefix}assets/app.js"></script></body></html>`,
  );
  await writeFile(path.join(dir, 'snapshot.json'), JSON.stringify({ generatedAt: '2026-11-17T00:00:00Z', repositories: [] }));
  return dir;
}

test('CI base 前缀（/github-daily-trending/assets/…）能解析并内联', async () => {
  const dir = await fixture('/github-daily-trending/');
  process.env.VITE_BASE_PATH = '/github-daily-trending/';
  try {
    const hit = await resolveAsset(dir, '/github-daily-trending/assets/app.css');
    assert.equal(hit, path.join(dir, 'assets/app.css'));
    const stats = await inlineDist({ distDir: dir, snapshotPath: path.join(dir, 'snapshot.json') });
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    assert.match(html, /<script type="module">/);
    assert.match(html, /__TRENDING_SNAPSHOT__/);
    assert.doesNotMatch(html, /<script[^>]*\ssrc=/);
    assert.doesNotMatch(html, /<link[^>]*rel="stylesheet"/);
    assert.ok(stats.htmlBytes > 0);
  } finally {
    delete process.env.VITE_BASE_PATH;
    await rm(dir, { recursive: true, force: true });
  }
});

test('本地相对引用（./assets/…）能解析并内联', async () => {
  const dir = await fixture('./');
  const stats = await inlineDist({ distDir: dir, snapshotPath: path.join(dir, 'snapshot.json') });
  const html = await readFile(path.join(dir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<script[^>]*\ssrc=/);
  assert.ok(stats.jsBytes > 0 && stats.cssBytes > 0);
  await rm(dir, { recursive: true, force: true });
});

test('引用不存在时报错并带上 base 与 dist 信息', async () => {
  const dir = await fixture('/x/');
  await assert.rejects(() => resolveAsset(dir, '/x/assets/missing.css'), /找不到构建产物/);
  await rm(dir, { recursive: true, force: true });
});
