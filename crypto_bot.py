import requests
import time
import json
import os
import datetime
import numpy as np

# ===== הגדרות =====
TELEGRAM_TOKEN = "8737917109:AAHco70kUmWfabFkFE5mgwirw8neiknRChg"
CHAT_ID = "-1003821216022"
COINGECKO_API_KEY = "CG-tuWBYtHHMQUwhK9TqsgTPsBz"
SCAN_INTERVAL = 15 * 60
ALERT_COOLDOWN = 24 * 60 * 60

# ===== קריטריונים =====
MIN_DROP_24H = -75.0
MIN_VOLUME = 1_000_000
MIN_VOL_MC_RATIO = 0.15
MAX_RSI = 30

# ===== headers עם API Key =====
HEADERS = {"x-cg-demo-api-key": COINGECKO_API_KEY}

ALERTED_FILE = "alerted_coins.json"
LOG_FILE = "bot_log.txt"


def log(msg):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def send_telegram(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    try:
        r = requests.post(url, json=payload, timeout=10)
        return r.status_code == 200
    except Exception as e:
        log(f"שגיאה בשליחת טלגרם: {e}")
        return False


def load_alerted():
    if os.path.exists(ALERTED_FILE):
        with open(ALERTED_FILE, "r") as f:
            return json.load(f)
    return {}


def save_alerted(data):
    with open(ALERTED_FILE, "w") as f:
        json.dump(data, f)


def was_alerted(coin_id, alerted):
    if coin_id not in alerted:
        return False
    elapsed = time.time() - alerted[coin_id]
    return elapsed < ALERT_COOLDOWN


def mark_alerted(coin_id, alerted):
    alerted[coin_id] = time.time()
    save_alerted(alerted)


def calculate_rsi(prices, period=14):
    if len(prices) < period + 1:
        return None
    prices = np.array(prices)
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    if avg_loss == 0:
        return 100
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
    return round(rsi, 1)


def get_coin_history(coin_id):
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
    params = {"vs_currency": "usd", "days": 2, "interval": "hourly"}
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=15)
        if r.status_code == 200:
            data = r.json()
            prices = [p[1] for p in data.get("prices", [])]
            return prices
    except:
        pass
    return []


def get_top_coins(page=1):
    url = "https://api.coingecko.com/api/v3/coins/markets"
    params = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 250,
        "page": page,
        "price_change_percentage": "1h,24h,7d",
        "sparkline": False
    }
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=20)
        if r.status_code == 200:
            return r.json()
        elif r.status_code == 429:
            log("Rate limit - ממתין 60 שניות")
            time.sleep(60)
        else:
            log(f"שגיאת API: {r.status_code}")
    except Exception as e:
        log(f"שגיאה: {e}")
    return []


def calculate_score(coin, rsi, history_pumped):
    score = 0
    drop = abs(coin.get("price_change_percentage_24h", 0))
    vol = coin.get("total_volume", 0)
    mc = coin.get("market_cap", 1)
    vol_mc = vol / mc if mc > 0 else 0

    if drop >= 75:
        score += 30
    elif drop >= 10:
        score += 10
    elif drop >= 1:
        score += 5

    if vol_mc >= 0.5:
        score += 20
    elif vol_mc >= 0.15:
        score += 10
    else:
        score += 5

    if rsi is not None:
        if rsi < 20:
            score += 20
        elif rsi < 30:
            score += 10
        else:
            score += 5

    if history_pumped:
        score += 15

    change_1h = coin.get("price_change_percentage_1h_in_currency", 0) or 0
    if change_1h > 0:
        score += 5

    return min(score, 100)


def score_emoji(score):
    if score >= 80:
        return "🟢"
    elif score >= 60:
        return "🟡"
    else:
        return "🔴"


def check_history_pump(prices):
    if len(prices) < 10:
        return False
    mid = len(prices) // 2
    low = min(prices[:mid])
    recent = prices[-5:]
    avg_recent = sum(recent) / len(recent)
    if low > 0 and avg_recent > low * 1.1:
        return True
    return False


def format_number(n):
    if n >= 1_000_000_000:
        return f"${n/1_000_000_000:.2f}B"
    elif n >= 1_000_000:
        return f"${n/1_000_000:.2f}M"
    elif n >= 1_000:
        return f"${n/1_000:.1f}K"
    return f"${n:.2f}"


def build_alert(coin, rsi, score, vol_mc):
    name = coin.get("name", "")
    symbol = coin.get("symbol", "").upper()
    price = coin.get("current_price", 0)
    drop_24h = coin.get("price_change_percentage_24h", 0)
    change_1h = coin.get("price_change_percentage_1h_in_currency", 0) or 0
    vol = coin.get("total_volume", 0)
    mc = coin.get("market_cap", 0)
    coin_id = coin.get("id", "")
    ath = coin.get("ath", 0)
    ath_change = coin.get("ath_change_percentage", 0)

    emoji = score_emoji(score)
    rsi_str = str(rsi) if rsi else "N/A"
    change_1h_str = f"+{change_1h:.1f}%" if change_1h > 0 else f"{change_1h:.1f}%"
    change_1h_emoji = "📈" if change_1h > 0 else "📉"

    msg = f"""☢️ <b>Coin Alert</b> ☢️

<b>{name}</b> | {symbol}

💰 <b>מחיר:</b> ${price:.8g}
📉 <b>ירידה 24h:</b> {drop_24h:.2f}%
{change_1h_emoji} <b>שינוי 1h:</b> {change_1h_str}

📊 <b>Volume:</b> {format_number(vol)}
🏦 <b>Market Cap:</b> {format_number(mc)}
⚡ <b>יחס V/MC:</b> {vol_mc:.2f}

📈 <b>RSI:</b> {rsi_str}
🏆 <b>ATH:</b> ${ath:.8g} ({ath_change:.1f}%)

{emoji} <b>ציון:</b> {score}/100

🔗 <a href="https://coinmarketcap.com/currencies/{coin_id}/">CoinMarketCap</a> | <a href="https://www.coingecko.com/en/coins/{coin_id}">CoinGecko</a>"""
    return msg


def scan():
    log("מתחיל סריקה...")
    alerted = load_alerted()
    found = 0
    total = 0
    passed_drop = 0
    passed_vol = 0
    passed_ratio = 0

    for page in range(1, 4):
        coins = get_top_coins(page)
        if not coins:
            log(f"עמוד {page} - לא חזרו מטבעות!")
            break

        total += len(coins)
        log(f"עמוד {page}: קיבלתי {len(coins)} מטבעות")

        for coin in coins:
            drop_24h = coin.get("price_change_percentage_24h", 0) or 0
            vol = coin.get("total_volume", 0) or 0
            mc = coin.get("market_cap", 1) or 1
            coin_id = coin.get("id", "")

            if drop_24h > MIN_DROP_24H:
                continue
            passed_drop += 1

            if vol < MIN_VOLUME:
                continue
            passed_vol += 1

            vol_mc = vol / mc
            if vol_mc < MIN_VOL_MC_RATIO:
                continue
            passed_ratio += 1

            if was_alerted(coin_id, alerted):
                continue

            prices = get_coin_history(coin_id)
            rsi = calculate_rsi(prices) if prices else None
            history_pumped = check_history_pump(prices)

            score = calculate_score(coin, rsi, history_pumped)

            msg = build_alert(coin, rsi, score, vol_mc)
            if send_telegram(msg):
                mark_alerted(coin_id, alerted)
                found += 1
                log(f"התראה נשלחה: {coin.get('symbol','').upper()} | ציון: {score}")

            time.sleep(1)

        time.sleep(3)

    log(f"סיכום: {total} מטבעות | ירידה: {passed_drop} | Volume: {passed_vol} | יחס: {passed_ratio} | נשלחו: {found}")
    send_telegram(
        f"🔍 <b>סיכום סריקה</b>\n\n"
        f"📊 סרקתי: {total} מטבעות\n"
        f"📉 עברו ירידה ({abs(MIN_DROP_24H)}%+): {passed_drop}\n"
        f"💰 עברו Volume: {passed_vol}\n"
        f"⚡ עברו יחס V/MC: {passed_ratio}\n"
        f"{'✅ נשלחו ' + str(found) + ' התראות!' if found > 0 else '😴 לא נמצאו מטבעות'}"
    )
    return found


def main():
    log("בוט מטבעות קריפטו מתחיל...")
    startup_msg = (
        f"🤖 <b>בוט קריפטו הופעל!</b>\n\n"
        f"⚙️ <b>הגדרות נוכחיות:</b>\n"
        f"📉 סף ירידה: {abs(MIN_DROP_24H)}%\n"
        f"⏱ סריקה כל: {SCAN_INTERVAL // 60} דקות\n"
        f"💰 Volume מינימלי: {format_number(MIN_VOLUME)}\n"
        f"⚡ יחס V/MC מינימלי: {MIN_VOL_MC_RATIO}\n"
        f"📊 RSI מקסימלי: {MAX_RSI}\n\n"
        f"⏳ סריקה ראשונה מתחילה עכשיו..."
    )
    send_telegram(startup_msg)

    while True:
        try:
            scan()
        except Exception as e:
            err = f"שגיאה כללית: {e}"
            log(err)
            send_telegram(f"⚠️ <b>שגיאה בבוט:</b>\n{err}")

        log(f"ממתין {SCAN_INTERVAL // 60} דקות לסריקה הבאה...")
        time.sleep(SCAN_INTERVAL)


if __name__ == "__main__":
    main()
