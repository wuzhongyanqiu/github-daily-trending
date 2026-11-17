// 把 dist 的 JS/CSS/数据内联成一个可双击打开的 index.html
// 原因：Chrome/Safari 在 file:// 下会拦截 <script type="module" src> 与 fetch(local.json)
// 注意：一律用函数式 replace，压缩后的 JS 里含 $& / $' 等替换模式字符
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const htmlPath = path.join(dist, 'index.html');

let html = await readFile(htmlPath, 'utf8');
const snapshotRaw = await readFile(path.join(root, 'public/data/trending.json'), 'utf8');
const snapshot = JSON.parse(snapshotRaw);
const snapshotJs = JSON.stringify(snapshot).replaceAll('<', '\\u003c');

const cssTag = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!cssTag) throw new Error('未找到样式表标签，构建结构已变化');
let css = await readFile(path.join(dist, cssTag[1].replace(/^\.?\//, '')), 'utf8');
css = css.replaceAll('</style', '<\\/style').replaceAll('<!--', '<\\!--');
html = html.replace(cssTag[0], () => `<style>\n${css}\n</style>`);

const jsTag = html.match(/<script[^>]*\ssrc="([^"]+\.js)"[^>]*><\/script>/);
if (!jsTag) throw new Error('未找到入口脚本标签，构建结构已变化');
let js = await readFile(path.join(dist, jsTag[1].replace(/^\.?\//, '')), 'utf8');
js = js.replaceAll('</script', '<\\/script');
const block = `<script>window.__TRENDING_SNAPSHOT__=${snapshotJs};</script>\n    <script type="module">\n${js}\n</script>`;
html = html.replace(jsTag[0], () => block);

html = html.replace(/[ \t]*<link[^>]*rel="modulepreload"[^>]*>\n?/g, () => '');
html = html.replace('<head>', () => '<head>\n    <meta name="build-mode" content="standalone-inline" />');

await writeFile(htmlPath, html, 'utf8');

const left = html.match(/<script[^>]*\ssrc=/g) || [];
if (left.length) throw new Error(`仍有 ${left.length} 个外部脚本引用`);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`[inline] dist/index.html ${kb(Buffer.byteLength(html))} · JS ${kb(js.length)} · CSS ${kb(css.length)} · 数据 ${kb(snapshotJs.length)} 已内联，无外部脚本引用`);
