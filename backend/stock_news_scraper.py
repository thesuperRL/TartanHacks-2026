import asyncio
from crawl4ai import AsyncWebCrawler
from dedalus_labs import Dedalus
import os
from dotenv import load_dotenv

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
async def analyze(tickers):
    analyzer = LLMNewsAnalysis()
    async with AsyncWebCrawler(verbose=True) as crawler:
        tasks = []
        for ticker in tickers:
            task = crawler.arun(
                url=f"https://finance.yahoo.com/quote/{ticker}/news"
            )
            tasks.append(task)
        result = await asyncio.gather(*tasks)

        for ticker, result in zip(tickers, result):
            if result.success:
                print(f"{ticker}: Scraped {len(result.markdown)} characters")
    result = analyzer.analyze(result.markdown)
    print(result)
      
asyncio.run(analyze(["AAPL"]))
# ,"GOOG","MSFT","NVDA","WMT","TSLA","JPM","COMP","K"