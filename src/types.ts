export type EditorialStatus = 'reviewed' | 'draft' | 'metadata';

export interface TrendRepository {
  rank: number;
  fullName: string;
  owner: string;
  name: string;
  url: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  starsToday: number;
  license: string | null;
  topics: string[];
  homepage: string | null;
  updatedAt: string | null;
  metadataStatus?: 'fresh' | 'stale' | 'unavailable';
  metadataCheckedAt?: string | null;
  chinese: {
    title: string;
    summary: string;
    highlights: string[];
    useCases: string[];
    audience: string;
    caution: string;
    status: EditorialStatus;
    commit?: string;
    researchedAt?: string;
    workflow?: string[];
    implementation?: string;
    sources?: { label: string; url: string }[];
  };
}

export interface TrendingSnapshot {
  generatedAt: string;
  source: string;
  period: 'daily';
  status?: 'success' | 'partial';
  coverage?: {
    researched: number;
    pendingResearch: string[];
    metadataFailures: string[];
  };
  repositories: TrendRepository[];
}
