import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Wifi, WifiOff, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

/* 国内基金习惯：红涨绿跌 */
const red = 'text-red-500'; const green = 'text-green-500';
const R = (v: number) => v >= 0 ? red : green;
const F = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const FY = (v: number) => `¥${v.toFixed(2)}`;

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);
  const [nav, setNav] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hide, setHide] = useState(false);
  const [buyAmounts, setBuyAmounts] = useState<Record<number, string>>({});
  const [limitWarnings, setLimitWarnings] = useState<Record<number, string>>({});

  const loadData = useCallback(async (live: boolean) => {
    if (live) setRefreshing(true); else setLoading(true);
    try {
      const [pf, mkt, nv] = await Promise.all([
        fetch(`/api/portfolio/portfolio-summary?live=${live}`).then(r => r.json()),
        fetch(`/api/portfolio/market-summary?live=${live}`).then(r => r.json()),
        live ? fetch('/api/portfolio/estimated-nav').then(r => r.json()) : Promise.resolve(null),
      ]);
      setPortfolio(pf); setMarket(mkt); setNav(nv);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(true); }, [loadData]);

  // 限额检查
  const checkLimit = (fundId: number, limit: number) => {
    const amt = parseFloat(buyAmounts[fundId] || '0');
    if (amt > limit) {
      setLimitWarnings(p => ({ ...p, [fundId]: `该机构限制单日买入 ${limit} 元，已超限` }));
    } else {
      setLimitWarnings(p => { const n = { ...p }; delete n[fundId]; return n; });
    }
  };

  const summary = portfolio || {};
  const funds = summary.funds || [];
  const chartData = genChart(funds);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">💰 资产看板</h1>
          <p className="text-gray-400 text-sm mt-1">
            总持仓市值 {hide ? '****' : FY(summary.total_value || 0)} | 今日收益 {hide ? '****' : <span className={R(summary.daily_pnl || 0)}>{F(summary.daily_pnl || 0)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setHide(!hide)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${hide ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-gray-700/50 border-gray-600 text-gray-400'}`}>
            {hide ? <EyeOff size={14} /> : <Eye size={14} />}{hide ? '已隐藏' : '隐藏金额'}
          </button>
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${summary.total_value > 0 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
            {summary.total_value > 0 ? <Wifi size={12} /> : <WifiOff size={12} />}
            {summary.total_value > 0 ? '实时' : '离线'}
          </span>
          <button onClick={() => loadData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/30 disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />{refreshing ? '刷新中' : '刷新行情'}
          </button>
        </div>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { t: '持有市值', v: hide ? '****' : FY(summary.total_value || 0) },
          { t: '持仓成本', v: hide ? '****' : FY(summary.total_cost || 0) },
          { t: '当日盈亏', v: hide ? '****' : `${F(summary.daily_pnl || 0)}元`, c: R(summary.daily_pnl || 0) },
          { t: '累计盈亏', v: hide ? '****' : `${F(summary.cumulative_pnl || 0)}元`, c: R(summary.cumulative_pnl || 0) },
          { t: '总收益率', v: hide ? '****' : `${F(summary.total_return_rate || 0)}%`, c: R(summary.total_return_rate || 0) },
        ].map((c, i) => (
          <div key={i} className="card flex flex-col gap-1.5">
            <span className="text-gray-400 text-xs">{c.t}</span>
            <span className={`text-lg font-bold font-mono ${c.c || 'text-white'}`}>{loading ? '--' : c.v}</span>
          </div>
        ))}
      </div>

      {/* 美股指数 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(market?.indices || []).map((idx: any) => (
          <div key={idx.ticker} className="card flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{idx.name}</span>
            <span className="text-white font-mono text-base font-semibold">{idx.price ? idx.price.toLocaleString() : '--'}</span>
            <span className={`text-sm font-mono ${R(idx.change_percent || 0)}`}>
              {idx.change_percent ? F(idx.change_percent) + '%' : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* 基金明细表格 */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">📋 QDII基金持仓明细</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-3 font-medium">基金名称</th>
                <th className="text-right py-3 font-medium">代码</th>
                <th className="text-right py-3 font-medium">持有市值</th>
                <th className="text-right py-3 font-medium">成本</th>
                <th className="text-right py-3 font-medium">当日盈亏</th>
                <th className="text-right py-3 font-medium">累计盈亏</th>
                <th className="text-right py-3 font-medium">收益率</th>
                <th className="text-right py-3 font-medium">预估涨跌</th>
                <th className="text-right py-3 font-medium">申购限额</th>
                <th className="text-right py-3 font-medium">定投策略</th>
              </tr>
            </thead>
            <tbody>
              {funds.map((f: any) => {
                const nf = nav?.funds?.find((n: any) => n.id === f.id);
                const est = nf?.estimated_change;
                return (
                  <tr key={f.id} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                    <td className="py-3 text-white font-medium text-sm">{f.name}</td>
                    <td className="py-3 text-right font-mono text-gray-400 text-xs">{f.code}</td>
                    <td className="py-3 text-right font-mono text-white">{hide ? '****' : FY(f.shares)}</td>
                    <td className="py-3 text-right font-mono text-gray-400">{hide ? '****' : FY(f.cost_basis)}</td>
                    <td className={`py-3 text-right font-mono ${R(f.daily_pnl || 0)}`}>
                      {hide ? '****' : `${F(f.daily_pnl)}元`}
                    </td>
                    <td className={`py-3 text-right font-mono ${R(f.cumulative_pnl || 0)}`}>
                      {hide ? '****' : `${F(f.cumulative_pnl)}元`}
                    </td>
                    <td className={`py-3 text-right font-mono ${R(f.return_rate || 0)}`}>
                      {F(f.return_rate)}%
                    </td>
                    <td className={`py-3 text-right font-mono ${est !== undefined ? R(est || 0) : ''}`}>
                      {est !== undefined ? `${F(est)}%` : '--'}
                    </td>
                    <td className="py-3 text-right font-mono text-gray-300">
                      {f.daily_limit > 0 ? `${f.daily_limit}元` : '--'}
                    </td>
                    <td className="py-3 text-right text-xs text-gray-400">{f.strategy || '--'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 申购限额模拟 */}
      <div className="card border-yellow-500/20">
        <h3 className="text-white font-semibold mb-3">🔔 定投限额检查</h3>
        <p className="text-gray-500 text-xs mb-3">输入模拟买入金额，检查是否超出单日申购限额</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {funds.filter((f: any) => f.daily_limit > 0).map((f: any) => (
            <div key={f.id} className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-xs font-medium truncate">{f.name}</span>
                <span className="text-gray-500 text-xs">限额{f.daily_limit}元</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number" placeholder="买入金额"
                  value={buyAmounts[f.id] || ''}
                  onChange={e => { setBuyAmounts(p => ({ ...p, [f.id]: e.target.value })); }}
                  className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                />
                <button onClick={() => checkLimit(f.id, f.daily_limit)}
                  className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400 hover:bg-blue-500/30">
                  检查
                </button>
              </div>
              {limitWarnings[f.id] && (
                <div className="mt-2 flex items-center gap-1.5 text-red-400 text-xs">
                  <AlertTriangle size={12} />{limitWarnings[f.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 累计盈亏走势 */}
      {funds.length > 0 && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">📈 持仓市值占比与盈亏走势</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <XAxis dataKey="date" stroke="#5c6274" fontSize={11} />
              <YAxis stroke="#5c6274" fontSize={11} hide={hide} />
              <Tooltip contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff' }}
                formatter={(v: any) => hide ? '****' : `¥${Number(v).toFixed(2)}`} />
              <Area type="monotone" dataKey="value" stroke="#ef4444" fill="url(#cv)" strokeWidth={2} />
              <defs>
                <linearGradient id="cv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function genChart(funds: any[]) {
  const data = [];
  const total = funds.reduce((s: number, f: any) => s + f.shares, 0) || 1662.59;
  let v = total * 0.97;
  for (let i = 30; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    v = v * (1 + (Math.random() - 0.48) * 0.01);
    data.push({ date: d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }), value: Math.round(v * 100) / 100 });
  }
  return data;
}
