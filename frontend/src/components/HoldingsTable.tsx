import { useState } from 'react';
import { useHoldings } from '../hooks/useApi';
import { formatChange, formatNumber } from '../utils/format';
import { Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const COLORS = ['#448aff', '#00c853', '#ffab00', '#ff3d57', '#7c4dff', '#00bcd4', '#ff6e40', '#69f0ae', '#ff4081', '#b388ff'];

export default function HoldingsTable() {
  const { data: holdings, loading } = useHoldings();
  const [selectedFund, setSelectedFund] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!holdings || Object.keys(holdings).length === 0) {
    return (
      <div className="card text-center py-16">
        <Info size={40} className="mx-auto text-[#5c6274] mb-3" />
        <p className="text-[#9aa0b0]">暂无持仓数据</p>
        <p className="text-[#5c6274] text-sm mt-1">请在 config.py 中配置 FUND_HOLDINGS</p>
      </div>
    );
  }

  const fundTickers = Object.keys(holdings);
  const currentFund = selectedFund || fundTickers[0];
  const currentHoldings = holdings[currentFund]?.holdings || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">底层持仓明细</h1>
          <p className="text-[#9aa0b0] text-sm mt-1">基金重仓股实时行情（数据来源：新浪财经）</p>
        </div>
      </div>

      {/* 基金选择Tab */}
      <div className="flex gap-2 flex-wrap">
        {fundTickers.map((ticker) => (
          <button
            key={ticker}
            onClick={() => setSelectedFund(ticker)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentFund === ticker
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-[#1e2130] text-[#9aa0b0] border border-[#2a2d3a] hover:text-white'
            }`}
          >
            {ticker}
          </button>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 持仓权重柱状图 */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">持仓权重分布</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={currentHoldings} layout="vertical">
              <XAxis type="number" stroke="#5c6274" fontSize={11} />
              <YAxis dataKey="ticker" type="category" stroke="#5c6274" fontSize={11} width={50} />
              <Tooltip
                contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff' }}
                formatter={(value: any) => [`${value}%`, '权重']}
              />
              <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                {currentHoldings.map((_: any, idx: number) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 持仓饼图 */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">行业分布（估算）</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={currentHoldings}
                dataKey="weight"
                nameKey="ticker"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ payload }: any) => `${payload.ticker} ${payload.weight}%`}
                labelLine={{ stroke: '#5c6274' }}
              >
                {currentHoldings.map((_: any, idx: number) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 持仓表格 */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">
          {currentFund} 前十大重仓股
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#9aa0b0] border-b border-[#2a2d3a]">
                <th className="text-left py-3 font-medium">代码</th>
                <th className="text-left py-3 font-medium">公司名称</th>
                <th className="text-right py-3 font-medium">权重占比</th>
                <th className="text-right py-3 font-medium">最新价</th>
                <th className="text-right py-3 font-medium">涨跌幅</th>
                <th className="text-right py-3 font-medium">总市值</th>
                <th className="text-right py-3 font-medium">市盈率</th>
              </tr>
            </thead>
            <tbody>
              {currentHoldings.map((h: any) => {
                const change = formatChange(h.change_percent || 0);
                return (
                  <tr key={h.ticker} className="border-b border-[#2a2d3a] hover:bg-[#252836] transition-colors">
                    <td className="py-3">
                      <span className="text-white font-mono font-medium">{h.ticker}</span>
                    </td>
                    <td className="py-3 text-[#e8eaed]">{h.name}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(h.weight * 8, 100)}%` }}
                          />
                        </div>
                        <span className="text-white font-mono text-xs">{h.weight}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono text-white">
                      ${h.price?.toFixed(2) || '--'}
                    </td>
                    <td className={`py-3 text-right font-mono ${change.className}`}>
                      {change.text}
                    </td>
                    <td className="py-3 text-right font-mono text-[#9aa0b0]">
                      {formatNumber(h.market_cap || 0)}
                    </td>
                    <td className="py-3 text-right font-mono text-[#9aa0b0]">
                      {h.pe_ratio?.toFixed(1) || '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
