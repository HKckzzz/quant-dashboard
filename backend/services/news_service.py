"""新闻聚合服务"""
from datetime import datetime, timedelta
from typing import Optional
import asyncio
import hashlib
import feedparser
import httpx
from bs4 import BeautifulSoup

from models import SessionLocal, NewsItem


NEWS_SOURCES = [
    {
        "name": "CNBC Top News",
        "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
        "type": "rss",
    },
    {
        "name": "Reuters Business",
        "url": "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
        "type": "rss",
    },
    {
        "name": "MarketWatch",
        "url": "https://feeds.content.dowjones.io/public/rss/mw_topstories",
        "type": "rss",
    },
    {
        "name": "Yahoo Finance",
        "url": "https://finance.yahoo.com/news/rssindex",
        "type": "rss",
    },
]

# 关键词分类
KEYWORDS = {
    "fed": ["fed", "powell", "fomc", "rate hike", "rate cut", "inflation", "cpi"],
    "tech": ["apple", "microsoft", "google", "nvidia", "meta", "ai", "chip", "semiconductor"],
    "macro": ["gdp", "jobs", "unemployment", "housing", "manufacturing", "pmi"],
    "market": ["stocks", "wall street", "rally", "sell-off", "bull", "bear", "correction"],
}


def classify_news(title: str, content: str) -> tuple[str, str]:
    """分类和情感分析（简易关键词匹配）"""
    text = (title + " " + content).lower()

    # 分类
    category = "general"
    for cat, keywords in KEYWORDS.items():
        if any(kw in text for kw in keywords):
            category = cat
            break

    # 情感
    positive = ["surge", "rally", "jump", "gain", "rise", "boost", "optimistic", "bull", "beat"]
    negative = ["plunge", "tumble", "drop", "fall", "crash", "decline", "fear", "bear", "miss", "risk"]

    pos_count = sum(1 for w in positive if w in text)
    neg_count = sum(1 for w in negative if w in text)

    if pos_count > neg_count:
        sentiment = "positive"
    elif neg_count > pos_count:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return category, sentiment


async def fetch_rss(source: dict) -> list[dict]:
    """抓取RSS源"""
    try:
        feed = feedparser.parse(source["url"])
        articles = []
        for entry in feed.entries[:10]:
            articles.append({
                "title": entry.get("title", ""),
                "url": entry.get("link", ""),
                "summary": entry.get("summary", ""),
                "source": source["name"],
                "published_at": entry.get("published", ""),
            })
        return articles
    except Exception:
        return []


async def fetch_all_news() -> list[dict]:
    """抓取所有新闻源"""
    tasks = [fetch_rss(src) for src in NEWS_SOURCES]
    results = await asyncio.gather(*tasks)
    all_articles = []
    seen = set()

    for articles in results:
        for a in articles:
            # 去重（按标题hash）
            h = hashlib.md5(a["title"].encode()).hexdigest()
            if h not in seen:
                seen.add(h)
                category, sentiment = classify_news(a["title"], a.get("summary", ""))
                a["category"] = category
                a["sentiment"] = sentiment
                all_articles.append(a)

    all_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)
    return all_articles


async def save_news_to_db(articles: list[dict]):
    """保存新闻到数据库"""
    db = SessionLocal()
    try:
        for a in articles:
            # 检查是否已存在
            existing = db.query(NewsItem).filter(
                NewsItem.title == a["title"]
            ).first()
            if not existing:
                pub_time = a.get("published_at")
                if isinstance(pub_time, str) and pub_time:
                    try:
                        from dateutil import parser
                        pub_time = parser.parse(pub_time)
                    except Exception:
                        pub_time = datetime.utcnow()
                else:
                    pub_time = datetime.utcnow()

                db.add(NewsItem(
                    title=a["title"],
                    source=a["source"],
                    url=a.get("url", ""),
                    summary=a.get("summary", ""),
                    sentiment=a.get("sentiment", "neutral"),
                    category=a.get("category", "general"),
                    published_at=pub_time,
                ))
        db.commit()
    finally:
        db.close()


async def get_recent_news(limit: int = 30) -> list[dict]:
    """获取最近新闻"""
    db = SessionLocal()
    try:
        items = db.query(NewsItem).order_by(
            NewsItem.published_at.desc()
        ).limit(limit).all()
        return [
            {
                "id": item.id,
                "title": item.title,
                "source": item.source,
                "url": item.url,
                "summary": item.summary,
                "sentiment": item.sentiment,
                "category": item.category,
                "published_at": item.published_at.isoformat() if item.published_at else "",
            }
            for item in items
        ]
    finally:
        db.close()
