"""量化投资仪表盘 —— 前后端合一入口"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from config import settings
from models import init_db
from routers import portfolio, news, ai_advisor, blogger, daily_brief
from scheduler import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield


app = FastAPI(
    title="量化投资仪表盘",
    description="个人每日投资助手",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 路由
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["持仓管理"])
app.include_router(news.router, prefix="/api/news", tags=["新闻聚合"])
app.include_router(ai_advisor.router, prefix="/api/ai", tags=["AI建议"])
app.include_router(blogger.router, prefix="/api/blogger", tags=["博主跟踪"])
app.include_router(daily_brief.router, prefix="/api/assistant", tags=["每日助手"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "量化投资仪表盘运行中"}


# ===== 静态文件（前端） =====
# 前端构建后的 dist 目录
FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend", "dist"
)

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
