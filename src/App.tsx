import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenText,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  Flame,
  GitFork,
  Github,
  Search,
  ShieldCheck,
  Star,
  Users,
  X,
} from 'lucide-react';
import type { EditorialStatus, TrendingSnapshot, TrendRepository } from './types';

const statusLabels: Record<EditorialStatus, string> = {
  reviewed: '人工编审',
  draft: 'AI 草稿',
  metadata: '元数据整理',
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function DetailPanel({ repo, onClose }: { repo: TrendRepository; onClose: () => void }) {
  return (
    <aside className="detail-panel" aria-label={`${repo.fullName} 中文详情`}>
      <div className="detail-heading">
        <div>
          <span className={`editorial-status status-${repo.chinese.status}`}>
            {repo.chinese.status === 'reviewed' ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
            {statusLabels[repo.chinese.status]}
          </span>
          <h2>{repo.chinese.title}</h2>
          <a href={repo.url} target="_blank" rel="noreferrer">{repo.fullName}<ExternalLink size={13} /></a>
        </div>
        <button className="icon-button close-detail" type="button" aria-label="关闭详情" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="fact-strip" aria-label="项目数据">
        <div><strong>#{repo.rank}</strong><span>今日排名</span></div>
        <div><strong>+{formatNumber(repo.starsToday)}</strong><span>今日 Star</span></div>
        <div><strong>{formatNumber(repo.stars)}</strong><span>累计 Star</span></div>
        <div><strong>{formatNumber(repo.forks)}</strong><span>Fork</span></div>
      </div>

      <section className="summary-section">
        <h3><BookOpenText size={17} />项目是什么</h3>
        <p>{repo.chinese.summary}</p>
        <div className="original-description">
          <span>GitHub 原始简介</span>
          <p>{repo.description || '仓库暂未提供英文简介。'}</p>
        </div>
      </section>

      <section>
        <h3><Flame size={17} />值得关注的地方</h3>
        <ul className="check-list">
          {repo.chinese.highlights.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}
        </ul>
      </section>

      <section className="two-column-detail">
        <div>
          <h3><Users size={17} />适合谁</h3>
          <p>{repo.chinese.audience}</p>
        </div>
        <div>
          <h3><ArrowUpRight size={17} />可以怎么用</h3>
          <ul>{repo.chinese.useCases.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>

      <section>
        <h3><ShieldCheck size={17} />采用前先看</h3>
        <div className="caution"><AlertTriangle size={17} /><p>{repo.chinese.caution}</p></div>
      </section>

      <section>
        <h3>技术与许可</h3>
        <dl className="metadata-grid">
          <div><dt>主要语言</dt><dd>{repo.language || '未识别'}</dd></div>
          <div><dt>许可证</dt><dd>{repo.license === 'NOASSERTION' || !repo.license ? '需进一步核验' : repo.license}</dd></div>
          <div><dt>最近推送</dt><dd>{repo.updatedAt ? formatDate(repo.updatedAt) : '暂无数据'}</dd></div>
          <div><dt>中文状态</dt><dd>{statusLabels[repo.chinese.status]}</dd></div>
        </dl>
        {repo.topics.length > 0 && <div className="topics">{repo.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>}
      </section>

      <div className="detail-actions">
        <a className="primary-action" href={repo.url} target="_blank" rel="noreferrer"><Github size={17} />查看 GitHub 仓库<ExternalLink size={15} /></a>
        {repo.homepage && <a className="secondary-action" href={repo.homepage} target="_blank" rel="noreferrer">项目主页<ExternalLink size={15} /></a>}
      </div>
    </aside>
  );
}

function App() {
  const [snapshot, setSnapshot] = useState<TrendingSnapshot | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('全部语言');
  const [sort, setSort] = useState<'rank' | 'stars'>('rank');
  const [selectedName, setSelectedName] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/trending.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: TrendingSnapshot) => {
        setSnapshot(data);
        setSelectedName(window.matchMedia('(min-width: 721px)').matches ? data.repositories[0]?.fullName || '' : '');
      })
      .catch(() => setError('趋势数据加载失败，请确认 public/data/trending.json 已生成。'));
  }, []);

  const languages = useMemo(() => {
    if (!snapshot) return [];
    return [...new Set(snapshot.repositories.map((repo) => repo.language).filter(Boolean) as string[])].sort();
  }, [snapshot]);

  const repositories = useMemo(() => {
    if (!snapshot) return [];
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    return snapshot.repositories
      .filter((repo) => language === '全部语言' || repo.language === language)
      .filter((repo) => !normalized || [repo.fullName, repo.description, repo.chinese.title, repo.chinese.summary, ...repo.topics]
        .join(' ').toLocaleLowerCase('zh-CN').includes(normalized))
      .sort((a, b) => sort === 'rank' ? a.rank - b.rank : b.starsToday - a.starsToday);
  }, [snapshot, query, language, sort]);

  const selected = selectedName ? snapshot?.repositories.find((repo) => repo.fullName === selectedName) || null : null;
  const totalStarsToday = snapshot?.repositories.reduce((sum, repo) => sum + repo.starsToday, 0) || 0;
  const reviewedCount = snapshot?.repositories.filter((repo) => repo.chinese.status === 'reviewed').length || 0;

  if (error) return <main className="state-page"><AlertTriangle size={28} /><h1>无法打开看板</h1><p>{error}</p></main>;
  if (!snapshot) return <main className="state-page"><Github size={28} /><h1>正在载入今日趋势</h1></main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Github size={22} /></span><div><strong>GitHub 每日趋势观察</strong><small>Daily Trending · 中文编审</small></div></div>
        <div className="source-state"><span><span className="live-dot" />数据快照 {formatDate(snapshot.generatedAt)}</span><a href={snapshot.source} target="_blank" rel="noreferrer">GitHub Trending<ExternalLink size={13} /></a></div>
      </header>

      <main>
        <section className="overview-band">
          <div><span className="eyebrow">TODAY'S OPEN SOURCE SIGNAL</span><h1>今天，开发者在关注什么？</h1><p>把 GitHub 热门榜从英文项目列表，整理成可快速判断价值、用途与采用风险的中文技术观察。</p></div>
          <dl>
            <div><dt>{snapshot.repositories.length}</dt><dd>上榜项目</dd></div>
            <div><dt>+{formatNumber(totalStarsToday)}</dt><dd>今日新增 Star</dd></div>
            <div><dt>{languages.length}</dt><dd>主要语言</dd></div>
            <div><dt>{reviewedCount}</dt><dd>人工编审</dd></div>
          </dl>
        </section>

        <section className="control-band" aria-label="筛选趋势项目">
          <label className="search-control"><Search size={18} /><span className="sr-only">搜索项目</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、用途或技术关键词" />{query && <button type="button" onClick={() => setQuery('')} aria-label="清空搜索"><X size={16} /></button>}</label>
          <label className="select-control"><Filter size={16} /><span className="sr-only">按语言筛选</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>全部语言</option>{languages.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="segmented" aria-label="排序方式">
            <button type="button" className={sort === 'rank' ? 'active' : ''} aria-pressed={sort === 'rank'} onClick={() => setSort('rank')}>榜单顺序</button>
            <button type="button" className={sort === 'stars' ? 'active' : ''} aria-pressed={sort === 'stars'} onClick={() => setSort('stars')}>今日增速</button>
          </div>
          <span className="result-count">{repositories.length} 个结果</span>
        </section>

        <section className="workspace">
          <div className="ranking-panel">
            <div className="ranking-head"><span>排名 / 项目</span><span>语言</span><span>今日</span><span></span></div>
            <div className="ranking-list">
              {repositories.map((repo) => (
                <button type="button" className={`repo-row ${selected?.fullName === repo.fullName ? 'selected' : ''}`} key={repo.fullName} onClick={() => setSelectedName(repo.fullName)}>
                  <span className="rank-number">{String(repo.rank).padStart(2, '0')}</span>
                  <span className="repo-identity"><strong>{repo.chinese.title}</strong><small>{repo.fullName}</small><span>{repo.chinese.summary}</span></span>
                  <span className="language-cell"><i />{repo.language || '未知'}</span>
                  <span className="growth-cell"><Star size={14} />+{formatNumber(repo.starsToday)}</span>
                  <ChevronRight size={17} />
                </button>
              ))}
              {repositories.length === 0 && <div className="empty-results"><Search size={24} /><strong>没有匹配的项目</strong><span>换一个关键词或语言试试。</span></div>}
            </div>
          </div>
          {selected && <DetailPanel repo={selected} onClose={() => setSelectedName('')} />}
        </section>
      </main>

      <footer><span>数据来自 GitHub Trending 与公开仓库元数据</span><span><Star size={13} />Star 为快照值，不代表质量背书</span><span><GitFork size={13} />采用前请核验许可证与维护状态</span></footer>
    </div>
  );
}

export default App;
