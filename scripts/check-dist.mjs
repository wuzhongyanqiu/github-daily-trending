// 构建后自检：dist/index.html 必须自包含，数据文件必须在位
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');

const problems = [];
if (/<script[^>]*\ssrc=/.test(html)) problems.push('仍引用外部 script（未内联）');
if (/<link[^>]*rel="stylesheet"/.test(html)) problems.push('仍引用外部样式表（未内联）');
if (!html.includes('__TRENDING_SNAPSHOT__')) problems.push('缺少内联数据快照');
if (!html.includes('build-mode" content="standalone-inline')) problems.push('缺少 build-mode 标记');
try { await access(path.join(dist, 'data/trending.json')); } catch { problems.push('dist/data/trending.json 缺失（http 部署将取不到数据）'); }

if (problems.length) {
  console.error(`[check-dist] 失败：${problems.join('；')}`);
  process.exit(1);
}
console.log(`[check-dist] 通过（base=${process.env.VITE_BASE_PATH ?? '(未设置)'}，${(Buffer.byteLength(html) / 1024).toFixed(1)} KB）`);
