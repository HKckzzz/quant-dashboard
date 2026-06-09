"""持仓路由——QDII基金 + 港股 + 组合分析"""
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from models import SessionLocal, Fund, HKStock
from services.market_data import (
    get_stock_price, get_batch_prices, get_market_summary as fetch_market,
    get_sector_performance as fetch_sectors, get_hk_stock_price,
    get_hk_batch_prices, get_hk_indices, get_fx_rate, get_stock_history,
)
from config import settings

router = APIRouter()


class FundUpdate(BaseModel):
    shares: Optional[float] = None
    cost_basis: Optional[float] = None
    daily_limit: Optional[float] = None


class HKStockAdd(BaseModel):
    code: str
    name: str
    shares: int = 0
    cost: float = 0.0


class HKStockUpdate(BaseModel):
    name: Optional[str] = None
    shares: Optional[int] = None
    cost: Optional[float] = None


# ===================== QDII基金 =====================

@router.get("/funds")
async def list_funds():
    db = SessionLocal()
    try:
        funds = db.query(Fund).all()
        return [{"id": f.id, "code": f.code, "name": f.name, "ticker": f.ticker,
                 "shares": f.shares, "cost_basis": f.cost_basis, "daily_limit": f.daily_limit,
                 "daily_pnl": f.daily_pnl, "cumulative_pnl": f.cumulative_pnl,
                 "return_rate": f.return_rate, "strategy": f.strategy,
                 "current_price": f.current_price}
                for f in funds]
    finally:
        db.close()


@router.put("/funds/{fund_id}")
async def update_fund(fund_id: int, data: FundUpdate):
    db = SessionLocal()
    try:
        fund = db.query(Fund).filter(Fund.id == fund_id).first()
        if not fund:
            raise HTTPException(404, "基金不存在")
        if data.shares is not None:
            fund.shares = data.shares
        if data.cost_basis is not None:
            fund.cost_basis = data.cost_basis
        if data.daily_limit is not None:
            fund.daily_limit = data.daily_limit
        db.commit()
        return {"message": "更新成功"}
    finally:
        db.close()


@router.get("/portfolio-summary")
async def portfolio_summary(live: bool = Query(False)):
    """基金组合概览"""
    db = SessionLocal()
    try:
        funds = db.query(Fund).all()
    finally:
        db.close()

    if not funds:
        return {"total_value": 0, "total_cost": 0, "daily_pnl": 0, "cumulative_pnl": 0,
                "total_return_rate": 0, "funds": [], "count": 0}

    # 实时价格（live=true时）
    price_map = {}
    if live:
        tickers = [f.ticker for f in funds if f.ticker]
        if tickers:
            tasks = [get_stock_price(t) for t in tickers]
            prices = await asyncio.gather(*tasks)
            for t, p in zip(tickers, prices):
                price_map[t] = p

    fund_list = []
    total_value = 0
    total_cost = 0
    total_daily = 0
    total_cum = 0

    for fund in funds:
        pd = price_map.get(fund.ticker, {}) if price_map else {}
        # 优先使用基金自带的PNL数据，然后用实时价格补充
        daily_pnl = fund.daily_pnl
        cum_pnl = fund.cumulative_pnl
        return_rate = fund.return_rate
        current_price = pd.get("price", fund.current_price) if pd else fund.current_price
        change_pct = pd.get("change_percent", 0) if pd else 0

        total_value += fund.shares
        total_cost += fund.cost_basis
        total_daily += daily_pnl
        total_cum += cum_pnl

        fund_list.append({
            "id": fund.id, "code": fund.code, "name": fund.name,
            "ticker": fund.ticker, "shares": fund.shares,
            "cost_basis": fund.cost_basis, "daily_limit": fund.daily_limit,
            "daily_pnl": daily_pnl, "cumulative_pnl": cum_pnl,
            "return_rate": return_rate, "strategy": fund.strategy,
            "current_price": current_price, "change_percent": change_pct,
        })

    total_return = round((total_value - total_cost) / total_cost * 100, 2) if total_cost > 0 else 0

    return {
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "daily_pnl": round(total_daily, 2),
        "cumulative_pnl": round(total_cum, 2),
        "total_return_rate": total_return,
        "funds": fund_list,
        "count": len(fund_list),
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.get("/estimated-nav")
async def estimated_nav():
    """预估净值——基于底层持仓加权"""
    db = SessionLocal()
    try:
        funds = db.query(Fund).all()
    finally:
        db.close()

    result = []
    for fund in funds:
        holdings = settings.FUND_HOLDINGS.get(fund.ticker, [])
        if not holdings:
            result.append({"id": fund.id, "name": fund.name, "ticker": fund.ticker,
                          "estimated_change": 0, "holdings_count": 0, "detail": []})
            continue

        tickers = [h["ticker"] for h in holdings]
        prices = await get_batch_prices(tickers)
        price_map = {p["ticker"]: p for p in prices}

        total_w = 0; w_chg = 0; detail = []
        for h in holdings:
            p = price_map.get(h["ticker"], {})
            chg = p.get("change_percent", 0)
            w = h["weight"]
            total_w += w; w_chg += w * chg
            detail.append({"ticker": h["ticker"], "name": h["name"],
                          "weight": w, "change_percent": chg})

        est = round(w_chg / total_w, 2) if total_w > 0 else 0
        result.append({"id": fund.id, "name": fund.name, "ticker": fund.ticker,
                      "estimated_change": est, "holdings_count": len(holdings),
                      "detail": sorted(detail, key=lambda x: x["weight"], reverse=True)})

    return {"funds": result, "updated_at": datetime.utcnow().isoformat()}


@router.get("/market-summary")
async def market_summary(live: bool = Query(False)):
    if not live:
        return {"indices": [
            {"ticker": "^GSPC", "name": "标普500", "price": 0, "change_percent": 0},
            {"ticker": "^IXIC", "name": "纳斯达克", "price": 0, "change_percent": 0},
            {"ticker": "^DJI", "name": "道琼斯", "price": 0, "change_percent": 0},
            {"ticker": "^VIX", "name": "VIX恐慌", "price": 0, "change_percent": 0},
        ], "updated_at": datetime.utcnow().isoformat()}
    return await fetch_market()


@router.get("/sector-performance")
async def sector_performance(live: bool = Query(False)):
    if not live: return []
    return await fetch_sectors()


# ===================== 港股 =====================

@router.get("/hk-stocks")
async def list_hk_stocks(live: bool = Query(False)):
    """港股持仓列表"""
    db = SessionLocal()
    try:
        stocks = db.query(HKStock).all()
    finally:
        db.close()

    if not stocks:
        return {"stocks": [], "count": 0}

    results = []
    if live:
        sd = [{"code": s.code, "name": s.name} for s in stocks]
        prices = await get_hk_batch_prices(sd)
        pm = {p["ticker"]: p for p in prices}
    else:
        pm = {}

    total_value = 0; total_cost = 0; total_pnl = 0
    for s in stocks:
        p = pm.get(s.code, {}) if pm else {}
        price = p.get("price", s.current_price) if p else s.current_price
        chg = p.get("change_percent", s.change_pct) if p else s.change_pct
        mkt_val = round(price * s.shares, 2) if s.shares else 0
        cost_val = round(s.cost * s.shares, 2) if s.shares else 0
        pnl = round(mkt_val - cost_val, 2)
        pnl_pct = round((price - s.cost) / s.cost * 100, 2) if s.cost and s.shares else 0

        total_value += mkt_val; total_cost += cost_val; total_pnl += pnl

        results.append({
            "id": s.id, "code": s.code, "name": s.name,
            "shares": s.shares, "cost": s.cost,
            "current_price": price, "change_percent": chg,
            "market_value": mkt_val, "cost_value": cost_val,
            "pnl": pnl, "pnl_pct": pnl_pct,
        })

    return {
        "stocks": results,
        "count": len(results),
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pnl": round(total_pnl, 2),
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.post("/hk-stocks")
async def add_hk_stock(stock: HKStockAdd):
    db = SessionLocal()
    try:
        db.add(HKStock(code=stock.code, name=stock.name,
                       shares=stock.shares, cost=stock.cost))
        db.commit()
        return {"message": "添加成功"}
    finally:
        db.close()


@router.put("/hk-stocks/{stock_id}")
async def update_hk_stock(stock_id: int, data: HKStockUpdate):
    db = SessionLocal()
    try:
        s = db.query(HKStock).filter(HKStock.id == stock_id).first()
        if not s: raise HTTPException(404, "港股不存在")
        if data.name is not None: s.name = data.name
        if data.shares is not None: s.shares = data.shares
        if data.cost is not None: s.cost = data.cost
        db.commit()
        return {"message": "更新成功"}
    finally:
        db.close()


@router.delete("/hk-stocks/{stock_id}")
async def delete_hk_stock(stock_id: int):
    db = SessionLocal()
    try:
        s = db.query(HKStock).filter(HKStock.id == stock_id).first()
        if s: db.delete(s); db.commit()
        return {"message": "已删除"}
    finally:
        db.close()


@router.get("/hk-indices")
async def hk_indices():
    return {"indices": await get_hk_indices(), "updated_at": datetime.utcnow().isoformat()}


# ===================== 组合分析 =====================

@router.get("/analysis")
async def analysis():
    """综合组合分析"""
    db = SessionLocal()
    try:
        funds = db.query(Fund).all()
        hks = db.query(HKStock).all()
    finally:
        db.close()

    # 基金部分
    funds_data = []
    fund_total = sum(f.shares for f in funds)
    for f in funds:
        category = "芯片"
        if "纳斯达克" in f.name: category = "纳斯达克"
        elif "新能源" in f.name or "汽车" in f.name: category = "新能源"
        elif "芯片" in f.name: category = "芯片"
        funds_data.append({
            "name": f.name, "value": f.shares, "category": category,
            "daily_pnl": f.daily_pnl, "cumulative_pnl": f.cumulative_pnl,
            "return_rate": f.return_rate,
        })

    # 港股部分
    hk_total = 0
    hk_data = []
    for h in hks:
        if h.shares and h.current_price:
            val = h.shares * h.current_price
            hk_total += val
            hk_data.append({"name": h.name, "value": val, "category": "港股"})

    # 板块分布
    distribution = [
        {"category": "芯片", "value": sum(d["value"] for d in funds_data if d["category"] == "芯片")},
        {"category": "纳斯达克", "value": sum(d["value"] for d in funds_data if d["category"] == "纳斯达克")},
        {"category": "新能源", "value": sum(d["value"] for d in funds_data if d["category"] == "新能源")},
        {"category": "港股", "value": hk_total},
    ]

    # 总计
    grand_total = fund_total + hk_total
    grand_daily = sum(f.daily_pnl for f in funds)
    grand_cum = sum(f.cumulative_pnl for f in funds)

    # 汇率提醒
    fx = await get_fx_rate()

    return {
        "distribution": [d for d in distribution if d["value"] > 0],
        "fund_total": round(fund_total, 2),
        "hk_total": round(hk_total, 2),
        "grand_total": round(grand_total, 2),
        "grand_daily_pnl": round(grand_daily, 2),
        "grand_cumulative_pnl": round(grand_cum, 2),
        "fund_count": len(funds),
        "hk_count": len(hks),
        "fx_rate": fx,
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.get("/fx-rate")
async def fx_rate():
    return await get_fx_rate()


@router.get("/holdings")
async def get_holdings(live: bool = Query(False)):
    """底层持仓明细"""
    result = {}
    all_tickers = set()
    fund_stocks = {}
    for ft, holdings in settings.FUND_HOLDINGS.items():
        stocks = [{"ticker": h["ticker"], "name": h["name"], "weight": h["weight"],
                    "price": 0, "change": 0, "change_percent": 0} for h in holdings]
        fund_stocks[ft] = stocks
        all_tickers.update(h["ticker"] for h in holdings)

    if live and all_tickers:
        tickers = list(all_tickers)
        prices = await get_batch_prices(tickers)
        pm = {p["ticker"]: p for p in prices}
        for ft, stocks in fund_stocks.items():
            for s in stocks:
                p = pm.get(s["ticker"], {})
                s["price"] = p.get("price", 0)
                s["change"] = p.get("change", 0)
                s["change_percent"] = p.get("change_percent", 0)

    for ft, stocks in fund_stocks.items():
        result[ft] = {"holdings": stocks, "updated_at": datetime.utcnow().isoformat()}
    return result


@router.get("/history/{ticker}")
async def stock_history(ticker: str, period: str = "1mo"):
    return await get_stock_history(ticker, period)
