#!/usr/bin/env python3
"""
Script to rescrape articles with the updated URL validation system.
Run this from the backend directory after ensuring dependencies are installed.
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from news_scraper import NewsScraper
    from news_processor import NewsProcessor
    
    print("=" * 60)
    print("Starting article rescraping with URL validation...")
    print("=" * 60)
    
    # Initialize components
    scraper = NewsScraper()
    processor = NewsProcessor()
    
    # Scrape all sources
    print("\n[1/3] Scraping articles from RSS feeds...")
    articles = scraper.scrape_all_sources()
    print(f"✓ Scraped {len(articles)} articles from RSS feeds")
    
    # Count articles with valid URLs
    valid_articles = [a for a in articles if a.get('url') and isinstance(a.get('url'), str) and a.get('url').strip().startswith(('http://', 'https://'))]
    print(f"✓ {len(valid_articles)} articles have valid URLs")
    
    if len(valid_articles) < len(articles):
        print(f"⚠ {len(articles) - len(valid_articles)} articles were filtered out due to invalid URLs")
    
    # Process articles
    print("\n[2/3] Processing articles (detecting locations, categorizing)...")
    processed = processor.process_articles(valid_articles, mode='economic')
    print(f"✓ Processed {len(processed)} articles successfully")
    
    # Verify URLs in processed articles
    articles_with_urls = [a for a in processed if a.get('url') and isinstance(a.get('url'), str) and a.get('url').strip().startswith(('http://', 'https://'))]
    print(f"✓ {len(articles_with_urls)} processed articles have valid URLs")
    
    print("\n[3/3] Saving articles...")
    processor.save_articles()
    print("✓ Articles saved to articles_data.json")
    
    print("\n" + "=" * 60)
    print("Rescraping completed successfully!")
    print(f"Total articles available: {len(processed)}")
    print("=" * 60)
    
except ImportError as e:
    print(f"Error: Missing required module. Please install dependencies:")
    print(f"  pip install -r requirements.txt")
    print(f"\nError details: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error during rescraping: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
