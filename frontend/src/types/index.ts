/* 基金相关 */
export interface Fund {
  id: number;
  code: string;
  name: string;
  ticker: string;
  shares: number;
  cost_basis: number;
  current_price: number;
  change_percent: number;
  market_value: number;
  return_pct: number;
  daily_pnl: number;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  daily_pnl: number;
  total_return_pct: number;
  funds: Fund[];
  updated_at: string;
}

/* 股票持仓 */
export interface StockHolding {
  ticker: string;
  name: string;
  weight: number;
  price: number;
  change: number;
  change_percent: number;
  market_cap: number;
  pe_ratio: number | null;
}

export interface FundHoldings {
  [fundTicker: string]: {
    holdings: StockHolding[];
    updated_at: string;
  };
}

/* 市场指数 */
export interface MarketIndex {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

export interface MarketSummary {
  indices: MarketIndex[];
  updated_at: string;
}

/* 板块表现 */
export interface SectorPerformance {
  ticker: string;
  name: string;
  change_percent: number;
  price: number;
}

/* 新闻 */
export interface NewsItem {
  id: number;
  title: string;
  source: string;
  url: string;
  summary: string;
  sentiment: string;
  category: string;
  published_at: string;
}

/* AI对话 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface QuickQuestion {
  id: number;
  label: string;
  question: string;
}

/* 博主交易 */
export interface BloggerTrade {
  id: number;
  blogger_name: string;
  fund_name: string;
  fund_code: string;
  action: string;
  amount: number;
  reason: string;
  source: string;
  trade_date: string;
  created_at: string;
}

/* 股票历史K线 */
export interface KlineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
