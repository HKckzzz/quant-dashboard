"""博主爬虫服务 - 尝试抓取支付宝博主公开数据"""
import httpx
from datetime import datetime
from bs4 import BeautifulSoup

from config import settings


async def try_scrape_blogger() -> list[dict]:
    """尝试爬取博主公开页面数据

    注意: 支付宝没有公开API，此方法仅作为参考。
    如果博主有公开分享页面（如蚂蚁财富社区帖子），可尝试抓取。
    主要数据来源应该依赖截图OCR + 手动录入。
    """
    trades = []

    if not settings.BLOGGER_URL:
        return trades

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
                "Accept": "text/html,application/xhtml+xml",
            }
            resp = await client.get(settings.BLOGGER_URL, headers=headers, follow_redirects=True)

            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                # 尝试提取交易相关信息
                # 支付宝/蚂蚁财富的页面结构经常变化，这里做最简单的尝试
                text = soup.get_text()

                # 尝试找卖出/买入等关键词
                keywords = ["卖出", "买入", "加仓", "减仓", "清仓", "赎回", "申购", "实盘"]
                found_keywords = [k for k in keywords if k in text]

                if found_keywords:
                    trades.append({
                        "note": f"爬虫检测到关键词: {', '.join(found_keywords)}",
                        "suggestion": "请使用截图OCR或手动录入获取详细交易记录",
                        "scraped_at": datetime.utcnow().isoformat(),
                    })
            else:
                trades.append({
                    "error": f"HTTP {resp.status_code}: 无法访问博主页面",
                    "note": "支付宝页面可能需要登录才能查看，爬虫方式受限",
                })
    except Exception as e:
        trades.append({
            "error": f"爬虫异常: {str(e)}",
            "note": "请使用截图OCR或手动录入方式跟踪博主操作",
        })

    return trades
