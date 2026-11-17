// 把 dist 的 JS/CSS/数据内联成一个可双击打开的 index.html
// 原因：Chrome/Safari 在 file:// 下会拦截 <script type="module" src> 与 fetch(local.json)
// 关键：CI 会传 VITE_BASE_PATH=/github-daily-trending/，HTML 里的 href 带前缀但文件在 dist/assets/，
//      必须按真实文件解析引用，不能靠剥斜杠。
import { readFile, writeFile, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function walk(dir, depth = 3, acc = []) {
  if (depth < 0) return acc;
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, depth - 1, acc);
    else acc.push(full);
  }
  return acc;
}

/**
 * 把 HTML 中的引用解析成 dist 下真实存在的文件。
 * 依次尝试：原样相对路径 → 去掉开头的 / 或 ./ → 只取文件名 → 在 dist 内按文件名递归查找。
 */
export async function resolveAsset(distDir, ref) {
  const clean = decodeURIComponent(String(ref).split('?')[0].split('#')[0]);

  // 按 URL 语义取 pathname（去掉 query/hash/协议），再按已知 base 前缀剥出相对 dist 的路径
  let pathname = clean;
  try { pathname = new URL(clean, 'http://build.local/').pathname; } catch { /* 保留原值 */ }
  const rawBase = process.env.VITE_BASE_PATH ?? './';
  let basePath = rawBase;
  try { if (/^https?:\/\//.test(rawBase)) basePath = new URL(rawBase).pathname; } catch { /* 忽略 */ }
  const stripped = basePath && basePath !== './' && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;

  const candidates = [];
  for (const rel of [stripped, pathname]) {
    const trimmed = rel.replace(/^\/+/, '');
    if (trimmed && !trimmed.startsWith('..')) candidates.push(path.join(distDir, trimmed));
  }
  if (!clean.startsWith('/')) candidates.push(path.join(distDir, clean));
  candidates.push(path.join(distDir, path.basename(clean)));

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }

  const name = path.basename(clean);
  const hit = (await walk(distDir)).find((file) => path.basename(file) === name);
  if (!hit) {
    throw new Error(
      `找不到构建产物 ${ref}（VITE_BASE_PATH=${process.env.VITE_BASE_PATH ?? '(未设置)'}，dist=${distDir}）`,
    );
  }
  return hit;
}

/**
 * 内联给定的 dist 目录。测试直接调用。
 * @returns {{ htmlBytes: number, jsBytes: number, cssBytes: number, dataBytes: number }}
 */
export async function inlineDist({
  distDir = path.join(scriptRoot, 'dist'),
  snapshotPath = path.join(scriptRoot, 'public/data/trending.json'),
} = {}) {
  const htmlPath = path.join(distDir, 'index.html');
  let html = await readFile(htmlPath, 'utf8');
  const snapshotRaw = await readFile(snapshotPath, 'utf8');
  const snapshot = JSON.parse(snapshotRaw);
  const snapshotJs = JSON.stringify(snapshot).replaceAll('<', '\\u003c');

  const cssTag = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (!cssTag) throw new Error('未找到样式表标签，构建结构已变化');
  let css = await readFile(await resolveAsset(distDir, cssTag[1]), 'utf8');
  css = css.replaceAll('</style', '<\\/style').replaceAll('<!--', '<\\!--');
  html = html.replace(cssTag[0], () => `<style>\n${css}\n</style>`);

  const jsTag = html.match(/<script[^>]*\ssrc="([^"]+\.js)"[^>]*><\/script>/);
  if (!jsTag) throw new Error('未找到入口脚本标签，构建结构已变化');
  let js = await readFile(await resolveAsset(distDir, jsTag[1]), 'utf8');
  js = js.replaceAll('</script', '<\\/script');
  const block = `<script>window.__TRENDING_SNAPSHOT__=${snapshotJs};</script>\n    <script type="module">\n${js}\n</script>`;
  html = html.replace(jsTag[0], () => block);

  html = html.replace(/[ \t]*<link[^>]*rel="modulepreload"[^>]*>\n?/g, () => '');
  html = html.replace('<head>', () => '<head>\n    <meta name="build-mode" content="standalone-inline" />');

  await writeFile(htmlPath, html, 'utf8');

  const remaining = html.match(/<script[^>]*\ssrc=/g) || [];
  if (remaining.length) throw new Error(`内联后仍有 ${remaining.length} 个外部脚本引用`);

  return {
    htmlBytes: Buffer.byteLength(html),
    jsBytes: Buffer.byteLength(js),
    cssBytes: Buffer.byteLength(css),
    dataBytes: Buffer.byteLength(snapshotJs),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await inlineDist();
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  console.log(
    `[inline] dist/index.html ${kb(r.htmlBytes)} · JS ${kb(r.jsBytes)} · CSS ${kb(r.cssBytes)} · 数据 ${kb(r.dataBytes)} 已内联，无外部脚本引用`,
  );
}
