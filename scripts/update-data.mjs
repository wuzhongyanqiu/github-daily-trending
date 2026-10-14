import { load } from 'cheerio';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = path.join(projectRoot, 'public/data/trending.json');
const editorialPath = path.join(projectRoot, 'data/editorial.json');
const userAgent = 'GitHubDailyTrending/0.1 (+https://github.com/wuzhongyanqiu/github-daily-trending)';
const execFileAsync = promisify(execFile);
const reservedOwners = new Set(['about', 'apps', 'collections', 'customer-stories', 'enterprise', 'events', 'features', 'marketplace', 'orgs', 'pricing', 'search', 'security', 'settings', 'sponsors', 'topics', 'trending']);

function integer(text) {
  const normalized = String(text || '').replaceAll(',', '').trim();
  const match = normalized.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

export function parseTrendingHtml(html) {
  const $ = load(html);

  return $('article.Box-row')
    .map((index, article) => {
      const row = $(article);
      const href = row.find('h2 a').attr('href')?.trim() || '';
      const fullName = href.replace(/^\//, '').replace(/\s/g, '');
      if (!/^[^/]+\/[^/]+$/.test(fullName)) return null;

      const [owner, name] = fullName.split('/');
      if (reservedOwners.has(owner.toLowerCase())) return null;
      const links = row.find('a.Link--muted');
      const starsTodayText = row.find('span.d-inline-block.float-sm-right').text();

      return {
        rank: index + 1,
        fullName,
        owner,
        name,
        url: `https://github.com/${fullName}`,
        description: row.find('p').first().text().replace(/\s+/g, ' ').trim(),
        language: row.find('[itemprop="programmingLanguage"]').text().trim() || null,
        stars: integer(links.eq(0).text()),
        forks: integer(links.eq(1).text()),
        starsToday: integer(starsTodayText),
      };
    })
    .get()
    .filter(Boolean);
}

function metadataEditorial(repo) {
  const subject = repo.description || `${repo.fullName} 开源仓库`;
  const stack = repo.language ? `主要使用 ${repo.language}` : '主要语言暂未识别';
  return {
    title: repo.name,
    summary: `${subject}。该项目进入了今日 GitHub Trending，本条中文说明根据公开元数据整理，建议打开原仓库 README 核验具体能力与使用边界。`,
    highlights: [
      `今日新增 ${repo.starsToday.toLocaleString('zh-CN')} Star`,
      `${stack}，当前累计 ${repo.stars.toLocaleString('zh-CN')} Star`,
      repo.license ? `仓库标注 ${repo.license} 许可证` : '公开元数据未识别到许可证',
    ],
    useCases: ['了解近期开发者关注方向', '评估是否值得进一步试用或调研'],
    audience: '关注开源工具与技术趋势的开发者、研究者和产品团队',
    caution: '这是基于仓库公开元数据生成的中文整理，不代表项目方表述；采用前请核验 README、许可证、活跃度与安全边界。',
    status: 'metadata',
  };
}

async function request(url, { accept = 'text/html', json = false } = {}) {
  const headers = { Accept: accept, 'User-Agent': userAgent };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`${url} 返回 HTTP ${response.status}`);
    return json ? response.json() : response.text();
  } catch (fetchError) {
    const args = ['--fail', '--location', '--silent', '--show-error', '--max-time', '30', '-A', userAgent, '-H', `Accept: ${accept}`];
    if (process.env.GITHUB_TOKEN) args.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);
    args.push(url);
    try {
      const { stdout } = await execFileAsync('curl', args, { maxBuffer: 5 * 1024 * 1024 });
      return json ? JSON.parse(stdout) : stdout;
    } catch {
      throw fetchError;
    }
  }
}

async function fetchRepository(fullName) {
  return request(`https://api.github.com/repos/${fullName}`, {
    accept: 'application/vnd.github+json',
    json: true,
  }).catch(() => null);
}

export async function buildSnapshot({ html, editorial = {}, now = new Date() }) {
  const parsed = parseTrendingHtml(html);
  if (parsed.length === 0) throw new Error('未从 GitHub Trending 页面解析出任何仓库，拒绝覆盖现有数据');

  const repositories = await Promise.all(parsed.map(async (item) => {
    const details = await fetchRepository(item.fullName).catch(() => null);
    const repo = {
      ...item,
      description: details?.description || item.description,
      language: details?.language || item.language,
      stars: details?.stargazers_count ?? item.stars,
      forks: details?.forks_count ?? item.forks,
      license: details?.license?.spdx_id || null,
      topics: Array.isArray(details?.topics) ? details.topics.slice(0, 8) : [],
      homepage: details?.homepage || null,
      updatedAt: details?.pushed_at || null,
    };

    return { ...repo, chinese: editorial[item.fullName] || metadataEditorial(repo) };
  }));

  return {
    generatedAt: now.toISOString(),
    source: 'https://github.com/trending?since=daily',
    period: 'daily',
    repositories,
  };
}

async function main() {
  const outputIndex = process.argv.indexOf('--output');
  const output = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1]) : defaultOutput;
  const [html, editorialRaw] = await Promise.all([
    request('https://github.com/trending?since=daily'),
    readFile(editorialPath, 'utf8'),
  ]);
  const snapshot = await buildSnapshot({ html, editorial: JSON.parse(editorialRaw) });
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`已写入 ${snapshot.repositories.length} 个项目：${output}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
