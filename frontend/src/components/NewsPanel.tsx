import { useState, useEffect } from 'react';
import { useNews } from '../hooks/useApi';
import { formatDate, sentimentColor, sentimentLabel, translateCategory } from '../utils/format';
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

export default function NewsPanel() {
  const { data: news, loading, refetch } = useNews(40);
  const [filter, setFilter] = useState<string>('all');
  const [dailySummary, setDailySummary] = useState<string>('');
  const [marketReason, setMarketReason] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const categories = ['all', 'market', 'fed', 'tech', 'macro', 'general'];

  const filteredNews = filter === 'all' ? news : news.filter((n: any) => n.category === filter);

  const fetchSummary = async (type: 'summary' | 'reason') => {
    setSummaryLoading(true);
    try {
      const endpoint = type === 'summary' ? '/api/news/daily-summary' : '/api/news/market-reason';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (type === 'summary') {
        setDailySummary(data.summary || '');
      } else {
        setMarketReason(data.reason || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary('reason');
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">市场新闻</h1>
          <p className="text-[#9aa0b0] text-sm mt-1">美股重要资讯聚合 + AI摘要</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e2130] border border-[#2a2d3a] rounded-lg text-sm text-[#9aa0b0] hover:text-white transition-colors"
        >
          <RefreshCw size={14} />
          刷新新闻
        </button>
      </div>

      {/* AI分析卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 涨跌原因 */}
        <div className="card border-blue-500/20">
          <div className="flex items-center gap-2 mb-3">
            {marketReason ? (
              <TrendingUp size={18} className="text-blue-400" />
            ) : (
              <TrendingDown size={18} className="text-blue-400" />
            )}
            <h3 className="text-white font-semibold text-sm">
              📈📉 AI分析：美股涨跌原因
            </h3>
            <button
              onClick={() => fetchSummary('reason')}
              disabled={summaryLoading}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-400 hover:bg-blue-500/10 transition-colors"
            >
              <Sparkles size={12} />
              刷新
            </button>
          </div>
          {marketReason ? (
            <div className="text-sm text-[#9aa0b0] leading-relaxed whitespace-pre-line">
              {marketReason}
            </div>
          ) : (
            <p className="text-sm text-[#5c6274]">
              点击刷新按钮，AI将分析当前市场涨跌原因
            </p>
          )}
        </div>

        {/* 每日摘要 */}
        <div className="card border-purple-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-purple-400" />
            <h3 className="text-white font-semibold text-sm">
              🤖 AI每日市场摘要
            </h3>
            <button
              onClick={() => fetchSummary('summary')}
              disabled={summaryLoading}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs text-purple-400 hover:bg-purple-500/10 transition-colors"
            >
              <Sparkles size={12} />
              生成
            </button>
          </div>
          {dailySummary ? (
            <div className="text-sm text-[#9aa0b0] leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">
              {dailySummary}
            </div>
          ) : (
            <p className="text-sm text-[#5c6274]">
              点击生成按钮，AI将结合当前持仓生成市场摘要
            </p>
          )}
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === cat
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-[#1e2130] text-[#9aa0b0] border border-[#2a2d3a] hover:text-white'
            }`}
          >
            {cat === 'all' ? '全部' : translateCategory(cat)}
          </button>
        ))}
      </div>

      {/* 新闻列表 */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-[#9aa0b0]">暂无新闻数据</p>
            <p className="text-[#5c6274] text-sm mt-1">点击"刷新新闻"拉取最新资讯</p>
          </div>
        ) : (
          filteredNews.map((item: any) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-start gap-4 hover:border-[#448aff]/50 transition-all cursor-pointer block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sentimentColor(item.sentiment)}`}>
                    {sentimentLabel(item.sentiment)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#2a2d3a] text-[#9aa0b0]">
                    {translateCategory(item.category)}
                  </span>
                  <span className="text-[#5c6274] text-xs">{item.source}</span>
                </div>
                <h4 className="text-white text-sm font-medium leading-snug mb-1 line-clamp-2">
                  {item.title}
                </h4>
                {item.summary && (
                  <p className="text-[#9aa0b0] text-xs leading-relaxed line-clamp-2">
                    {item.summary}
                  </p>
                )}
                <span className="text-[#5c6274] text-xs mt-2 inline-block">
                  {formatDate(item.published_at)}
                </span>
              </div>
              <ExternalLink size={14} className="text-[#5c6274] flex-shrink-0 mt-1" />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
