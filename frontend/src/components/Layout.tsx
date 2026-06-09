import { useState } from 'react';
import {
  LayoutDashboard, Newspaper, Bot, Users, ChevronLeft, ChevronRight, TrendingUp, Globe, PieChart, BookOpen, Lightbulb
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'daily', label: '每日助手', icon: Lightbulb },
  { id: 'dashboard', label: '资产看板', icon: LayoutDashboard },
  { id: 'hk', label: '港股持仓', icon: Globe },
  { id: 'analysis', label: '组合分析', icon: PieChart },
  { id: 'knowledge', label: '知识库', icon: BookOpen },
  { id: 'holdings', label: '底层持仓', icon: TrendingUp },
  { id: 'news', label: '市场新闻', icon: Newspaper },
  { id: 'ai', label: 'AI顾问', icon: Bot },
  { id: 'blogger', label: '博主跟踪', icon: Users },
];

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#0f1117]">
      {/* 侧边栏 */}
      <aside
        className={`flex flex-col bg-[#1a1d28] border-r border-[#2a2d3a] transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2a2d3a]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            Q
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-white whitespace-nowrap">
              量化仪表盘
            </span>
          )}
        </div>

        {/* 导航 */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-[#9aa0b0] hover:bg-[#252836] hover:text-white'
                }`}
              >
                <Icon size={18} />
                {!collapsed && <span>{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center py-3 border-t border-[#2a2d3a] text-[#5c6274] hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
