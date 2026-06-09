import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Zap, RefreshCw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface QuickQuestion {
  id: number;
  label: string;
  question: string;
}

export default function AIAdvisor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 你好！我是你的AI量化投资顾问。\n\n我可以帮你：\n- 📊 分析美股市场走势和涨跌原因\n- 💼 诊断你的基金持仓\n- ⚠️ 评估市场风险\n- 💡 提供投资策略参考\n\n请随时向我提问！\n\n*本AI分析不构成投资建议，投资有风险，决策需谨慎。*',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState<QuickQuestion[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ai/quick-questions')
      .then(r => r.json())
      .then(d => setQuickQuestions(d.questions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // 先添加一个空的assistant消息
    const assistantIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          include_portfolio: true,
          include_market: true,
          history: messages.slice(-6),
        }),
      });

      if (!res.ok || !res.body) throw new Error('请求失败');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        setMessages(prev => {
          const updated = [...prev];
          if (updated[assistantIdx]) {
            updated[assistantIdx] = { ...updated[assistantIdx], content: fullContent };
          }
          return updated;
        });
      }
    } catch (e: any) {
      setMessages(prev => {
        const updated = [...prev];
        if (updated[assistantIdx]) {
          updated[assistantIdx] = {
            ...updated[assistantIdx],
            content: `❌ 出错了: ${e.message}\n\n请确保后端已启动，且已配置 DEEPSEEK_API_KEY（platform.deepseek.com 注册免费领500万token）。`,
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '对话已清空。有什么可以帮你的？',
      },
    ]);
  };

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles size={22} className="text-purple-400" />
            AI投资顾问
          </h1>
          <p className="text-[#9aa0b0] text-sm mt-1">基于持仓+市场数据的智能分析</p>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9aa0b0] hover:text-white transition-colors"
        >
          <RefreshCw size={12} />
          清空对话
        </button>
      </div>

      {/* 快捷提问 */}
      {messages.length <= 1 && quickQuestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => sendMessage(q.question)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1e2130] border border-[#2a2d3a] rounded-lg text-xs text-[#9aa0b0] hover:text-white hover:border-purple-500/30 transition-all"
            >
              <Zap size={12} className="text-purple-400" />
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* 头像 */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>

            {/* 消息内容 */}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500/20 border border-blue-500/30 text-white'
                  : 'bg-[#1e2130] border border-[#2a2d3a] text-[#e8eaed]'
              }`}
            >
              {msg.content ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="flex items-center gap-2 text-[#5c6274]">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  AI思考中...
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 输入框 */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的投资问题... (Enter发送, Shift+Enter换行)"
          disabled={loading}
          className="flex-1 bg-[#1e2130] border border-[#2a2d3a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#5c6274] focus:outline-none focus:border-purple-500/50 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
