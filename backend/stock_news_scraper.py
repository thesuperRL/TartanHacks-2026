import asyncio
from crawl4ai import AsyncWebCrawler
from dedalus_labs import Dedalus
import os
from dotenv import load_dotenv
import json
import hashlib
from datetime import datetime, timedelta

load_dotenv()

class LLMNewsAnalysis:
    def __init__(self, api_key: str = None):
      self.api_key = api_key or os.environ.get('DEDALUS_API_KEY')
      if not self.api_key:
        raise ValueError(
            "API key required! Set DEDALUS_API_KEY environment variable "
            "or pass api_key parameter"
        )
      self.client = Dedalus(api_key=self.api_key)
      self.model = "claude-sonnet-4-5-20250929"
    def analyze(self, content: str):
        prompt = {
        "summary": """
        Analyze the content from this markdown file and extract some information
        from the different articles that were written within the past 2 days.
        Include:
        - Headlines
        - predictions for future stock trends(numerical prediction of stock performance)
        - sentiment analysis for each article(bullish, bearish, neutral)

        Keep it to 100 words per stock analyzed
        """
        }
        message = self.client.chat.completions.create(
          model=self.model,
          messages=[
             {
                "role": "user",
                "content": f"{prompt}\nStock News Content:\n{content}"
             }
          ],
          max_tokens = 500
        )
        return message.choices[0].message.content
class BaseScraper:
    def __init__(self, cache_dir: str = "./cache"):
        self.cache_dir = cache_dir
        self.source_name = self.__class__.__name__.replace('Scraper', '').lower()
        os.makedirs(cache_dir, exist_ok=True)

    def build_url(self, ticker):
        pass
    def parse_content(self, markdown):
        pass
    def get_cache_path(self, ticker: str) -> str:
        """Get cache file path for a ticker"""
        date_str = datetime.now().strftime('%Y%m%d')
        cache_key = hashlib.md5(f"{self.source_name}_{ticker}_{date_str}".encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{cache_key}.json")
    def get_cached_data(self, ticker):
        cache_path = self.get_cache_path(ticker)
        if not os.path.exists(cache_path):
            return None
        try:
            with open(cache_path, 'r') as f:
                return json.load(f)
        except:
            return None
    def save_to_cache(self, ticker, data):
        cache_path = self.get_cache_path(ticker)
        try:
            with open(cache_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print("failed to save cache: {e}")
    async def scrape(self, ticker, use_cache=True):
        if use_cache:
            cached = self.get_cached_data(ticker)
            if cached:
                print(f"cache data for: {self.source_name}")
                return cached
        urls = []
        urls.append(self.build_url(ticker))
        async with AsyncWebCrawler(verbose=True) as crawler:
            tasks = []
            for url in urls:
                tasks.append(crawler.arun(url=url))
            result = await asyncio.gather(*tasks)
            for ticker, result in zip(ticker, result):
                if result.success:
                    parsed = self.parse_content(result.markdown)
                    data = {
                        'source': self.source_name,
                        'ticker': ticker,
                        'url': url,
                        'scraped at': datetime.now().isoformat(),
                        'success':  True,
                        'data': parsed
                    }
                    self.save_to_cache(ticker, data)
                    return data
        return result
class YahooScraper(BaseScraper):
    def build_url(self, ticker):
        return f"https://finance.yahoo.com/quote/{ticker}/latest-news"
    def parse_content(self, markdown):
        lines = markdown.split('\n')
        headlines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 20]
        return {
            'headlines': headlines[:10],
            'full_content': markdown[:5000],
            'headline_count': len(headlines)
        }
class MarketWatchScraper(BaseScraper):
    def build_url(self, ticker):
        return f"https://www.marketwatch.com/investing/stock/{ticker.lower()}"
    def parse_content(self, markdown):
        lines = markdown.split('\n')
        headlines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 20]
        return {
            'headlines': headlines[:10],
            'full_content': markdown[:5000],
            'headline_count': len(headlines)
        }
class SeekingAlphaScraper(BaseScraper):
    def build_url(self, ticker):
        return f"https://seekingalpha.com/symbol/{ticker.upper()}"
    def parse_content(self, markdown):
        lines = markdown.split('\n')
        headlines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 20]
        return {
            'headlines': headlines[:10],
            'full_content': markdown[:5000],
            'headline_count': len(headlines)
        }
class BenzingaScraper(BaseScraper):
    def build_url(self, ticker):
        return f"https://www.benzinga.com/quote/{ticker.upper()}"
    def parse_content(self, markdown):
        lines = markdown.split('\n')
        headlines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 20]
        return {
            'headlines': headlines[:10],
            'full_content': markdown[:5000],
            'headline_count': len(headlines)
        }
class FinvizScraper(BaseScraper):
    def build_url(self, ticker):
        return f"https://finviz.com/quote.ashx?t={ticker.upper()}"
    def parse_content(self, markdown):
        lines = markdown.split('\n')
        headlines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 20]
        return {
            'headlines': headlines[:10],
            'full_content': markdown[:5000],
            'headline_count': len(headlines)
        }
class GoogleNewsScraper(BaseScraper):
    def build_url(self, ticker):
        query = f"{ticker}+stock+news"
        return f"https://news.google.com/search?q={query}"
    def parse_content(self, markdown):
        lines = markdown.split('\n')
        headlines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 20]
        return {
            'headlines': headlines[:10],
            'full_content': markdown[:5000],
            'headline_count': len(headlines)
        }
class ScraperAggregator:
    def __init__(self, sources: List[str] = None):
        self.available_scrapers = {
            'yahoo': YahooScraper,
            'marketwatch': MarketWatchScraper,
            'seekingalpha': SeekingAlphaScraper,
            'benzinga': BenzingaScraper,
            'finviz': FinvizScraper,
            'googlenews': GoogleNewsScraper
        }
        if sources is None:
            sources = list(self.available_scrapers)
        self.scrapers = {}
        for source in sources:
            if source in self.available_scrapers:
                self.scrapers[source] = self.available_scrapers[source]()
            else:
                print("unknown source")

    async def scrape_all_sources(self, tickers, use_cache: bool=True):
        tasks = []
        for ticker in tickers:
            for source_name, scraper in self.scrapers.items():
                task = scraper.scrape(ticker, use_cache=use_cache)
                tasks.append(task)
        result = await asyncio.gather(*tasks)
        return result
    
    def aggregateHeadlines(self, scrape_results):
        all_headlines = []
        seen = set()
        # headlines = scrape_results['data'].get('headlines', [])
        for result in scrape_results:
            headlines = result['data'].get('headlines', [])
            for headline in headlines:
                if headline.lower() not in seen:
                    seen.add(headline.lower())
                    all_headlines.append(headline)

    def combineData(self, scrape_results):
        combined = []
        content = scrape_results['data'].get('full_content', [])
        if content:
            combined.append(content)
        return "\n".join(combined)

async def analyze(tickers):
    analyzer = LLMNewsAnalysis()
    aggregator = ScraperAggregator(sources=['googlenews'])
    result = await aggregator.scrape_all_sources(tickers)
    result = analyzer.analyze(result)
    print(result)
    
async def analyzeSources(tickers):
    aggregator = ScraperAggregator(sources=['yahoo'])
    result = await aggregator.scrape_all_sources(tickers)
    headlines = aggregator.aggregateHeadlines(result)
    print(result)

asyncio.run(analyze(["AAPL","GOOG"]))
# ,"GOOG","MSFT","NVDA","WMT","TSLA","JPM","COMP","K"