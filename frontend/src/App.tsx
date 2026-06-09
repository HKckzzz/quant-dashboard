import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DailyBrief from './components/DailyBrief';
import Dashboard from './components/Dashboard';
import HKStocks from './components/HKStocks';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import KnowledgeBase from './components/KnowledgeBase';
import HoldingsTable from './components/HoldingsTable';
import NewsPanel from './components/NewsPanel';
import AIAdvisor from './components/AIAdvisor';
import BloggerTracker from './components/BloggerTracker';

function App() {
  const [activeTab, setActiveTab] = useState('daily');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'daily':
        return <DailyBrief />;
      case 'dashboard':
        return <Dashboard />;
      case 'hk':
        return <HKStocks />;
      case 'analysis':
        return <PortfolioAnalysis />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'holdings':
        return <HoldingsTable />;
      case 'news':
        return <NewsPanel />;
      case 'ai':
        return <AIAdvisor />;
      case 'blogger':
        return <BloggerTracker />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* 后端状态提醒 */}
      {backendStatus === 'offline' && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-yellow-400 text-sm">
            后端服务未启动 —— 请运行 <code className="bg-yellow-500/10 px-1.5 py-0.5 rounded text-xs">cd backend && uvicorn main:app --reload</code>
          </span>
        </div>
      )}

      {/* 未配置API Key提醒 */}
      {backendStatus === 'online' && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-blue-400 text-sm">
            后端已连接 | AI功能需配置 <code className="bg-blue-500/10 px-1.5 py-0.5 rounded text-xs">DEEPSEEK_API_KEY</code>（platform.deepseek.com 免费注册）| 基金份额在 <code className="bg-blue-500/10 px-1.5 py-0.5 rounded text-xs">backend/config.py</code> 修改
          </span>
        </div>
      )}

      {renderContent()}
    </Layout>
  );
}

export default App;
