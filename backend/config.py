"""应用配置 - 真实持仓数据"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # DeepSeek API
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"

    # 数据库
    DATABASE_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data", "portfolio.db"
    )

    # ==========================================
    # 一、真实QDII基金持仓（2026-06-09 数据）
    # ==========================================
    FUNDS: list[dict] = [
        {
            "code": "017654",
            "name": "创金合信全球芯片产业股票(QDII)C",
            "ticker": "SMH",          # 对标美股半导体ETF
            "shares": 438.06,         # 持仓市值(元)，份额待确认
            "cost_basis": 430.00,     # 成本(元)
            "daily_limit": 1000,      # 单日申购限额(元)
            "daily_pnl": 5.48,        # 今日收益(元)
            "cumulative_pnl": 8.06,   # 累计收益(元)
            "return_rate": 2.21,      # 持有收益率(%)
            "strategy": "日定投33元",
        },
        {
            "code": "018036",
            "name": "长城全球新能源汽车股票(QDII-LOF)C",
            "ticker": "LIT",          # 对标全球锂电池ETF
            "shares": 1076.57,
            "cost_basis": 1093.00,
            "daily_limit": 500,
            "daily_pnl": 13.27,
            "cumulative_pnl": -16.43,
            "return_rate": -1.65,
            "strategy": "手动加仓",
        },
        {
            "code": "019172",
            "name": "摩根纳斯达克100指数(QDII)A",
            "ticker": "QQQ",
            "shares": 147.96,
            "cost_basis": 150.00,
            "daily_limit": 100,       # 纳斯达克限额100元
            "daily_pnl": 1.87,
            "cumulative_pnl": -2.04,
            "return_rate": -1.57,
            "strategy": "日定投10元",
        },
    ]

    # 基金底层持仓（用于预估净值）
    FUND_HOLDINGS: dict[str, list[dict]] = {
        "SMH": [  # 半导体ETF → 芯片股
            {"ticker": "NVDA", "name": "英伟达", "weight": 20.0},
            {"ticker": "TSM", "name": "台积电", "weight": 12.0},
            {"ticker": "AVGO", "name": "博通", "weight": 8.0},
            {"ticker": "AMD", "name": "AMD", "weight": 7.0},
            {"ticker": "ASML", "name": "阿斯麦", "weight": 6.0},
            {"ticker": "QCOM", "name": "高通", "weight": 5.0},
            {"ticker": "INTC", "name": "英特尔", "weight": 4.5},
            {"ticker": "MU", "name": "美光科技", "weight": 4.0},
            {"ticker": "AMAT", "name": "应用材料", "weight": 3.5},
            {"ticker": "LRCX", "name": "拉姆研究", "weight": 3.0},
        ],
        "LIT": [  # 锂电池ETF → 新能源股
            {"ticker": "TSLA", "name": "特斯拉", "weight": 15.0},
            {"ticker": "NVDA", "name": "英伟达", "weight": 8.0},
            {"ticker": "ALB", "name": "雅保", "weight": 7.0},
            {"ticker": "SQM", "name": "智利矿业化工", "weight": 6.0},
            {"ticker": "BYDDY", "name": "比亚迪ADR", "weight": 5.5},
            {"ticker": "NIO", "name": "蔚来", "weight": 5.0},
            {"ticker": "XPEV", "name": "小鹏汽车", "weight": 4.5},
            {"ticker": "LCID", "name": "Lucid", "weight": 4.0},
            {"ticker": "RIVN", "name": "Rivian", "weight": 3.5},
            {"ticker": "PLUG", "name": "普拉格能源", "weight": 3.0},
        ],
        "QQQ": [
            {"ticker": "AAPL", "name": "苹果", "weight": 8.5},
            {"ticker": "MSFT", "name": "微软", "weight": 8.0},
            {"ticker": "NVDA", "name": "英伟达", "weight": 7.5},
            {"ticker": "AMZN", "name": "亚马逊", "weight": 5.5},
            {"ticker": "META", "name": "Meta", "weight": 4.5},
            {"ticker": "GOOGL", "name": "谷歌", "weight": 4.0},
            {"ticker": "TSLA", "name": "特斯拉", "weight": 3.5},
            {"ticker": "AVGO", "name": "博通", "weight": 3.0},
            {"ticker": "COST", "name": "好市多", "weight": 2.5},
            {"ticker": "NFLX", "name": "奈飞", "weight": 2.0},
        ],
    }

    # ==========================================
    # 二、港股股票持仓（预设空，用户自行添加）
    # ==========================================
    HK_DEFAULT_STOCKS: list[dict] = [
        # 格式: {"code": "00700", "name": "腾讯控股", "shares": 0, "cost": 0}
    ]

    # 港股主要指数
    HK_INDICES: list[dict] = [
        {"ticker": "^HSI", "name": "恒生指数", "sina_code": "rt_hkHSI"},
        {"ticker": "^HSTECH", "name": "恒生科技指数", "sina_code": "rt_hkHSTECH"},
        {"ticker": "^HSCEI", "name": "国企指数", "sina_code": "rt_hkHSCEI"},
    ]

    # ==========================================
    # 三、汇率配置
    # ==========================================
    USD_CNY_RATE: float = float(os.getenv("USD_CNY_RATE", "7.25"))

    # ==========================================
    # 四、博主跟踪配置
    # ==========================================
    BLOGGER_NAME: str = "门前有棵树"
    BLOGGER_PLATFORM: str = "alipay"
    BLOGGER_URL: str = os.getenv("BLOGGER_URL", "")


settings = Settings()
