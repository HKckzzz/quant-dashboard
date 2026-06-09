"""博主跟踪路由"""
import os
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import Optional

from models import SessionLocal, BloggerTrade
from services.ocr_service import ocr_from_bytes
from services.blogger_scraper import try_scrape_blogger

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "screenshots")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ManualTrade(BaseModel):
    fund_name: str
    fund_code: Optional[str] = None
    action: str  # buy / sell
    amount: float
    reason: Optional[str] = None
    trade_date: Optional[str] = None


@router.get("/trades")
async def get_trades(limit: int = 50):
    """获取博主交易记录"""
    db = SessionLocal()
    try:
        trades = db.query(BloggerTrade).order_by(
            BloggerTrade.trade_date.desc()
        ).limit(limit).all()
        return [
            {
                "id": t.id,
                "blogger_name": t.blogger_name,
                "fund_name": t.fund_name,
                "fund_code": t.fund_code,
                "action": t.action,
                "amount": t.amount,
                "reason": t.reason,
                "source": t.source,
                "trade_date": t.trade_date.isoformat() if t.trade_date else "",
                "created_at": t.created_at.isoformat() if t.created_at else "",
            }
            for t in trades
        ]
    finally:
        db.close()


@router.post("/trades/manual")
async def add_manual_trade(trade: ManualTrade):
    """手动添加交易记录"""
    db = SessionLocal()
    try:
        trade_date = datetime.fromisoformat(trade.trade_date) if trade.trade_date else datetime.utcnow()
        db_trade = BloggerTrade(
            blogger_name="门前有棵树",
            fund_name=trade.fund_name,
            fund_code=trade.fund_code,
            action=trade.action,
            amount=trade.amount,
            reason=trade.reason,
            source="manual",
            trade_date=trade_date,
        )
        db.add(db_trade)
        db.commit()
        return {"message": "添加成功", "id": db_trade.id}
    finally:
        db.close()


@router.delete("/trades/{trade_id}")
async def delete_trade(trade_id: int):
    """删除交易记录"""
    db = SessionLocal()
    try:
        trade = db.query(BloggerTrade).filter(BloggerTrade.id == trade_id).first()
        if trade:
            db.delete(trade)
            db.commit()
            return {"message": "删除成功"}
        raise HTTPException(404, "记录不存在")
    finally:
        db.close()


@router.post("/upload-screenshot")
async def upload_screenshot(file: UploadFile = File(...)):
    """上传截图并进行OCR识别"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "请上传图片文件")

    # 保存截图
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # OCR识别
    ocr_results = await ocr_from_bytes(content)

    # 自动保存识别出的交易记录
    saved_trades = []
    db = SessionLocal()
    try:
        for item in ocr_results:
            if "fund_name" in item and "action" in item:
                db_trade = BloggerTrade(
                    blogger_name="门前有棵树",
                    fund_name=item.get("fund_name", ""),
                    action=item.get("action", "unknown"),
                    amount=item.get("amount", 0),
                    source="ocr",
                    trade_date=datetime.utcnow(),
                )
                db.add(db_trade)
                db.commit()
                db.refresh(db_trade)
                saved_trades.append({
                    "id": db_trade.id,
                    "fund_name": db_trade.fund_name,
                    "action": db_trade.action,
                    "amount": db_trade.amount,
                })
    finally:
        db.close()

    return {
        "filename": filename,
        "ocr_results": ocr_results,
        "saved_trades": saved_trades,
        "message": f"识别完成，自动保存 {len(saved_trades)} 条交易记录",
    }


@router.get("/scrape")
async def scrape_blogger():
    """尝试爬取博主数据"""
    results = await try_scrape_blogger()
    return {"results": results, "note": "爬虫功能有限，建议使用截图OCR或手动录入"}
