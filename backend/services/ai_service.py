"""AI投资建议服务 (DeepSeek API - 便宜: 注册送500万token)"""
from typing import AsyncGenerator
from openai import AsyncOpenAI

from config import settings

_client = None


def _get_client() -> AsyncOpenAI:
    """延迟初始化客户端，避免未配置API Key时报错"""
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
        )
    return _client

SYSTEM_PROMPT = """你是一位专业的量化投资分析师，专注于美股市场。你的用户持有美股QDII基金，主要投资纳斯达克100和标普500相关指数。

## 你的能力
1. 分析美股市场走势，解释涨跌原因
2. 结合宏观经济数据、美联储政策、地缘政治等因素给出分析
3. 对用户的基金持仓提供配置建议
4. 评估市场风险，给出调仓参考

## 约束
- 不给出具体的买卖时点建议，只给出分析框架
- 必须声明"本分析不构成投资建议"
- 回复使用中文
- 回答简洁有条理，适当使用列表和emoji
- 涉及具体数据时必须注明来源和时间
- 对于不确定的信息要明确说明"""


def build_portfolio_context(portfolio_data: dict) -> str:
    """构建持仓上下文"""
    ctx = "\n## 用户当前持仓\n\n"
    ctx += f"总市值: ${portfolio_data.get('total_value', 0):,.2f}\n"
    ctx += f"今日盈亏: ${portfolio_data.get('daily_pnl', 0):,.2f}\n"
    ctx += f"总收益率: {portfolio_data.get('total_return_pct', 0):.2f}%\n\n"
    ctx += "### 持仓基金:\n"
    for fund in portfolio_data.get("funds", []):
        ctx += f"- {fund['name']}: 市值 ${fund.get('market_value', 0):,.2f}, 收益率 {fund.get('return_pct', 0):.2f}%\n"
    return ctx


def build_market_context(market_data: dict) -> str:
    """构建市场数据上下文"""
    ctx = "\n## 当前市场数据\n\n"
    for idx in market_data.get("indices", []):
        emoji = "🟢" if idx.get("change_percent", 0) > 0 else "🔴"
        ctx += f"{emoji} {idx['name']}: {idx.get('price', 0):,.2f} ({idx.get('change_percent', 0):+.2f}%)\n"
    return ctx


async def chat_stream(
    question: str,
    portfolio_data: dict | None = None,
    market_data: dict | None = None,
    history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """与DeepSeek对话，流式返回"""
    # 构建上下文
    context = ""
    if portfolio_data:
        context += build_portfolio_context(portfolio_data)
    if market_data:
        context += build_market_context(market_data)

    user_message = f"{context}\n\n## 用户问题\n{question}"

    # 构建消息列表
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        for h in history[-10:]:
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        stream = await _get_client().chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=messages,
            max_tokens=2048,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content
    except Exception as e:
        yield f"\n\nAI服务出错: {str(e)}\n\n请检查: 1) DEEPSEEK_API_KEY是否已配置 2) 网络是否正常 3) DeepSeek账户余额是否充足"


async def generate_daily_summary(
    news: list[dict],
    market_data: dict,
    portfolio_data: dict | None = None,
) -> str:
    """生成每日市场摘要"""
    news_text = "\n".join([
        f"- [{n.get('sentiment', '')}] {n['title']} (来源: {n['source']})"
        for n in news[:15]
    ])

    market_text = build_market_context(market_data)
    portfolio_text = build_portfolio_context(portfolio_data) if portfolio_data else ""

    prompt = f"""请根据以下信息生成今日美股市场摘要（使用中文，300-500字）:

{market_text}

## 今日重要新闻
{news_text}

{portfolio_text}

请包含:
1. 📊 今日市场表现总结
2. 📈 上涨原因或 📉 下跌原因分析
3. 🔍 关键影响因素（宏观/政策/行业）
4. 💡 对持仓基金的影响简析
5. ⚠️ 需关注的风险点

开头注明"本摘要由AI生成，不构成投资建议"."""

    try:
        response = await _get_client().chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"AI摘要生成失败: {str(e)}"


async def analyze_market_reason(
    market_data: dict,
    news: list[dict],
) -> str:
    """分析美股涨跌原因"""
    indices_text = "\n".join([
        f"- {idx['name']}: {idx.get('change_percent', 0):+.2f}%"
        for idx in market_data.get("indices", [])
    ])

    news_text = "\n".join([
        f"- {n['title']}"
        for n in news[:10]
    ])

    prompt = f"""请简要分析今日美股涨跌的主要原因:

## 指数表现
{indices_text}

## 相关新闻
{news_text}

请用3-5个要点说明主要原因，每个要点一句话。使用中文。"""

    try:
        response = await _get_client().chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=[
                {"role": "user", "content": prompt},
            ],
            max_tokens=512,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"分析失败: {str(e)}"
