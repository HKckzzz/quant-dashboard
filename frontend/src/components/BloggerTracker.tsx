import { useState } from 'react';
import { useBloggerTrades } from '../hooks/useApi';
import { formatDate, translateAction, formatMoney } from '../utils/format';
import { User, ArrowUpRight, ArrowDownRight, Plus, Trash2, Upload, Globe } from 'lucide-react';
import ScreenshotUpload from './ScreenshotUpload';

export default function BloggerTracker() {
  const { data: trades, loading, refetch } = useBloggerTrades(50);
  const [showUpload, setShowUpload] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    fund_name: '',
    fund_code: '',
    action: 'sell',
    amount: '',
    reason: '',
    trade_date: '',
  });

  const addManualTrade = async () => {
    try {
      const res = await fetch('/api/blogger/trades/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          amount: parseFloat(manualForm.amount) || 0,
        }),
      });
      if (res.ok) {
        setManualForm({ fund_name: '', fund_code: '', action: 'sell', amount: '', reason: '', trade_date: '' });
        setShowManual(false);
        refetch();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTrade = async (id: number) => {
    try {
      await fetch(`/api/blogger/trades/${id}`, { method: 'DELETE' });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const tryScrape = async () => {
    try {
      const res = await fetch('/api/blogger/scrape');
      const data = await res.json();
      alert(`爬取结果: ${JSON.stringify(data.results, null, 2)}\n\n${data.note}`);
    } catch (e) {
      console.error(e);
    }
  };

  // 统计
  const sellTrades = trades.filter((t: any) => t.action === 'sell');
  const buyTrades = trades.filter((t: any) => t.action === 'buy');
  const totalSellAmount = sellTrades.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User size={22} className="text-yellow-400" />
            博主实盘跟踪
          </h1>
          <p className="text-[#9aa0b0] text-sm mt-1">
            跟踪「门前有棵树」的支付宝实盘操作
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={tryScrape}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e2130] border border-[#2a2d3a] rounded-lg text-xs text-[#9aa0b0] hover:text-white transition-colors"
          >
            <Globe size={14} />
            尝试爬取
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            <Upload size={14} />
            上传截图
          </button>
          <button
            onClick={() => setShowManual(!showManual)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400 hover:bg-green-500/30 transition-colors"
          >
            <Plus size={14} />
            手动录入
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-green-500/20">
          <span className="text-[#9aa0b0] text-xs">博主买入次数</span>
          <div className="flex items-center gap-2 mt-1">
            <ArrowUpRight size={18} className="text-green-400" />
            <span className="text-xl font-bold text-white">{buyTrades.length}</span>
          </div>
        </div>
        <div className="card border-red-500/20">
          <span className="text-[#9aa0b0] text-xs">博主卖出次数</span>
          <div className="flex items-center gap-2 mt-1">
            <ArrowDownRight size={18} className="text-red-400" />
            <span className="text-xl font-bold text-white">{sellTrades.length}</span>
          </div>
        </div>
        <div className="card border-yellow-500/20">
          <span className="text-[#9aa0b0] text-xs">累计卖出金额</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-white">
              {formatMoney(totalSellAmount, '¥')}
            </span>
          </div>
        </div>
      </div>

      {/* 截图上传区 */}
      {showUpload && (
        <ScreenshotUpload
          onComplete={() => {
            refetch();
            setShowUpload(false);
          }}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* 手动录入表单 */}
      {showManual && (
        <div className="card border-green-500/20">
          <h3 className="text-white font-semibold mb-4">手动录入博主交易</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              placeholder="基金名称 *"
              value={manualForm.fund_name}
              onChange={e => setManualForm(p => ({ ...p, fund_name: e.target.value }))}
              className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5c6274] focus:outline-none focus:border-green-500/50"
            />
            <select
              value={manualForm.action}
              onChange={e => setManualForm(p => ({ ...p, action: e.target.value }))}
              className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              <option value="sell">卖出</option>
              <option value="buy">买入</option>
            </select>
            <input
              placeholder="金额 *"
              type="number"
              value={manualForm.amount}
              onChange={e => setManualForm(p => ({ ...p, amount: e.target.value }))}
              className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5c6274] focus:outline-none focus:border-green-500/50"
            />
            <input
              placeholder="备注/原因"
              value={manualForm.reason}
              onChange={e => setManualForm(p => ({ ...p, reason: e.target.value }))}
              className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5c6274] focus:outline-none focus:border-green-500/50"
            />
            <input
              placeholder="交易日期 (可选)"
              type="date"
              value={manualForm.trade_date}
              onChange={e => setManualForm(p => ({ ...p, trade_date: e.target.value }))}
              className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#5c6274] focus:outline-none focus:border-green-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={addManualTrade}
                className="flex-1 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-sm text-green-400 hover:bg-green-500/30 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setShowManual(false)}
                className="px-4 py-2 bg-[#1e2130] border border-[#2a2d3a] rounded-lg text-sm text-[#9aa0b0] hover:text-white transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 交易记录列表 */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">交易记录</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-12">
            <User size={40} className="mx-auto text-[#5c6274] mb-3" />
            <p className="text-[#9aa0b0]">暂无博主交易记录</p>
            <p className="text-[#5c6274] text-sm mt-1">
              上传截图、手动录入或尝试爬取来获取数据
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map((trade: any) => (
              <div
                key={trade.id}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                  trade.action === 'sell'
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-green-500/5 border-green-500/20'
                }`}
              >
                {/* 操作图标 */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    trade.action === 'sell'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {trade.action === 'sell' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                </div>

                {/* 交易信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{trade.fund_name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        trade.action === 'sell'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {translateAction(trade.action)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#2a2d3a] text-[#9aa0b0]">
                      {trade.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-mono text-white">
                      ¥{trade.amount?.toLocaleString() || 0}
                    </span>
                    {trade.reason && (
                      <span className="text-xs text-[#9aa0b0] truncate">{trade.reason}</span>
                    )}
                    <span className="text-xs text-[#5c6274]">
                      {formatDate(trade.trade_date || trade.created_at)}
                    </span>
                  </div>
                </div>

                {/* 删除 */}
                <button
                  onClick={() => deleteTrade(trade.id)}
                  className="p-1.5 text-[#5c6274] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
