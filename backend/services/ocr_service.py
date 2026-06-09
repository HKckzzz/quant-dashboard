"""OCR识别服务 - 用于识别支付宝实盘截图"""
import os
import re
from datetime import datetime
from typing import Optional
from PIL import Image


# OCR引擎（延迟加载，避免首次启动过慢）
_ocr_engine = None


def _get_ocr():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from paddleocr import PaddleOCR
            _ocr_engine = PaddleOCR(lang="ch", use_angle_cls=True, show_log=False)
        except ImportError:
            _ocr_engine = None
    return _ocr_engine


async def ocr_recognize(image_path: str) -> list[dict]:
    """对截图进行OCR识别，提取交易记录"""
    engine = _get_ocr()
    if engine is None:
        # 回退方案：返回提示，让前端使用Tesseract.js
        return [{"error": "PaddleOCR未安装，请使用浏览器端OCR或安装: pip install paddleocr paddlepaddle"}]

    try:
        result = engine.ocr(image_path, cls=True)
        if not result or not result[0]:
            return [{"error": "未能识别到文字"}]

        # 提取所有文字
        texts = []
        for line in result[0]:
            text = line[1][0]
            confidence = line[1][1]
            bbox = line[0]
            texts.append({
                "text": text,
                "confidence": confidence,
                "bbox": bbox,  # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
                "y_position": bbox[0][1],  # 用于按行排序
            })

        # 按Y坐标排序（从上到下）
        texts.sort(key=lambda x: x["y_position"])

        # 提取交易记录
        trades = _extract_trades(texts)
        return trades if trades else texts  # 如果没提取到交易，返回所有识别的文字

    except Exception as e:
        return [{"error": f"OCR识别失败: {str(e)}"}]


def _extract_trades(texts: list[dict]) -> list[dict]:
    """从OCR识别结果中提取交易记录"""
    all_text_lines = []
    current_line = ""
    current_y = None
    Y_THRESHOLD = 15  # Y坐标容差

    # 按行合并文本
    for t in texts:
        y = t["y_position"]
        if current_y is None or abs(y - current_y) > Y_THRESHOLD:
            if current_line:
                all_text_lines.append(current_line)
            current_line = t["text"]
            current_y = y
        else:
            current_line += " " + t["text"]
    if current_line:
        all_text_lines.append(current_line)

    trades = []
    # 匹配模式：基金名称 + 买入/卖出 + 金额
    trade_patterns = [
        # 卖出 广发纳斯达克 10000元
        re.compile(r"(买入|卖出|申购|赎回|减仓|加仓|清仓)[：:\s]*([一-龥a-zA-Z0-9]+(?:ETF|QDII|LOF|FOF)?(?:联接)?[A-Za-z]?).*?([\d,]+\.?\d*)\s*(元|万|万份|份|%)"),
        # 广发纳斯达克 卖出 10000
        re.compile(r"([一-龥a-zA-Z0-9]+(?:ETF|QDII|LOF|FOF)?).*?(买入|卖出|申购|赎回|减仓|加仓|清仓).*?([\d,]+\.?\d*)\s*(元|万|万份|份)"),
        # 操作了 XX基金
        re.compile(r"([一-龥a-zA-Z0-9]+(?:ETF|QDII|LOF|FOF)?).*?(买入|卖出|加仓|减仓)"),
    ]

    for line in all_text_lines:
        for pattern in trade_patterns:
            m = pattern.search(line)
            if m:
                groups = m.groups()
                if len(groups) >= 2:
                    action = groups[1] if len(groups) > 1 else groups[0]
                    fund_name = groups[0] if groups[0] not in ["买入", "卖出", "申购", "赎回", "减仓", "加仓", "清仓"] else "未知基金"

                    # 标准化操作类型
                    if action in ["买入", "申购", "加仓"]:
                        action_en = "buy"
                    elif action in ["卖出", "赎回", "减仓", "清仓"]:
                        action_en = "sell"
                    else:
                        action_en = action

                    amount_str = groups[2].replace(",", "") if len(groups) > 2 else "0"
                    unit = groups[3] if len(groups) > 3 else "元"

                    try:
                        amount = float(amount_str)
                        if unit == "万":
                            amount *= 10000
                    except ValueError:
                        amount = 0

                    trades.append({
                        "fund_name": fund_name,
                        "action": action_en,
                        "action_display": action,
                        "amount": amount,
                        "raw_line": line,
                    })
                    break

    return trades


async def ocr_from_bytes(image_bytes: bytes) -> list[dict]:
    """从字节流进行OCR识别"""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(image_bytes)
        tmp_path = f.name

    try:
        return await ocr_recognize(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
