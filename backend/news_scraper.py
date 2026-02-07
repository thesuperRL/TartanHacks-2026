import requests
from bs4 import BeautifulSoup
import feedparser
import time
from typing import List, Dict
import random

# Try to import newspaper, but make it optional
try:
    from newspaper import Article
    NEWSPAPER_AVAILABLE = True
except ImportError:
    NEWSPAPER_AVAILABLE = False
    print("Warning: newspaper3k not available. Article summaries will be limited to RSS feed data.")

class NewsScraper:
    def __init__(self):
        # Diverse news sources - financial and political
        self.financial_sources = [
            'https://feeds.reuters.com/reuters/businessNews',
            'https://feeds.bloomberg.com/markets/news.rss',
            'https://www.ft.com/?format=rss',
            'https://feeds.finance.yahoo.com/rss/2.0/headline?s=finance&region=US&lang=en-US',
            'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        ]
        
        self.political_sources = [
            'https://feeds.reuters.com/reuters/topNews',
            'https://feeds.reuters.com/reuters/worldNews',
            'https://rss.cnn.com/rss/edition.rss',
            'https://feeds.bbci.co.uk/news/world/rss.xml',
            'https://www.theguardian.com/world/rss',
            'https://feeds.npr.org/1001/rss.xml',
            'https://feeds.washingtonpost.com/rss/world',
        ]
        
        self.scraped_articles = []
    
    def scrape_rss_feed(self, feed_url: str) -> List[Dict]:
        """Scrape articles from an RSS feed"""
        articles = []
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]:  # Limit to 10 per feed
                try:
                    # Use newspaper3k if available for better article extraction
                    if NEWSPAPER_AVAILABLE:
                        try:
                            article = Article(entry.link)
                            article.download()
                            article.parse()
                            summary = article.summary if article.summary else entry.get('summary', '')
                            full_text = article.text[:1000] if article.text else ''
                        except Exception as e:
                            # Fallback to RSS data if newspaper fails
                            summary = entry.get('summary', '')
                            full_text = ''
                    else:
                        # Use RSS feed data directly
                        summary = entry.get('summary', '')
                        full_text = ''
                    
                    # Validate and clean URL
                    article_url = entry.link
                    if not article_url or not isinstance(article_url, str):
                        print(f"Warning: Invalid URL for article '{entry.title}': {article_url}")
                        continue
                    
                    # Ensure URL is properly formatted
                    article_url = article_url.strip()
                    if not article_url.startswith(('http://', 'https://')):
                        print(f"Warning: URL doesn't start with http:// or https://: {article_url}")
                        continue
                    
                    articles.append({
                        'title': entry.title,
                        'url': article_url,
                        'summary': summary,
                        'published': entry.get('published', ''),
                        'source': feed.feed.get('title', 'Unknown'),
                        'full_text': full_text,
                    })
                    time.sleep(0.5)  # Be respectful to servers
                except Exception as e:
                    print(f"Error scraping article {entry.link}: {e}")
                    continue
        except Exception as e:
            print(f"Error parsing feed {feed_url}: {e}")
        
        return articles
    
    def scrape_all_sources(self):
        """Scrape all configured news sources"""
        all_articles = []
        
        print("Scraping financial news sources...")
        for source in self.financial_sources:
            articles = self.scrape_rss_feed(source)
            for article in articles:
                article['category'] = 'financial'
            all_articles.extend(articles)
        
        print("Scraping political news sources...")
        for source in self.political_sources:
            articles = self.scrape_rss_feed(source)
            for article in articles:
                article['category'] = 'political'
            all_articles.extend(articles)
        
        self.scraped_articles = all_articles
        print(f"Scraped {len(all_articles)} articles total")
        return all_articles
