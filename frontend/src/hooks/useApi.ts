import { useState, useEffect, useCallback } from 'react';

const BASE_URL = '/api';
const FETCH_TIMEOUT = 8000; // 8秒前端超时

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(`${BASE_URL}${url}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 获取组合概览 */
export function usePortfolioSummary() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchJson('/portfolio/portfolio-summary');
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

/** 获取市场概况 */
export function useMarketSummary() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson('/portfolio/market-summary')
      .then(setData)
      .catch(() => setData({ indices: [] }))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

/** 获取板块表现 */
export function useSectorPerformance() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<any[]>('/portfolio/sector-performance')
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

/** 获取底层持仓 */
export function useHoldings() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson('/portfolio/holdings')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

/** 获取最新新闻 */
export function useNews(limit = 30) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchJson<any[]>(`/news/latest?limit=${limit}`);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

/** 获取博主交易 */
export function useBloggerTrades(limit = 50) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchJson<any[]>(`/blogger/trades?limit=${limit}`);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}
