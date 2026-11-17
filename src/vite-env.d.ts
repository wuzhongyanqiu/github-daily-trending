/// <reference types="vite/client" />

import type { TrendingSnapshot } from './types';

declare global {
  interface Window {
    /** 单文件构建注入的趋势快照，仅在 file:// 下使用 */
    __TRENDING_SNAPSHOT__?: TrendingSnapshot;
  }
}

export {};
