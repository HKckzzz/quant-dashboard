import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';

const R = (v: number) => v >= 0 ? 'text-red-500' : 'text-green-500';
const F = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const FY = (v: number) => `¥${v.toFixed(2)}`;

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function PortfolioAnalysis() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portfolio/analysis')
      .then(r => r.json()).then(setAnalysis)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const a = analysis || {};
  const dist = a.distribution || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 组合分析</h1>
          <p className="text-gray-400 text-sm mt-1">资产配置 + 汇率风险 + 收益汇总</p>
        </div>
      </div>

      {/* 总览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { t: '总资产', v: FY(a.grand_total || 0) },
          { t: 'QDII基金', v: FY(a.fund_total || 0), sub: `${a.fund_count || 0} 只` },
          { t: '港股持仓', v: FY(a.hk_total || 0), sub: `${a.hk_count || 0} 只` },
          { t: '累计盈亏', v: F(a.grand_cumulative_pnl || 0) + '元', c: R(a.grand_cumulative_pnl || 0) },
        ].map((c, i) => (
          <div key={i} className="card flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{c.t}</span>
            <span className={`text-lg font-bold font-mono ${c.c || 'text-white'}`}>{c.v}</span>
            {c.sub && <span className="text-gray-500 text-xs">{c.sub}</span>}
          </div>
        ))}
      </div>

      {/* 饼图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-white font-semibold mb-4">🍩 资产板块分布</h3>
          {dist.length === 0 ? (
            <p className="text-center py-12 text-gray-500">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={dist} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={100}
                  label={({ payload }: any) => `${payload.category}: ¥${payload.value.toFixed(0)}`}>
                  {dist.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff' }}
                  formatter={(v: any) => FY(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 板块占比 */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">📋 板块占比明细</h3>
          <div className="space-y-3">
            {dist.map((d: any, i: number) => {
              const pct = a.grand_total > 0 ? (d.value / a.grand_total * 100) : 0;
              return (
                <div key={d.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-300">{d.category}</span>
                    <span className="text-white font-mono">{FY(d.value)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 汇率风险提醒 */}
      <div className="card border-yellow-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">⚠️ 汇率风险提醒</h3>
            <div className="text-gray-400 text-sm space-y-1 leading-relaxed">
              <p>💱 美元兑人民币: <span className="text-white font-mono font-medium">{a.fx_rate?.usd_cny || 7.25}</span>（{a.fx_rate?.source || '手动设定'}）</p>
              <p>📌 您当前持仓 <span className="text-yellow-400 font-medium">100% 为QDII海外基金</span>，所有资产以美元计价。</p>
              <p>🔻 若人民币升值（美元贬值），您的持仓折算人民币后净值将缩水。</p>
              <p>🔺 若人民币贬值（美元升值），您的持仓折算人民币后净值将增厚。</p>
              <p className="text-gray-500 text-xs mt-2">建议：可适度配置港股通标的对冲汇率风险，或关注美元兑人民币中间价走势。</p>
            </div>
          </div>
        </div>
      </div>

      {/* 当日收益统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-white font-semibold mb-4">💰 收益汇总</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">当日总收益</span>
              <span className={`text-xl font-bold font-mono ${R(a.grand_daily_pnl || 0)}`}>{F(a.grand_daily_pnl || 0)}元</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">累计总收益</span>
              <span className={`text-xl font-bold font-mono ${R(a.grand_cumulative_pnl || 0)}`}>{F(a.grand_cumulative_pnl || 0)}元</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>数据来源</span>
              <span>新浪财经 · 东方财富</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-white font-semibold mb-4">📌 策略特征</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• 全QDII配置：100%投向海外，汇率风险敞口明确</p>
            <p>• 行业集中：芯片+纳斯达克+新能源，缺乏防御板块</p>
            <p>• 混合定投：芯片/纳斯达克日定投，新能源手动加仓</p>
            <p>• 限额约束：3只基金均有限额（1000/500/100元）</p>
          </div>
        </div>
      </div>
    </div>
  );
}
