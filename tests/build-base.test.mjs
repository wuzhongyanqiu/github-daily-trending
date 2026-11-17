// 真实构建用例：模拟 CI 的 VITE_BASE_PATH，确认内联步骤在带前缀路径下仍然工作
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inlineDist } from '../scripts/inline-build.mjs';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(root, 'node_modules/vite/bin/vite.js');

test('带生产 base 的真实构建可内联', { timeout: 180_000 }, async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'build-base-'));
  try {
    await execFileAsync(process.execPath, [viteBin, 'build', '--outDir', out, '--emptyOutDir'], {
      cwd: root,
      env: { ...process.env, VITE_BASE_PATH: '/github-daily-trending/' },
    });
    const before = await readFile(path.join(out, 'index.html'), 'utf8');
    assert.match(before, /\/github-daily-trending\/assets\//, '前置条件：构建应带 base 前缀');

    const stats = await inlineDist({ distDir: out, snapshotPath: path.join(root, 'public/data/trending.json') });
    const after = await readFile(path.join(out, 'index.html'), 'utf8');
    assert.doesNotMatch(after, /<script[^>]*\ssrc=/);
    assert.doesNotMatch(after, /<link[^>]*rel="stylesheet"/);
    assert.match(after, /__TRENDING_SNAPSHOT__/);
    assert.ok(stats.htmlBytes > stats.jsBytes);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
