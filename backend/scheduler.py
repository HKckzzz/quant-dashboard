"""定时任务调度"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import asyncio
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def start_scheduler():
    """启动定时任务"""
    # 每30分钟拉取一次新闻
    scheduler.add_job(
        _run_async,
        IntervalTrigger(minutes=30),
        args=[fetch_news_job],
        id="fetch_news",
        replace_existing=True,
    )

    # 每天北京时间上午6点（美股收盘后）生成市场摘要
    scheduler.add_job(
        _run_async,
        CronTrigger(hour=6, minute=0),
        args=[daily_summary_job],
        id="daily_summary",
        replace_existing=True,
    )

    # 每小时尝试爬取博主数据
    scheduler.add_job(
        _run_async,
        IntervalTrigger(hours=1),
        args=[scrape_blogger_job],
        id="scrape_blogger",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("定时任务调度器已启动")


def _run_async(coro_func):
    """在scheduler中运行异步任务"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(coro_func())
    finally:
        loop.close()


async def fetch_news_job():
    """定时拉取新闻"""
    from services.news_service import fetch_all_news, save_news_to_db
    try:
        articles = await fetch_all_news()
        if articles:
            await save_news_to_db(articles)
            logger.info(f"新闻拉取完成: {len(articles)} 条")
    except Exception as e:
        logger.error(f"新闻拉取失败: {e}")


async def daily_summary_job():
    """每日市场摘要生成"""
    from services.market_data import get_market_summary
    from services.news_service import get_recent_news
    from services.ai_service import generate_daily_summary
    try:
        market = await get_market_summary()
        news = await get_recent_news(20)
        summary = await generate_daily_summary(news, market)
        logger.info(f"每日摘要已生成: {summary[:100]}...")
        return summary
    except Exception as e:
        logger.error(f"每日摘要生成失败: {e}")


async def scrape_blogger_job():
    """定时爬取博主数据"""
    from services.blogger_scraper import try_scrape_blogger
    try:
        result = await try_scrape_blogger()
        if result:
            logger.info(f"博主数据爬取完成: {len(result)} 条记录")
    except Exception as e:
        logger.error(f"博主数据爬取失败: {e}")
