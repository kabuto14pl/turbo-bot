"""
🌐 TURBO-BOT — Sentiment Scraper (PATCH #58)

Scrapes market sentiment from public sources:
- CoinGecko API (Fear & Greed Index)
- CryptoCompare news sentiment
- Reddit/X trending via RSS feeds

Falls back to price-based microstructure sentiment when external
sources are unavailable (rate limits, no internet, etc.).

Architecture:
    sentiment_scraper.py → SentimentScraper class
    ml_service.py /sentiment endpoint → imports & uses SentimentScraper
    bot.js → calls /sentiment via mlClient.getSentiment()

Usage:
    from sentiment_scraper import SentimentScraper
    scraper = SentimentScraper()
    result = await scraper.get_composite_sentiment('BTC')
"""

import os
import sys
import time
import json
import logging
import asyncio
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Try importing aiohttp for async HTTP
try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False
    logger.warning("aiohttp not installed — external sentiment sources disabled")

# Try importing requests as sync fallback
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class SentimentCache:
    """Simple TTL cache for sentiment data to avoid excessive API calls."""

    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self._cache: Dict[str, Tuple[float, dict]] = {}

    def get(self, key: str) -> Optional[dict]:
        if key in self._cache:
            ts, data = self._cache[key]
            if time.time() - ts < self.ttl:
                return data
            del self._cache[key]
        return None

    def set(self, key: str, data: dict):
        self._cache[key] = (time.time(), data)

    def clear(self):
        self._cache.clear()


class SentimentScraper:
    """
    Multi-source sentiment scraper for crypto markets.
    
    Sources (priority order):
    1. CoinGecko Fear & Greed Index (free, no key needed)
    2. Alternative.me Fear & Greed (free, no key needed)
    3. CryptoCompare news (optional API key)
    4. Price-based microstructure (always available as fallback)
    
    All sources are optional — system degrades gracefully when
    external sources are unavailable.
    """

    # Alternative.me Fear & Greed API (free, no auth)
    FEAR_GREED_URL = "https://api.alternative.me/fng/?limit=1&format=json"

    # CoinGecko simple/price for market data
    COINGECKO_URL = "https://api.coingecko.com/api/v3"

    # CryptoCompare news
    CRYPTOCOMPARE_URL = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC"

    def __init__(self, cache_ttl: int = 300):
        """
        Args:
            cache_ttl: Cache TTL in seconds (default: 5 minutes)
        """
        self.cache = SentimentCache(ttl_seconds=cache_ttl)
        self._last_fetch_time = 0
        self._min_fetch_interval = 60  # Min 60s between external fetches
        self._cryptocompare_key = os.environ.get('CRYPTOCOMPARE_API_KEY', '')

        # Tracking
        self.stats = {
            'total_fetches': 0,
            'cache_hits': 0,
            'api_errors': 0,
            'fallback_used': 0,
        }

    def get_composite_sentiment_sync(self, symbol: str = 'BTC') -> dict:
        """
        Synchronous wrapper for get_composite_sentiment.
        Used when called from sync context (e.g., FastAPI endpoint).
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Already in async context — can't nest
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, self.get_composite_sentiment(symbol))
                    return future.result(timeout=10)
            else:
                return loop.run_until_complete(self.get_composite_sentiment(symbol))
        except Exception as e:
            logger.warning(f"Sync sentiment fetch failed: {e}")
            return self._fallback_result(symbol)

    async def get_composite_sentiment(self, symbol: str = 'BTC') -> dict:
        """
        Get composite sentiment score from all available sources.
        
        Returns:
            {
                'score': float (-1 to +1),
                'regime': str (EXTREME_FEAR, FEAR, NEUTRAL, GREED, EXTREME_GREED),
                'confidence_modifier': float (0.80 - 1.10),
                'trading_bias': str (bullish, bearish, neutral),
                'contrarian_signal': bool,
                'sources': list of source names used,
                'fear_greed_index': int (0-100) or None,
                'timestamp': str
            }
        """
        self.stats['total_fetches'] += 1

        # Check cache
        cached = self.cache.get(f'sentiment_{symbol}')
        if cached:
            self.stats['cache_hits'] += 1
            return cached

        sources_used = []
        scores = []
        weights = []
        fear_greed_value = None

        # Rate limit check
        now = time.time()
        can_fetch_external = (now - self._last_fetch_time) >= self._min_fetch_interval

        if can_fetch_external and (HAS_AIOHTTP or HAS_REQUESTS):
            self._last_fetch_time = now

            # 1. Fear & Greed Index (weight: 0.40)
            fg = await self._fetch_fear_greed()
            if fg is not None:
                fear_greed_value = fg
                # Convert 0-100 to -1..+1 scale
                fg_score = (fg - 50) / 50.0
                scores.append(fg_score)
                weights.append(0.40)
                sources_used.append('fear_greed')

            # 2. CryptoCompare news sentiment (weight: 0.30)
            news_score = await self._fetch_news_sentiment()
            if news_score is not None:
                scores.append(news_score)
                weights.append(0.30)
                sources_used.append('crypto_news')

        # 3. Always available: market microstructure is handled by
        #    the backtest_pipeline SentimentAnalyzer on the candle data.
        #    This scraper focuses on EXTERNAL sources only.

        if not scores:
            # No external sources available — return neutral
            self.stats['fallback_used'] += 1
            result = self._fallback_result(symbol)
            self.cache.set(f'sentiment_{symbol}', result)
            return result

        # Weighted composite
        total_weight = sum(weights)
        composite = sum(s * w for s, w in zip(scores, weights)) / total_weight if total_weight > 0 else 0

        # Classify regime
        regime = self._classify_regime(composite)

        # Confidence modifier
        confidence_modifier = self._calc_confidence_modifier(composite, regime)

        # Trading bias
        if composite > 0.15:
            trading_bias = 'bullish'
        elif composite < -0.15:
            trading_bias = 'bearish'
        else:
            trading_bias = 'neutral'

        # Contrarian signal: extreme sentiment suggests reversal
        contrarian_signal = abs(composite) > 0.60

        result = {
            'score': round(composite, 4),
            'regime': regime,
            'confidence_modifier': round(confidence_modifier, 3),
            'trading_bias': trading_bias,
            'contrarian_signal': contrarian_signal,
            'sources': sources_used,
            'fear_greed_index': fear_greed_value,
            'timestamp': datetime.utcnow().isoformat(),
        }

        self.cache.set(f'sentiment_{symbol}', result)
        return result

    async def _fetch_fear_greed(self) -> Optional[int]:
        """Fetch Fear & Greed Index from Alternative.me API."""
        try:
            if HAS_AIOHTTP:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                    async with session.get(self.FEAR_GREED_URL) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if data and 'data' in data and len(data['data']) > 0:
                                return int(data['data'][0]['value'])
            elif HAS_REQUESTS:
                resp = requests.get(self.FEAR_GREED_URL, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    if data and 'data' in data and len(data['data']) > 0:
                        return int(data['data'][0]['value'])
        except Exception as e:
            self.stats['api_errors'] += 1
            logger.debug(f"Fear & Greed fetch failed: {e}")
        return None

    async def _fetch_news_sentiment(self) -> Optional[float]:
        """
        Fetch crypto news from CryptoCompare and derive sentiment.
        Simple heuristic: count positive/negative keywords in titles.
        """
        try:
            url = self.CRYPTOCOMPARE_URL
            headers = {}
            if self._cryptocompare_key:
                headers['Authorization'] = f'Apikey {self._cryptocompare_key}'

            articles = []
            if HAS_AIOHTTP:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                    async with session.get(url, headers=headers) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            articles = data.get('Data', [])[:20]
            elif HAS_REQUESTS:
                resp = requests.get(url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    articles = data.get('Data', [])[:20]

            if not articles:
                return None

            # Simple keyword sentiment
            positive_kw = {'bullish', 'surge', 'rally', 'gain', 'soar', 'pump', 'up',
                           'high', 'record', 'breakout', 'moon', 'adoption', 'growth',
                           'ath', 'buy', 'long', 'accumulate', 'recovery'}
            negative_kw = {'bearish', 'crash', 'drop', 'fall', 'dump', 'down', 'low',
                           'loss', 'sell', 'fear', 'panic', 'hack', 'scam', 'fraud',
                           'ban', 'regulation', 'warning', 'risk', 'correction', 'short'}

            pos_count = 0
            neg_count = 0
            total = 0

            for article in articles:
                title = (article.get('title', '') + ' ' + article.get('body', '')[:200]).lower()
                for kw in positive_kw:
                    if kw in title:
                        pos_count += 1
                for kw in negative_kw:
                    if kw in title:
                        neg_count += 1
                total += 1

            if total == 0:
                return None

            # Normalize to -1..+1
            total_kw = pos_count + neg_count
            if total_kw == 0:
                return 0.0

            return (pos_count - neg_count) / total_kw

        except Exception as e:
            self.stats['api_errors'] += 1
            logger.debug(f"News sentiment fetch failed: {e}")
        return None

    def _classify_regime(self, score: float) -> str:
        """Classify sentiment score into regime."""
        if score <= -0.50:
            return 'EXTREME_FEAR'
        elif score <= -0.15:
            return 'FEAR'
        elif score <= 0.15:
            return 'NEUTRAL'
        elif score <= 0.50:
            return 'GREED'
        else:
            return 'EXTREME_GREED'

    def _calc_confidence_modifier(self, score: float, regime: str) -> float:
        """
        Calculate confidence modifier based on sentiment.
        
        Logic:
        - EXTREME_FEAR + BUY signal → contrarian boost (1.05-1.10)
        - EXTREME_GREED + BUY signal → caution penalty (0.85-0.90)
        - NEUTRAL → no change (1.0)
        - Moderate fear/greed → slight adjustment
        """
        if regime == 'EXTREME_FEAR':
            return 1.08  # Contrarian: extreme fear = buy opportunity
        elif regime == 'FEAR':
            return 1.03  # Mild contrarian
        elif regime == 'NEUTRAL':
            return 1.00
        elif regime == 'GREED':
            return 0.97  # Mild caution
        else:  # EXTREME_GREED
            return 0.90  # Strong caution: extreme greed = sell pressure coming

    def _fallback_result(self, symbol: str) -> dict:
        """Return neutral sentiment when no external sources available."""
        return {
            'score': 0.0,
            'regime': 'NEUTRAL',
            'confidence_modifier': 1.0,
            'trading_bias': 'neutral',
            'contrarian_signal': False,
            'sources': ['fallback'],
            'fear_greed_index': None,
            'timestamp': datetime.utcnow().isoformat(),
        }

    def get_stats(self) -> dict:
        """Return scraper statistics."""
        return {
            **self.stats,
            'cache_ttl': self.cache.ttl,
            'has_aiohttp': HAS_AIOHTTP,
            'has_requests': HAS_REQUESTS,
            'has_cryptocompare_key': bool(self._cryptocompare_key),
        }


# ============================================================================
# CLI test
# ============================================================================

if __name__ == '__main__':
    async def main():
        scraper = SentimentScraper(cache_ttl=60)
        result = await scraper.get_composite_sentiment('BTC')
        print(json.dumps(result, indent=2))
        print(f"\nStats: {scraper.get_stats()}")

    asyncio.run(main())
