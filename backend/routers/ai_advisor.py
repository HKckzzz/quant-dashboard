"""AI投资建议路由"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from services.ai_service import chat_stream, generate_daily_summary
from services.market_data import get_market_summary
from services.news_service import get_recent_news
from routers.portfolio import portfolio_summary

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    include_portfolio: bool = True
    include_market: bool = True
    history: Optional[list[dict]] = None


@router.post("/chat")
async def ai_chat(req: ChatRequest):
    """AI对话接口（流式返回）"""
    portfolio_data = None
    market_data = None

    if req.include_portfolio:
        portfolio_data = await portfolio_summary()
    if req.include_market:
        market_data = await get_market_summary()

    async def generate():
        async for chunk in chat_stream(
            question=req.question,
            portfolio_data=portfolio_data,
            market_data=market_data,
            history=req.history,
        ):
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


@router.get("/quick-questions")
async def quick_questions():
    """预设快捷提问列表"""
    return {
        "questions": [
            {
                "id": 1,
                "label": "📊 今日市场总结",
                "question": "请给我今天的市场总结，包括主要指数的表现和关键驱动因素。",
            },
            {
                "id": 2,
                "label": "📉 涨跌原因分析",
                "question": "今天美股涨跌的主要原因是什么？请分析核心影响因素。",
            },
            {
                "id": 3,
                "label": "💼 持仓诊断",
                "question": "请根据我的持仓给出诊断建议，哪些基金表现好，哪些需要关注？",
            },
            {
                "id": 4,
                "label": "⚠️ 风险评估",
                "question": "当前市场有哪些主要风险？我的持仓如何应对这些风险？",
            },
            {
                "id": 5,
                "label": "🔮 后市展望",
                "question": "基于当前市场环境，请给出短期（1-4周）市场展望和我的持仓应对策略。",
            },
            {
                "id": 6,
                "label": "💰 调仓建议",
                "question": "结合我的当前持仓和市场环境，请给出调仓建议（增减哪些方向）。",
            },
            {
                "id": 7,
                "label": "🏭 板块分析",
                "question": "当前美股哪个板块表现最好？哪个最弱？原因是什么？",
            },
            {
                "id": 8,
                "label": "🌍 宏观解读",
                "question": "近期重要的宏观经济事件有哪些？对美股基金投资有何影响？",
            },
        ]
    }
