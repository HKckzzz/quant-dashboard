import { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Info, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

export default function DailyBrief() {
  const [brief, setBrief] = useState<any>(null);
  const [fundExplains, setFundExplains] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [expandedFund, setExpandedFund] = useState<number | null>(null);
  const [explainLoading, setExplainLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch('/api/assistant/daily-brief')
      .then(r => r.json()).then(setBrief)
      .finally(() => setLoading(false));
  }, []);

  const explainFund = async (fundId: number) => {
    if (expandedFund === fundId) { setExpandedFund(null); return; }
    setExpandedFund(fundId);
    if (fundExplains[fundId]) return;
    setExplainLoading(p => ({ ...p, [fundId]: true }));
    try {
      const r = await fetch(`/api/assistant/explain-fund/${fundId}`);
      const d = await r.json();
      setFundExplains(p => ({ ...p, [fundId]: d }));
    } finally {
      setExplainLoading(p => ({ ...p, [fundId]: false }));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const b = brief || {};

  // 日期格式化
  const today = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 星期${weekdays[today.getDay()]}`;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 日期 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">📋 每日投资助手</h1>
          <p className="text-gray-400 text-sm mt-1">{dateStr} | 总市值 ¥{b.summary?.total_value?.toFixed(2) || '--'}</p>
        </div>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/30">
          <RefreshCw size={14} />刷新建议
        </button>
      </div>

      {/* 核心建议区 */}
      <div className="card border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
          {b.brief || '加载中...'}
        </div>
      </div>

      {/* 三只基金快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: '芯片基金', desc: '创金合信芯片', color: 'blue' },
          { name: '新能源基金', desc: '长城新能源', color: 'green' },
          { name: '纳斯达克基金', desc: '摩根纳斯达克', color: 'purple' },
        ].map((label, i) => {
          const fid = i + 1;
          const explain = fundExplains[fid];
          return (
            <div key={fid} className="card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-white font-medium text-sm">{label.name}</h3>
                  <p className="text-gray-500 text-xs">{label.desc}</p>
                </div>
              </div>
              <button
                onClick={() => explainFund(fid)}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Info size={12} />
                  点我看今日涨跌原因
                </span>
                {expandedFund === fid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {/* 展开的解释 */}
              {expandedFund === fid && (
                <div className="mt-3 p-3 rounded-lg bg-gray-800/80 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {explainLoading[fid] ? (
                    <div className="flex items-center gap-2 text-gray-500 py-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      AI分析中...
                    </div>
                  ) : explain ? (
                    explain.explanation
                  ) : (
                    <span className="text-gray-500">加载失败</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 经济日历 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-yellow-400" />
          <h3 className="text-white font-semibold">📅 近期重大事件</h3>
        </div>
        {(b.events || []).length === 0 ? (
          <p className="text-gray-500 text-sm">未来7天无预定重大事件</p>
        ) : (
          <div className="space-y-3">
            {b.events.map((evt: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  evt.importance === '最高' ? 'bg-red-500' : evt.importance === '极高' ? 'bg-orange-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{evt.event}</span>
                    <span className="text-gray-500 text-xs">({evt.name_en})</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      evt.importance === '最高' ? 'bg-red-500/20 text-red-400' :
                      evt.importance === '极高' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{evt.importance}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{evt.affects}</p>
                  <p className="text-gray-500 text-xs mt-1">📌 {evt.action}</p>
                  {evt.next_date && <p className="text-gray-500 text-xs mt-1">⏰ 下次时间：{evt.next_date}</p>}
                  {evt.days_left !== undefined && evt.days_left >= 0 && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                      evt.days_left <= 1 ? 'bg-red-500/10 text-red-400' :
                      evt.days_left <= 3 ? 'bg-orange-500/10 text-orange-400' :
                      'bg-gray-700/50 text-gray-400'
                    }`}>还有{evt.days_left}天</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 汇率提示 */}
      {b.fx_rate && (
        <div className="card border-yellow-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign size={20} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">💱 汇率：美元兑人民币 {b.fx_rate.usd_cny}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                当前人民币汇率为 {b.fx_rate.usd_cny}，你的三支QDII基金全部以美元计价。
                {b.fx_rate.usd_cny > 7.2
                  ? '人民币偏弱，你的持仓折算后获得汇率加成。若人民币升值至7.0以下，持仓净值将缩水约3%。'
                  : '人民币偏强，你的持仓面临汇率损失风险。'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
