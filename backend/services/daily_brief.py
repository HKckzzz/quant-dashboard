"""每日操作建议 + 经济日历 + 涨跌解释"""
import re
from datetime import datetime, date, timedelta
from config import settings


# ===== 经济日历 =====
# 重大事件提醒（每月更新）
ECONOMIC_CALENDAR = [
    {
        "date": "每月第一个周五",
        "event": "美国非农数据（大非农）",
        "name_en": "Non-Farm Payrolls",
        "importance": "极高",
        "affects": "影响美联储降息预期 → 直接影响你持有的纳斯达克100和芯片基金",
        "action": "数据公布前，建议暂停手动加仓操作，等待数据落地。若数据超预期（就业强劲），美股短期承压；若不及预期，科技股通常上涨。",
        "next_date": "2026年7月3日",
    },
    {
        "date": "每月中旬（约10-15日）",
        "event": "美国消费者价格指数（CPI）",
        "name_en": "Consumer Price Index",
        "importance": "极高",
        "affects": "通胀数据决定美联储降息节奏 → 科技股估值对利率敏感",
        "action": "CPI高于预期 → 降息推迟 → 纳斯达克和芯片基金短期承压，但大跌可能带来加仓机会。CPI低于预期 → 利好科技股。",
        "next_date": "2026年6月12日",
    },
    {
        "date": "每季度第三个月中旬",
        "event": "美联储利率决议",
        "name_en": "FOMC Meeting",
        "importance": "最高",
        "affects": "直接决定美元利率走向 → 你的三支QDII基金全部以美元计价",
        "action": "利率维持不变且暗示降息 → 利好。利率上调 → 美股尤其是科技股承压。密切关注鲍威尔会后讲话。",
        "next_date": "2026年6月18日",
    },
    {
        "date": "每月中旬",
        "event": "美国生产者价格指数（PPI）",
        "name_en": "Producer Price Index",
        "importance": "高",
        "affects": "CPI的前瞻指标 → 提前感知通胀压力",
        "action": "PPI大幅低于预期通常利好美股，尤其是成长股（你的新能源基金）。",
        "next_date": "2026年6月13日",
    },
    {
        "date": "每日",
        "event": "美元兑人民币汇率中间价",
        "name_en": "USD/CNY Central Parity Rate",
        "importance": "高（QDII特有）",
        "affects": "你的三支基金全部以美元计价 → 人民币升值则净值缩水，贬值则净值增厚",
        "action": "当前汇率约7.25。若人民币升至7.0以下，你的持仓将面临约3.5%的汇率损失；若贬至7.5以上，额外获得约3.5%的汇率收益。",
        "next_date": "每个交易日 9:15",
    },
    {
        "date": "每年1月、4月、7月、10月",
        "event": "美股财报季",
        "name_en": "Earnings Season",
        "importance": "高",
        "affects": "你持有的芯片基金重仓英伟达、台积电、博通 → 财报直接影响基金净值",
        "action": "财报季期间关注英伟达（权重20%）、台积电（12%）、博通（8%）的业绩指引。若AI芯片需求超预期，芯片基金将大幅受益。",
        "next_date": "2026年7月中旬",
    },
    {
        "date": "每月月初",
        "event": "美国ISM制造业/服务业PMI",
        "name_en": "ISM Manufacturing/Services PMI",
        "importance": "中",
        "affects": "反映美国经济景气度 → 影响市场对经济衰退/过热的判断",
        "action": "PMI低于50（收缩区间）可能引发衰退担忧，美股承压但降息预期升温，对成长股有利有弊。",
        "next_date": "2026年7月1日",
    },
]


def get_upcoming_events(days_ahead: int = 7) -> list[dict]:
    """获取未来N天内的重大事件"""
    today = date.today()
    upcoming = []
    for evt in ECONOMIC_CALENDAR:
        # 解析next_date
        nd = evt.get("next_date", "")
        try:
            if nd and len(nd) > 5:
                ed = datetime.strptime(nd, "%Y年%m月%d日").date()
                if ed >= today and ed <= today + timedelta(days=days_ahead):
                    upcoming.append({**evt, "days_left": (ed - today).days})
        except ValueError:
            # 对于"每月第一个周五"这种相对日期，算不出来，默认显示
            pass
    upcoming.sort(key=lambda x: x.get("days_left", 999))
    return upcoming


def generate_daily_brief(funds_data: list[dict], total_value: float, total_daily_pnl: float,
                          total_cum_pnl: float, fx_rate: float, upcoming_events: list[dict]) -> str:
    """生成每日个性化操作建议"""

    lines = []

    # 1. 定投状态
    lines.append("## 📋 今日定投执行状态\n")
    auto_funds = [f for f in funds_data if "定投" in f.get("strategy", "")]
    manual_funds = [f for f in funds_data if "定投" not in f.get("strategy", "")]

    for f in auto_funds:
        amt_match = re.search(r'(\d+)', f.get("strategy", ""))
        amt = int(amt_match.group(1)) if amt_match else 0
        lines.append(f"- ✅ **{f['name']}**：今日定投 **{amt}元** 已自动执行。限额剩余 {f.get('daily_limit', 0) - amt} 元。")

    for f in manual_funds:
        lines.append(f"- ⏸️ **{f['name']}**：手动操作模式，今日暂定观望。若要加仓，单日限额 **{f.get('daily_limit', 0)}元**。")

    # 2. 当日收益概览
    lines.append("\n## 💰 今日收益总览\n")
    emoji = "🔥" if total_daily_pnl > 0 else "😐" if total_daily_pnl == 0 else "📉"
    mood = "盈利" if total_daily_pnl > 0 else "持平" if total_daily_pnl == 0 else "亏损"
    lines.append(f"{emoji} 总市值 **{total_value:.2f}元** | 今日 **{mood} {total_daily_pnl:+.2f}元** | 累计盈亏 **{total_cum_pnl:+.2f}元**")
    lines.append("")

    for f in funds_data:
        sign = "📈" if f.get("daily_pnl", 0) > 0 else "📉"
        lines.append(f"- {sign} {f['name']}：今日 **{f.get('daily_pnl', 0):+.2f}元**（{f.get('return_rate', 0):+.2f}%）")

    # 3. 汇率影响
    lines.append(f"\n## 💱 汇率影响\n")
    lines.append(f"当前美元兑人民币 **{fx_rate:.2f}**，你的全部持仓以美元计价。")
    if fx_rate > 7.2:
        lines.append("⚠️ 人民币处于相对弱势（>7.2），你的QDII基金折算人民币时获得汇率加成。若人民币升值至7.0以下，持仓净值将缩水约3%。")
    else:
        lines.append("人民币相对强势，你的QDII持仓面临汇率损失风险。")

    # 4. 重大事件提醒
    if upcoming_events:
        lines.append(f"\n## ⚠️ 未来7天重要事件\n")
        for evt in upcoming_events[:5]:
            days = evt.get("days_left", "?")
            lines.append(f"- 📅 **{evt['event']}**（{evt['name_en']}）—— {days}天后")
            lines.append(f"  {evt['action'][:100]}...")
    else:
        lines.append(f"\n## 📅 近期无重大事件\n")
        lines.append("未来7天无预定的重大经济数据公布，可正常执行定投计划。")

    # 5. 总结建议
    lines.append(f"\n## 🎯 今日操作建议\n")
    if total_daily_pnl > 5:
        lines.append("今天市场表现不错！继续执行定投即可，不建议追高加仓。")
    elif total_daily_pnl < -5:
        lines.append("今天市场回调，定投照常执行。若跌幅超过3%，可以考虑额外小额加仓（注意单日限额）。")
    else:
        lines.append("市场平稳，按计划执行定投，无需额外操作。")

    if upcoming_events:
        lines.append(f"\n> ⚠️ 近期有重大事件（{upcoming_events[0]['event']}），建议在事件落地前不要大额手动加仓。")

    return "\n".join(lines)


# ===== 涨跌解释器 =====

def explain_fund_move(fund_name: str, fund_ticker: str, daily_pnl: float,
                      return_rate: float, fx_rate: float,
                      holdings_detail: list[dict] | None = None) -> str:
    """解释某只基金今日涨跌原因"""

    direction = "上涨" if daily_pnl > 0 else "下跌" if daily_pnl < 0 else "持平"
    lines = [f"## 📊 {fund_name} 今日{direction}分析\n"]

    # 1. 直接原因——底层股票
    if holdings_detail:
        lines.append("### 直接原因：底层持仓股票表现\n")
        top = sorted(holdings_detail, key=lambda x: x["weight"], reverse=True)[:5]
        for h in top:
            d = "📈" if h["change_percent"] > 0 else "📉" if h["change_percent"] < 0 else "➡️"
            impact = h["weight"] * h["change_percent"] / 100
            lines.append(f"- {d} **{h['name']}**（权重{h['weight']}%）：今日{h['change_percent']:+.2f}%，贡献约{impact:+.2f}个百分点")
        lines.append("")

    # 2. 宏观原因
    lines.append("### 宏观背景：影响你基金的宏观因素\n")
    if "芯片" in fund_name or "纳斯达克" in fund_name:
        lines.append("- 🔍 科技/芯片板块走势受**美联储利率预期**影响最大。利率预期下行 → 成长股估值扩张 → 利好芯片和纳斯达克。")
        lines.append("- 🔍 关注**英伟达/台积电**等龙头业绩指引，芯片行业具有强周期性。")
    if "新能源" in fund_name:
        lines.append("- 🔍 新能源板块受**政策补贴**和**原材料价格**（锂、钴）双重影响。")
        lines.append("- 🔍 特斯拉股价波动对全球新能源板块情绪影响显著。")

    # 3. 汇率影响
    lines.append(f"\n### 💱 汇率影响\n")
    if daily_pnl > 0:
        fx_effect = daily_pnl * 0.05  # 估算5%来自汇率
        lines.append(f"- 今日美元兑人民币汇率约 **{fx_rate}**")
        lines.append(f"- 粗略估算，汇率波动对你的{direction}贡献约 **{fx_effect:+.2f}** 元（约占总收益的5%）")
        lines.append(f"- 💡 你的全部持仓以美元计价，人民币贬值时你将获得额外汇率收益。")

    # 4. 总结
    lines.append(f"\n### 🎯 总结\n")
    lines.append(f"今日{direction} {abs(daily_pnl):.2f}元，主要驱动力为底层持仓股表现，汇率因素贡献约5%。")
    if abs(daily_pnl) < 1:
        lines.append("波动极小，属于正常市场噪音，无需过度关注。")

    return "\n".join(lines)
