import { useState, useEffect } from 'react';
import { Search, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';

const CATEGORIES: Record<string, string> = {
  '宏观经济': '🌍', '汇率': '💱', '基金知识': '📚', '市场指数': '📈', '持仓相关': '💼', '市场知识': '🧠',
};

export default function KnowledgeBase() {
  const [terms, setTerms] = useState<any[]>([]);
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch('/api/assistant/knowledge/terms')
      .then(r => r.json())
      .then(d => setTerms(d.terms || []))
      .finally(() => setLoading(false));
  }, []);

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/assistant/knowledge/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults(d.results || []);
    } finally { setSearching(false); }
  };

  const openTerm = (term: any) => {
    fetch(`/api/assistant/knowledge/term/${term.id}`)
      .then(r => r.json())
      .then(setCurrentTerm);
  };

  // 分类分组
  const grouped: Record<string, any[]> = {};
  (search ? results : terms).forEach((t: any) => {
    const c = t.category || '其他';
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(t);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen size={22} className="text-yellow-400" />
            金融知识库
          </h1>
          <p className="text-gray-400 text-sm mt-1">可搜索的中文金融词典 · 所有解释关联你的持仓</p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text" value={search}
          onChange={e => doSearch(e.target.value)}
          placeholder="搜索金融概念...（如：非农数据、CPI、QDII、定投）"
          className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500/50 placeholder-gray-500"
        />
        {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* 详情页 */}
      {currentTerm ? (
        <div className="card">
          <button onClick={() => setCurrentTerm(null)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft size={14} /> 返回列表
          </button>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400">{CATEGORIES[currentTerm.category] || ''} {currentTerm.category}</span>
            {(currentTerm.alias || []).map((a: string) => (
              <span key={a} className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400">{a}</span>
            ))}
          </div>
          <h2 className="text-xl font-bold text-white mb-4">{currentTerm.term}</h2>

          <div className="space-y-4 text-sm leading-relaxed">
            <div>
              <h4 className="text-yellow-400 font-medium mb-1">📖 是什么</h4>
              <p className="text-gray-300">{currentTerm.what}</p>
            </div>
            <div>
              <h4 className="text-red-400 font-medium mb-1">💡 为什么影响我的基金</h4>
              <p className="text-gray-300">{currentTerm.why_matters}</p>
            </div>
            {currentTerm.next_event && currentTerm.next_event !== '无' && (
              <div>
                <h4 className="text-blue-400 font-medium mb-1">⏰ 下次时间</h4>
                <p className="text-gray-300">{currentTerm.next_event}</p>
              </div>
            )}
            {currentTerm.history_impact && currentTerm.history_impact !== '无' && (
              <div>
                <h4 className="text-purple-400 font-medium mb-1">📊 历史影响</h4>
                <p className="text-gray-300">{currentTerm.history_impact}</p>
              </div>
            )}
            {currentTerm.related_terms && currentTerm.related_terms.length > 0 && (
              <div>
                <h4 className="text-green-400 font-medium mb-1">🔗 相关概念</h4>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentTerm.related_terms.map((rt: string) => {
                    const linked = terms.find((t: any) => t.term === rt);
                    return linked ? (
                      <button key={rt} onClick={() => {
                        setCurrentTerm(null);
                        setTimeout(() => openTerm(linked), 50);
                      }}
                      className="px-2 py-1 rounded bg-gray-700 text-xs text-blue-400 hover:bg-gray-600">{rt}</button>
                    ) : (
                      <span key={rt} className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-500">{rt}</span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 建议搜索 */}
          {!search && (
            <div className="flex flex-wrap gap-2">
              <span className="text-gray-500 text-xs">热门：</span>
              {['非农数据', 'CPI', '美联储利率决议', 'QDII基金', '定投', 'T+2确认', '汇率中间价', '英伟达', '港股通'].map(q => (
                <button key={q} onClick={() => doSearch(q)}
                  className="px-2 py-1 rounded text-xs bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* 搜索结果/词条列表 */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="card text-center py-12">
              <BookOpen size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500">{search ? `未找到"${search}"相关词条` : '暂无词条'}</p>
              {search && <p className="text-gray-600 text-xs mt-1">试试其他关键词，如"非农"、"QDII"、"利率"</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-gray-400 text-xs font-medium mb-2 px-1">{CATEGORIES[cat] || ''} {cat}</h3>
                  <div className="space-y-1">
                    {items.map((t: any) => (
                      <button key={t.id} onClick={() => openTerm(t)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 text-left transition-colors group">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{t.term}</span>
                          {(t.alias || []).slice(0, 2).map((a: string) => (
                            <span key={a} className="text-gray-600 text-xs">({a})</span>
                          ))}
                        </div>
                        <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
