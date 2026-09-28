# Crypto scanner bot (legacy, standalone)

A standalone Python script that scans CoinGecko for heavily-dropped coins and sends Telegram alerts. It is **unrelated to DynaTech AI Studio** and shares no code, dependencies or configuration with it.

```bash
cd legacy/crypto-bot
pip install -r requirements.txt
export TELEGRAM_TOKEN=... TELEGRAM_CHAT_ID=... COINGECKO_API_KEY=...
python crypto_bot.py
```

The script exits immediately with a clear message if any variable is missing. Credentials were previously hardcoded in this file and exist in this repository's git history, so those old values must be treated as compromised and rotated (revoke the Telegram token via @BotFather; regenerate the CoinGecko key).
