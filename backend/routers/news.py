"""新闻聚合路由"""
from fastapi import APIRouter, Query
from services.news_service import fetch_all_news, save_news_to_db, get_recent_news
from services.market_data import get_market_summary
from services.ai_service import generate_daily_summary, analyze_market_reason

router = APIRouter()


@router.get("/latest")
async def latest_news(limit: int = Query(30, le=100)):
    """获取最新新闻"""
    return await get_recent_news(limit)


@router.post("/refresh")
async def refresh_news():
    """手动刷新新闻"""
    articles = await fetch_all_news()
    if articles:
        await save_news_to_db(articles)
    return {"message": f"刷新完成, 获取{len(articles)}条新闻", "count": len(articles)}


@router.get("/daily-summary")
async def daily_summary():
    """获取AI生成的每日市场摘要"""
    news = await get_recent_news(20)
    market = await get_market_summary()
    summary = await generate_daily_summary(news, market)
    return {"summary": summary, "news_count": len(news)}


@router.get("/market-reason")
async def market_reason():
    """分析美股涨跌原因"""
    market = await get_market_summary()
    news = await get_recent_news(15)
    reason = await analyze_market_reason(market, news)
    return {"reason": reason, "market": market}
