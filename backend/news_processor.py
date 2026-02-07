import os
from openai import OpenAI
from geopy.geocoders import Nominatim
from typing import List, Dict
import json
import time

class NewsProcessor:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            print("Warning: OPENAI_API_KEY not set. Location detection will be limited.")
        else:
            self.client = OpenAI(api_key=self.api_key)
        
        self.geocoder = Nominatim(user_agent="news_viewer_app")
        self.processed_articles = []
        self.articles_file = 'articles_data.json'
        self.load_articles()
    
    def load_articles(self):
        """Load previously processed articles"""
        try:
            if os.path.exists(self.articles_file):
                with open(self.articles_file, 'r') as f:
                    self.processed_articles = json.load(f)
        except Exception as e:
            print(f"Error loading articles: {e}")
            self.processed_articles = []
    
    def save_articles(self):
        """Save processed articles to file"""
        try:
            with open(self.articles_file, 'w') as f:
                json.dump(self.processed_articles, f, indent=2)
        except Exception as e:
            print(f"Error saving articles: {e}")
    
    def detect_location_with_ai(self, article: Dict) -> Dict:
        """Use AI to detect the location mentioned in the article"""
        if not self.api_key:
            # Fallback: try to extract location from title/summary
            return self._fallback_location_detection(article)
        
        try:
            prompt = f"""Analyze this news article and determine the primary geographic location it refers to.
            
Title: {article.get('title', '')}
Summary: {article.get('summary', '')[:500]}

Respond with ONLY a JSON object in this format:
{{
    "location": "City, Country",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}

If no specific location can be determined, use "Unknown" for location."""
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a location detection assistant. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=150
            )
            
            result = json.loads(response.choices[0].message.content)
            location_str = result.get('location', 'Unknown')
            
            # Geocode the location
            coordinates = self._geocode_location(location_str)
            
            return {
                'location_name': location_str,
                'coordinates': coordinates,
                'confidence': result.get('confidence', 0.5)
            }
        except Exception as e:
            print(f"Error in AI location detection: {e}")
            return self._fallback_location_detection(article)
    
    def _fallback_location_detection(self, article: Dict) -> Dict:
        """Fallback location detection without AI"""
        # Simple keyword-based location detection
        common_locations = {
            'new york': {'lat': 40.7128, 'lng': -74.0060},
            'washington': {'lat': 38.9072, 'lng': -77.0369},
            'london': {'lat': 51.5074, 'lng': -0.1278},
            'paris': {'lat': 48.8566, 'lng': 2.3522},
            'tokyo': {'lat': 35.6762, 'lng': 139.6503},
            'beijing': {'lat': 39.9042, 'lng': 116.4074},
            'moscow': {'lat': 55.7558, 'lng': 37.6173},
        }
        
        text = (article.get('title', '') + ' ' + article.get('summary', '')).lower()
        for loc, coords in common_locations.items():
            if loc in text:
                return {
                    'location_name': loc.title(),
                    'coordinates': coords,
                    'confidence': 0.6
                }
        
        # Default to a random major city if nothing found
        import random
        default_locs = list(common_locations.values())
        return {
            'location_name': 'Unknown',
            'coordinates': random.choice(default_locs),
            'confidence': 0.3
        }
    
    def _geocode_location(self, location_str: str) -> Dict:
        """Geocode a location string to coordinates"""
        if location_str == 'Unknown':
            return {'lat': 0, 'lng': 0}
        
        try:
            location = self.geocoder.geocode(location_str, timeout=10)
            if location:
                return {'lat': location.latitude, 'lng': location.longitude}
        except Exception as e:
            print(f"Geocoding error for {location_str}: {e}")
        
        return {'lat': 0, 'lng': 0}
    
    def categorize_with_ai(self, article: Dict) -> str:
        """Use AI to categorize article as financial or political"""
        if not self.api_key:
            return article.get('category', 'political')
        
        try:
            prompt = f"""Categorize this news article as either "financial" or "political":
            
Title: {article.get('title', '')}
Summary: {article.get('summary', '')[:300]}

Respond with ONLY one word: "financial" or "political"."""
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a news categorization assistant. Respond with only one word."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=10
            )
            
            category = response.choices[0].message.content.strip().lower()
            return category if category in ['financial', 'political'] else 'political'
        except Exception as e:
            print(f"Error in AI categorization: {e}")
            return article.get('category', 'political')
    
    def process_articles(self, articles: List[Dict] = None):
        """Process articles: detect locations, categorize, and prepare for API"""
        if articles is None:
            from news_scraper import NewsScraper
            scraper = NewsScraper()
            articles = scraper.scraped_articles
        
        processed = []
        for i, article in enumerate(articles):
            print(f"Processing article {i+1}/{len(articles)}: {article.get('title', '')[:50]}...")
            
            # Detect location
            location_data = self.detect_location_with_ai(article)
            
            # Categorize
            category = self.categorize_with_ai(article)
            
            # Transform title to be finance-oriented
            original_title = article.get('title', '')
            finance_title = self._make_title_finance_oriented(original_title)
            
            # Create processed article
            processed_article = {
                'id': f"article_{i}_{hash(article.get('url', ''))}",
                'title': finance_title,
                'url': article.get('url', ''),
                'summary': article.get('summary', ''),
                'category': category,
                'source': article.get('source', 'Unknown'),
                'published': article.get('published', ''),
                'location': location_data['location_name'],
                'coordinates': location_data['coordinates'],
                'popularity_score': self._calculate_popularity_score(article),
                'blurred': False  # Show articles in popular section
            }
            
            processed.append(processed_article)
            time.sleep(0.2)  # Rate limiting
        
        self.processed_articles = processed
        self.save_articles()
        return processed
    
    def _make_title_finance_oriented(self, title: str) -> str:
        """Transform any title to be finance-oriented"""
        if not title:
            return "Market Analysis: Financial Trends and Investment Opportunities"
        
        title_lower = title.lower()
        
        # Check if already finance-related
        finance_keywords = ['stock', 'market', 'financial', 'trading', 'investment', 'revenue', 'earnings', 
                           'profit', 'economy', 'dollar', 'currency', 'bank', 'fund', 'portfolio', 
                           'dividend', 'ipo', 'merger', 'acquisition', 'analyst', 'forecast', 'price',
                           'share', 'equity', 'bond', 'yield', 'inflation', 'gdp', 'fed', 'interest rate']
        
        if any(keyword in title_lower for keyword in finance_keywords):
            # Already finance-oriented, return as is
            return title
        
        # Transform to finance-oriented
        # Add finance context to the title
        finance_prefixes = [
            "Market Impact: ",
            "Financial Analysis: ",
            "Investment Outlook: ",
            "Market Trends: ",
            "Economic Impact: ",
            "Trading Implications: ",
            "Financial Markets: "
        ]
        
        import random
        prefix = random.choice(finance_prefixes)
        
        # If title is very long, truncate and add finance context
        if len(title) > 60:
            title = title[:57] + "..."
        
        return prefix + title
    
    def _calculate_popularity_score(self, article: Dict) -> float:
        """Calculate a popularity score for an article"""
        # Simple scoring based on source and recency
        score = 0.5  # Base score
        
        # Boost for major sources
        major_sources = ['Reuters', 'BBC', 'CNN', 'Bloomberg', 'Financial Times']
        if any(source in article.get('source', '') for source in major_sources):
            score += 0.3
        
        # Boost for longer summaries (more content)
        if len(article.get('summary', '')) > 200:
            score += 0.2
        
        return min(score, 1.0)
    
    def get_articles_by_category(self, category: str = 'all') -> List[Dict]:
        """Get articles filtered by category"""
        if category == 'all':
            return self.processed_articles
        return [a for a in self.processed_articles if a.get('category') == category]
    
    def get_popular_articles(self, category: str = 'all', limit: int = 20) -> List[Dict]:
        """Get most popular articles, sorted by popularity score"""
        articles = self.get_articles_by_category(category)
        sorted_articles = sorted(articles, key=lambda x: x.get('popularity_score', 0), reverse=True)
        return sorted_articles[:limit]
