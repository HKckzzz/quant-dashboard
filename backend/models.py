"""SQLite 数据模型"""
import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, String, Float, Integer, DateTime, Text, JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

os.makedirs(os.path.dirname(settings.DATABASE_PATH), exist_ok=True)

engine = create_engine(f"sqlite:///{settings.DATABASE_PATH}", echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Fund(Base):
    """QDII基金持仓"""
    __tablename__ = "funds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    ticker = Column(String(10), nullable=False)
    shares = Column(Float, default=0.0)         # 持仓市值(元)
    cost_basis = Column(Float, default=0.0)      # 成本(元)
    daily_limit = Column(Float, default=0.0)     # 单日申购限额(元)
    daily_pnl = Column(Float, default=0.0)       # 今日收益(元)
    cumulative_pnl = Column(Float, default=0.0)  # 累计收益(元)
    return_rate = Column(Float, default=0.0)     # 持有收益率(%)
    strategy = Column(String(50), default="")    # 定投策略
    current_price = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow)


class HKStock(Base):
    """港股持仓"""
    __tablename__ = "hk_stocks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(10), nullable=False)     # 港股代码 如 00700
    name = Column(String(100), nullable=False)     # 股票名称
    shares = Column(Integer, default=0)            # 持仓股数
    cost = Column(Float, default=0.0)              # 成本价(港币)
    current_price = Column(Float, default=0.0)     # 现价
    change_pct = Column(Float, default=0.0)        # 涨跌幅(%)
    updated_at = Column(DateTime, default=datetime.utcnow)


class NewsItem(Base):
    __tablename__ = "news"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    source = Column(String(100), nullable=False)
    url = Column(String(500))
    summary = Column(Text)
    sentiment = Column(String(20))
    category = Column(String(50))
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIAdvice(Base):
    __tablename__ = "ai_advice"
    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    context_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class BloggerTrade(Base):
    __tablename__ = "blogger_trades"
    id = Column(Integer, primary_key=True, autoincrement=True)
    blogger_name = Column(String(50), default="门前有棵树")
    fund_name = Column(String(100))
    fund_code = Column(String(20))
    action = Column(String(20))
    amount = Column(Float)
    reason = Column(Text)
    source = Column(String(50))
    trade_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 初始化基金数据
        if db.query(Fund).count() == 0:
            for f in settings.FUNDS:
                db.add(Fund(
                    code=f["code"],
                    name=f["name"],
                    ticker=f["ticker"],
                    shares=f.get("shares", 0),
                    cost_basis=f.get("cost_basis", 0),
                    daily_limit=f.get("daily_limit", 0),
                    daily_pnl=f.get("daily_pnl", 0),
                    cumulative_pnl=f.get("cumulative_pnl", 0),
                    return_rate=f.get("return_rate", 0),
                    strategy=f.get("strategy", ""),
                ))
            db.commit()

        # 初始化港股（仅首次，不覆盖已有数据）
        if db.query(HKStock).count() == 0:
            for s in settings.HK_DEFAULT_STOCKS:
                db.add(HKStock(
                    code=s["code"],
                    name=s["name"],
                    shares=s.get("shares", 0),
                    cost=s.get("cost", 0),
                ))
            db.commit()
    finally:
        db.close()
