"""每日助手路由——操作建议 + 涨跌解释 + 知识库"""
from datetime import datetime
from fastapi import APIRouter, Query
from pydantic import BaseModel

from models import SessionLocal, Fund
from services.daily_brief import (
    generate_daily_brief, explain_fund_move, get_upcoming_events, ECONOMIC_CALENDAR,
)
from services.knowledge_base import search_knowledge, list_all_terms, get_term, get_terms_by_category
from services.market_data import get_fx_rate, get_batch_prices
from config import settings

router = APIRouter()


# ===================== 每日助手 =====================

@router.get("/daily-brief")
async def daily_brief():
    """生成每日个性化操作建议"""
    db = SessionLocal()
    try:
        funds = db.query(Fund).all()
    finally:
        db.close()

    funds_data = []
    total_value = 0
    total_daily = 0
    total_cum = 0

    for f in funds:
        total_value += f.shares
        total_daily += f.daily_pnl
        total_cum += f.cumulative_pnl
        funds_data.append({
            "name": f.name,
            "ticker": f.ticker,
            "shares": f.shares,
            "daily_pnl": f.daily_pnl,
            "cumulative_pnl": f.cumulative_pnl,
            "return_rate": f.return_rate,
            "daily_limit": f.daily_limit,
            "strategy": f.strategy,
        })

    fx = await get_fx_rate()
    events = get_upcoming_events(7)

    brief_text = generate_daily_brief(
        funds_data, total_value, total_daily, total_cum, fx["usd_cny"], events
    )

    return {
        "brief": brief_text,
        "summary": {
            "total_value": round(total_value, 2),
            "daily_pnl": round(total_daily, 2),
            "cumulative_pnl": round(total_cum, 2),
            "fund_count": len(funds),
        },
        "events": events,
        "fx_rate": fx,
        "generated_at": datetime.utcnow().isoformat(),
    }


# ===================== 涨跌解释器 =====================

@router.get("/explain-fund/{fund_id}")
async def explain_fund(fund_id: int):
    """解释某只基金今日涨跌原因"""
    db = SessionLocal()
    try:
        fund = db.query(Fund).filter(Fund.id == fund_id).first()
    finally:
        db.close()

    if not fund:
        return {"error": "基金不存在"}

    fx = await get_fx_rate()

    # 获取底层持仓实时数据
    holdings = settings.FUND_HOLDINGS.get(fund.ticker, [])
    detail = []
    if holdings:
        tickers = [h["ticker"] for h in holdings]
        prices = await get_batch_prices(tickers)
        pm = {p["ticker"]: p for p in prices}
        for h in holdings:
            p = pm.get(h["ticker"], {})
            detail.append({
                "name": h["name"],
                "weight": h["weight"],
                "change_percent": p.get("change_percent", 0),
                "price": p.get("price", 0),
            })

    explanation = explain_fund_move(
        fund.name, fund.ticker, fund.daily_pnl,
        fund.return_rate, fx["usd_cny"], detail
    )

    return {
        "fund_name": fund.name,
        "daily_pnl": fund.daily_pnl,
        "return_rate": fund.return_rate,
        "explanation": explanation,
        "holdings_detail": sorted(detail, key=lambda x: x["weight"], reverse=True) if detail else [],
        "fx_rate": fx,
    }


# ===================== 经济日历 =====================

@router.get("/calendar")
async def economic_calendar(days: int = Query(30)):
    """重大事件日历"""
    upcoming = get_upcoming_events(days)
    return {
        "upcoming": upcoming,
        "all_events": ECONOMIC_CALENDAR,
        "total_count": len(ECONOMIC_CALENDAR),
    }


# ===================== 金融知识库 =====================

@router.get("/knowledge/search")
async def search_kb(q: str = Query(""), category: str = Query("all")):
    """搜索金融知识库"""
    if not q:
        return {"results": [], "count": 0}
    results = search_knowledge(q, category)
    return {"results": results, "count": len(results), "query": q}


@router.get("/knowledge/terms")
async def all_terms():
    """列出所有金融词条"""
    return {"terms": list_all_terms(), "count": len(list_all_terms())}


@router.get("/knowledge/term/{term_id}")
async def get_kb_term(term_id: int):
    """获取单个词条详情"""
    term = get_term(term_id)
    if not term:
        return {"error": "词条不存在"}
    return term


@router.get("/knowledge/categories")
async def kb_categories():
    """知识库分类"""
    cats = set(t["category"] for t in list_all_terms())
    return {"categories": sorted(cats)}
