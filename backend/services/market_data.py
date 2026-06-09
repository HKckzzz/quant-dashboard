"""美股+港股+汇率数据 - 新浪财经接口"""
import asyncio
import re
from datetime import datetime
from typing import Optional
import requests

_cache: dict = {}
_cache_time: dict = {}
CACHE_TTL = 120

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Referer": "https://finance.sina.com.cn/",
}

# === 美股代码映射 ===
US_CODE_MAP = {
    "^GSPC": ("gb_$inx", "标普500"), "^IXIC": ("gb_$ixic", "纳斯达克"), "^DJI": ("gb_$dji", "道琼斯"),
    "QQQ": ("gb_qqq", "纳斯达克100"), "SPY": ("gb_spy", "标普500ETF"), "SMH": ("gb_smh", "半导体ETF"),
    "LIT": ("gb_lit", "锂电池ETF"), "VUG": ("gb_vug", "美国成长股"), "VT": ("gb_vt", "全球股票"),
    "XLK": ("gb_xlk", "科技"), "XLF": ("gb_xlf", "金融"), "XLE": ("gb_xle", "能源"),
    "XLV": ("gb_xlv", "医疗"), "XLY": ("gb_xly", "可选消费"), "XLP": ("gb_xlp", "必需消费"),
    "XLI": ("gb_xli", "工业"), "XLB": ("gb_xlb", "材料"), "XLU": ("gb_xlu", "公用事业"),
    "XLRE": ("gb_xlre", "房地产"),
    "AAPL": ("gb_aapl", "苹果"), "MSFT": ("gb_msft", "微软"), "NVDA": ("gb_nvda", "英伟达"),
    "AMZN": ("gb_amzn", "亚马逊"), "META": ("gb_meta", "Meta"), "GOOGL": ("gb_googl", "谷歌"),
    "TSLA": ("gb_tsla", "特斯拉"), "AVGO": ("gb_avgo", "博通"), "COST": ("gb_cost", "好市多"),
    "NFLX": ("gb_nflx", "奈飞"), "BRK.B": ("gb_brk.b", "伯克希尔"), "JPM": ("gb_jpm", "摩根大通"),
    "UNH": ("gb_unh", "联合健康"), "V": ("gb_v", "Visa"), "MA": ("gb_ma", "万事达"),
    "TSM": ("gb_tsm", "台积电"), "NVO": ("gb_nvo", "诺和诺德"), "ASML": ("gb_asml", "阿斯麦"),
    "AMD": ("gb_amd", "AMD"), "QCOM": ("gb_qcom", "高通"), "INTC": ("gb_intc", "英特尔"),
    "MU": ("gb_mu", "美光科技"), "AMAT": ("gb_amat", "应用材料"), "LRCX": ("gb_lrcx", "拉姆研究"),
    "ALB": ("gb_alb", "雅保"), "SQM": ("gb_sqm", "智利矿业化工"),
    "BYDDY": ("gb_byddy", "比亚迪ADR"), "NIO": ("gb_nio", "蔚来"), "XPEV": ("gb_xpev", "小鹏汽车"),
    "LCID": ("gb_lcid", "Lucid"), "RIVN": ("gb_rivn", "Rivian"), "PLUG": ("gb_plug", "普拉格能源"),
}

# === 港股代码映射 ===
HK_CODE_MAP: dict[str, tuple[str, str]] = {}  # 动态生成

# === 汇率 ===
from config import settings as _s
_USD_CNY = _s.USD_CNY_RATE


def _hk_sina_code(hk_code: str) -> str:
    """港股代码→新浪代码"""
    code = hk_code.lstrip("0") or "0"
    return f"rt_hk{code}"


def _cached(key: str) -> Optional[dict]:
    if key in _cache and key in _cache_time:
        if (datetime.utcnow() - _cache_time[key]).seconds < CACHE_TTL:
            return _cache[key]
    return None


def _cache_set(key: str, data):
    _cache[key] = data
    _cache_time[key] = datetime.utcnow()


def _fetch_sina_sync(codes: list[str], is_hk: bool = False) -> dict[str, list]:
    """同步请求新浪行情"""
    if not codes:
        return {}
    url = "https://hq.sinajs.cn/list=" + ",".join(codes)
    try:
        r = requests.get(url, headers=HEADERS, timeout=8)
        r.encoding = "gb2312"
        text = r.text
    except Exception:
        return {}

    result = {}
    pattern = re.compile(r'hq_str_(\S+)\s*=\s*"([^"]*)"')
    for m in pattern.finditer(text):
        raw_code = m.group(1)
        fields = m.group(2).split(",")

        # 反向查找ticker
        ticker = raw_code
        if not is_hk:
            for t, (sc, _) in US_CODE_MAP.items():
                if sc == raw_code:
                    ticker = t
                    break
        result[ticker] = fields
    return result


async def _fetch_sina(codes: list[str], is_hk: bool = False) -> dict[str, list]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_sina_sync, codes, is_hk)


def _parse_us(ticker: str, fields: list) -> dict:
    """解析美股字段"""
    try:
        price = float(fields[1]) if len(fields) > 1 and fields[1] else 0
        chg_pct = float(fields[2]) if len(fields) > 2 and fields[2] else 0
        chg_val = float(fields[4]) if len(fields) > 4 and fields[4] else 0
        high = float(fields[6]) if len(fields) > 6 and fields[6] else 0
        low = float(fields[7]) if len(fields) > 7 and fields[7] else 0
        vol = float(fields[10]) if len(fields) > 10 and fields[10] else 0
        mcap = float(fields[12]) if len(fields) > 12 and fields[12] else 0

        return {
            "ticker": ticker, "name": US_CODE_MAP.get(ticker, (None, ticker))[1],
            "price": round(price, 2), "change": round(chg_val, 2),
            "change_percent": round(chg_pct, 2), "market_cap": int(mcap),
            "volume": int(vol), "day_high": round(high, 2), "day_low": round(low, 2),
            "pe_ratio": None, "updated_at": datetime.utcnow().isoformat(),
        }
    except (ValueError, IndexError):
        return _empty(ticker)


def _parse_hk(ticker: str, fields: list, name: str = "") -> dict:
    """解析港股字段: 0=名称,1=开盘,2=昨收,3=最高,4=最低,5=现价,6=时间,8=涨跌%,9=涨跌额"""
    try:
        price = float(fields[5]) if len(fields) > 5 and fields[5] else 0
        chg_pct = float(fields[8]) if len(fields) > 8 and fields[8] else 0
        chg_val = float(fields[9]) if len(fields) > 9 and fields[9] else 0
        open_p = float(fields[1]) if len(fields) > 1 and fields[1] else 0
        high = float(fields[3]) if len(fields) > 3 and fields[3] else 0
        low = float(fields[4]) if len(fields) > 4 and fields[4] else 0

        return {
            "ticker": ticker, "name": name or fields[0] if fields else ticker,
            "price": round(price, 2), "change": round(chg_val, 2),
            "change_percent": round(chg_pct, 2), "open": round(open_p, 2),
            "day_high": round(high, 2), "day_low": round(low, 2),
            "pe_ratio": None, "updated_at": datetime.utcnow().isoformat(),
        }
    except (ValueError, IndexError):
        return _empty_hk(ticker, name)


def _empty(ticker: str) -> dict:
    return {"ticker": ticker, "name": US_CODE_MAP.get(ticker, (None, ticker))[1],
            "price": 0, "change": 0, "change_percent": 0, "market_cap": 0, "volume": 0,
            "day_high": 0, "day_low": 0, "pe_ratio": None, "updated_at": datetime.utcnow().isoformat()}


def _empty_hk(ticker: str, name: str = "") -> dict:
    return {"ticker": ticker, "name": name or ticker, "price": 0, "change": 0,
            "change_percent": 0, "open": 0, "day_high": 0, "day_low": 0,
            "pe_ratio": None, "updated_at": datetime.utcnow().isoformat()}


# === 公开API ===

async def get_stock_price(ticker: str) -> dict:
    c = _cached(f"p_{ticker}")
    if c: return c
    sc = US_CODE_MAP.get(ticker)
    if not sc: return _empty(ticker)
    data = await _fetch_sina([sc[0]])
    r = _parse_us(ticker, data.get(ticker, [])) if ticker in data else _empty(ticker)
    _cache_set(f"p_{ticker}", r)
    return r


async def get_batch_prices(tickers: list[str]) -> list[dict]:
    results = []; uncached = []
    for t in tickers:
        c = _cached(f"p_{t}")
        if c: results.append(c)
        else: uncached.append(t)

    if uncached:
        codes = [US_CODE_MAP[t][0] for t in uncached if t in US_CODE_MAP]
        valid = [t for t in uncached if t in US_CODE_MAP]
        data = await _fetch_sina(codes)
        for t in valid:
            r = _parse_us(t, data.get(t, [])) if t in data else _empty(t)
            _cache_set(f"p_{t}", r); results.append(r)
    return results


async def get_market_summary() -> dict:
    codes = ["gb_$inx", "gb_$ixic", "gb_$dji"]
    data = await _fetch_sina(codes)
    idxes = [("^GSPC", "标普500"), ("^IXIC", "纳斯达克"), ("^DJI", "道琼斯")]
    results = []
    ct = {"gb_$inx": "^GSPC", "gb_$ixic": "^IXIC", "gb_$dji": "^DJI"}
    for sc, (ticker, name) in zip(codes, idxes):
        t = ct[sc]
        if t in data:
            f = data[t]
            try:
                results.append({"ticker": ticker, "name": name,
                    "price": round(float(f[1]), 2), "change_percent": round(float(f[2]), 2)})
            except Exception:
                results.append({"ticker": ticker, "name": name, "price": 0, "change_percent": 0})
        else:
            results.append({"ticker": ticker, "name": name, "price": 0, "change_percent": 0})
    results.append({"ticker": "^VIX", "name": "VIX恐慌", "price": 0, "change_percent": 0})
    return {"indices": results, "updated_at": datetime.utcnow().isoformat()}


async def get_sector_performance() -> list[dict]:
    sects = ["XLK","XLF","XLE","XLV","XLY","XLP","XLI","XLB","XLU","XLRE"]
    tasks = [get_stock_price(s) for s in sects]
    rs = await asyncio.gather(*tasks)
    out = [{"ticker": r["ticker"], "name": r["name"], "change_percent": r["change_percent"], "price": r["price"]} for r in rs]
    out.sort(key=lambda x: x["change_percent"], reverse=True)
    return out


async def get_hk_stock_price(code: str, name: str = "") -> dict:
    """获取港股实时行情"""
    c = _cached(f"hk_{code}")
    if c: return c
    sc = _hk_sina_code(code)
    data = await _fetch_sina([sc], is_hk=True)
    for k, v in data.items():
        r = _parse_hk(code, v, name)
        _cache_set(f"hk_{code}", r)
        return r
    r = _empty_hk(code, name)
    _cache_set(f"hk_{code}", r)
    return r


async def get_hk_batch_prices(stocks: list[dict]) -> list[dict]:
    """批量港股行情"""
    codes = []
    for s in stocks:
        c = _cached(f"hk_{s['code']}")
        if not c:
            codes.append(_hk_sina_code(s["code"]))
    if codes:
        await _fetch_sina(codes, is_hk=True)  # 填充缓存

    results = []
    for s in stocks:
        c = _cached(f"hk_{s['code']}")
        if c:
            r = dict(c); r["name"] = s.get("name", r["name"]); results.append(r)
        else:
            r = await get_hk_stock_price(s["code"], s.get("name", "")); results.append(r)
    return results


async def get_hk_indices() -> list[dict]:
    """恒生/恒生科技/国企指数"""
    from config import settings
    idxes = settings.HK_INDICES
    codes = [i["sina_code"] for i in idxes]
    data = await _fetch_sina(codes, is_hk=True)

    results = []
    for idx in idxes:
        sc = idx["sina_code"]
        if sc in data:
            f = data[sc]
            try:
                name = idx["name"]
                price = float(f[5]) if len(f) > 5 and f[5] else 0
                chg = float(f[8]) if len(f) > 8 and f[8] else 0
                results.append({"ticker": idx["ticker"], "name": name, "price": round(price, 2), "change_percent": round(chg, 2)})
            except Exception:
                results.append({"ticker": idx["ticker"], "name": idx["name"], "price": 0, "change_percent": 0})
        else:
            results.append({"ticker": idx["ticker"], "name": idx["name"], "price": 0, "change_percent": 0})
    return results


async def get_fx_rate() -> dict:
    """美元兑人民币汇率"""
    # 尝试从新浪获取实时汇率
    try:
        data = await _fetch_sina(["USDCNY"], is_hk=False)
        # 用默认值
    except Exception:
        pass

    from config import settings
    return {
        "usd_cny": settings.USD_CNY_RATE,
        "source": "手动设定",
        "note": "全仓QDII需关注汇率风险",
        "updated_at": datetime.utcnow().isoformat(),
    }


async def get_stock_history(ticker: str, period: str = "1mo") -> list[dict]:
    return []
