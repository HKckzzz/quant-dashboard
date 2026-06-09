/** 格式化金额 */
export function formatMoney(value: number, currency = '$'): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${currency}${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${currency}${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${currency}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return `${currency}${value.toFixed(2)}`;
}

/** 格式化百分比 */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** 格式化涨跌幅（带颜色） */
export function formatChange(value: number): { text: string; className: string } {
  const sign = value > 0 ? '+' : '';
  return {
    text: `${sign}${value.toFixed(2)}%`,
    className: value > 0 ? 'green-text' : value < 0 ? 'red-text' : '',
  };
}

/** 格式化大数字 */
export function formatNumber(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/** 格式化日期 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;

  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 资金动作翻译 */
export function translateAction(action: string): string {
  const map: Record<string, string> = {
    buy: '买入',
    sell: '卖出',
    unknown: '未知',
  };
  return map[action] || action;
}

/** 新闻分类翻译 */
export function translateCategory(cat: string): string {
  const map: Record<string, string> = {
    fed: '美联储',
    tech: '科技',
    macro: '宏观',
    market: '市场',
    general: '综合',
  };
  return map[cat] || cat;
}

/** 情感标签颜色 */
export function sentimentColor(sentiment: string): string {
  const map: Record<string, string> = {
    positive: 'bg-green-500/20 text-green-400',
    negative: 'bg-red-500/20 text-red-400',
    neutral: 'bg-gray-500/20 text-gray-400',
  };
  return map[sentiment] || map.neutral;
}

/** 情感标签文字 */
export function sentimentLabel(sentiment: string): string {
  const map: Record<string, string> = {
    positive: '利多',
    negative: '利空',
    neutral: '中性',
  };
  return map[sentiment] || sentiment;
}
