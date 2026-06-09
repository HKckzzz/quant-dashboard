import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Trash2, Edit3 } from 'lucide-react';

const R = (v: number) => v >= 0 ? 'text-red-500' : 'text-green-500';
const F = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const HK$ = (v: number) => `HK$${v.toFixed(2)}`;

export default function HKStocks() {
  const [stocks, setStocks] = useState<any>(null);
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 添加/编辑表单
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', shares: '0', cost: '0' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = useCallback(async (live: boolean) => {
    if (live) setRefreshing(true); else setLoading(true);
    try {
      const [s, i] = await Promise.all([
        fetch(`/api/portfolio/hk-stocks?live=${live}`).then(r => r.json()),
        fetch('/api/portfolio/hk-indices').then(r => r.json()),
      ]);
      setStocks(s); setIndices(i.indices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(true); }, [loadData]);

  const saveStock = async () => {
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/portfolio/hk-stocks/${editingId}` : '/api/portfolio/hk-stocks';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, shares: parseInt(form.shares) || 0, cost: parseFloat(form.cost) || 0 }),
    });
    setShowAdd(false); setEditingId(null);
    setForm({ code: '', name: '', shares: '0', cost: '0' });
    loadData(true);
  };

  const deleteStock = async (id: number) => {
    await fetch(`/api/portfolio/hk-stocks/${id}`, { method: 'DELETE' });
    loadData(true);
  };

  const openEdit = (s: any) => {
    setForm({ code: s.code, name: s.name, shares: String(s.shares), cost: String(s.cost) });
    setEditingId(s.id);
    setShowAdd(true);
  };

  const sdata = stocks || {};

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">🇭🇰 港股持仓</h1>
          <p className="text-gray-400 text-sm mt-1">
            共 {sdata.count || 0} 只 | 总市值 {HK$(sdata.total_value || 0)} | 盈亏 {F(sdata.total_pnl || 0)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowAdd(true); setEditingId(null); setForm({ code: '', name: '', shares: '0', cost: '0' }); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400 hover:bg-green-500/30">
            <Plus size={14} />添加港股
          </button>
          <button onClick={() => loadData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs text-blue-400 hover:bg-blue-500/30 disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />{refreshing ? '刷新中' : '刷新行情'}
          </button>
        </div>
      </div>

      {/* 恒生指数 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {indices.map((idx: any) => (
          <div key={idx.ticker} className="card flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{idx.name}</span>
            <span className="text-white font-mono text-lg font-semibold">{idx.price ? idx.price.toLocaleString() : '--'}</span>
            <span className={`text-sm font-mono ${R(idx.change_percent || 0)}`}>
              {idx.change_percent ? F(idx.change_percent) + '%' : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* 添加/编辑弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="card w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4">{editingId ? '编辑港股' : '添加港股'}</h3>
            <div className="space-y-3">
              <input placeholder="股票代码（如 00700）" value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                disabled={!!editingId}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 disabled:opacity-50" />
              <input placeholder="股票名称（如 腾讯控股）" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" />
              <input placeholder="持仓股数" type="number" value={form.shares}
                onChange={e => setForm(p => ({ ...p, shares: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" />
              <input placeholder="成本价（港币）" type="number" step="0.01" value={form.cost}
                onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" />
              <div className="flex gap-2">
                <button onClick={saveStock} className="flex-1 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm hover:bg-green-500/30">
                  {editingId ? '保存修改' : '确认添加'}
                </button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-gray-700 rounded-lg text-gray-400 text-sm hover:bg-gray-600">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 港股持仓表 */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">📋 港股通持仓明细</h3>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (sdata.stocks || []).length === 0 ? (
          <p className="text-center py-8 text-gray-500">暂无港股持仓，点击「添加港股」输入持仓数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-3 font-medium">代码</th>
                  <th className="text-left py-3 font-medium">名称</th>
                  <th className="text-right py-3 font-medium">股数</th>
                  <th className="text-right py-3 font-medium">成本价</th>
                  <th className="text-right py-3 font-medium">现价</th>
                  <th className="text-right py-3 font-medium">涨跌幅</th>
                  <th className="text-right py-3 font-medium">持仓市值</th>
                  <th className="text-right py-3 font-medium">盈亏</th>
                  <th className="text-right py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {(sdata.stocks || []).map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                    <td className="py-3 font-mono text-white text-xs">{s.code}</td>
                    <td className="py-3 text-white text-sm">{s.name}</td>
                    <td className="py-3 text-right font-mono text-gray-300">{s.shares}</td>
                    <td className="py-3 text-right font-mono text-gray-400">{HK$(s.cost)}</td>
                    <td className="py-3 text-right font-mono text-white">{s.current_price > 0 ? HK$(s.current_price) : '--'}</td>
                    <td className={`py-3 text-right font-mono ${R(s.change_percent || 0)}`}>{s.change_percent ? F(s.change_percent) + '%' : '--'}</td>
                    <td className="py-3 text-right font-mono text-white">{s.market_value > 0 ? HK$(s.market_value) : '--'}</td>
                    <td className={`py-3 text-right font-mono ${R(s.pnl || 0)}`}>{HK$(s.pnl)}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-1 text-gray-500 hover:text-blue-400"><Edit3 size={12} /></button>
                        <button onClick={() => deleteStock(s.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
