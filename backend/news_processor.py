import os
from openai import OpenAI
from geopy.geocoders import Nominatim, GoogleV3
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from typing import List, Dict, Optional
import json
import time
import re

class NewsProcessor:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            print("Warning: OPENAI_API_KEY not set. Location detection will be limited.")
        else:
            self.client = OpenAI(api_key=self.api_key)
        
        # Initialize geocoders
        self.geocoder = Nominatim(user_agent="news_viewer_app_v2")
        self.google_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if self.google_api_key:
            try:
                self.google_geocoder = GoogleV3(api_key=self.google_api_key)
            except:
                self.google_geocoder = None
        else:
            self.google_geocoder = None
        
        # Geocoding cache to avoid repeated API calls
        self.geocoding_cache = {}
        self.geocoding_cache_file = 'geocoding_cache.json'
        self.load_geocoding_cache()
        
        self.processed_articles = []
        self.articles_file = 'articles_data.json'
        self.load_articles()
    
    def load_geocoding_cache(self):
        """Load geocoding cache from file"""
        try:
            if os.path.exists(self.geocoding_cache_file):
                with open(self.geocoding_cache_file, 'r') as f:
                    self.geocoding_cache = json.load(f)
        except Exception as e:
            print(f"Error loading geocoding cache: {e}")
            self.geocoding_cache = {}
    
    def save_geocoding_cache(self):
        """Save geocoding cache to file"""
        try:
            with open(self.geocoding_cache_file, 'w') as f:
                json.dump(self.geocoding_cache, f, indent=2)
        except Exception as e:
            print(f"Error saving geocoding cache: {e}")
    
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
        """Use AI to detect topic-related locations (e.g., wind farms for energy articles)"""
        if not self.api_key:
            # Fallback: try to extract location from title/summary
            return self._fallback_location_detection(article)
        
        try:
            # Get full article text for better context
            full_text = f"{article.get('title', '')} {article.get('summary', '')} {article.get('content', '')}"
            full_text = full_text[:2000]  # Limit to avoid token limits
            
            prompt = f"""You are an expert geographer analyzing news articles to find locations that are SEMANTICALLY RELATED to the article's topic, not just where the news was written.

Article Title: {article.get('title', '')}
Article Summary: {article.get('summary', '')[:1000]}
Full Text: {full_text[:1000]}

CRITICAL REQUIREMENTS:
1. FIRST: Identify the MAIN TOPIC/THEME of the article (e.g., "energy", "renewable energy", "wind power", "finance", "technology", "healthcare", "education", "transportation", "agriculture", "manufacturing", etc.)

2. THEN: Find a SPECIFIC, REAL location that is RELATED to that topic:
   - If about ENERGY/RENEWABLE ENERGY: Find a wind farm, solar farm, or power plant (e.g., "Alta Wind Energy Center, Mojave Desert, California, USA" or "Hornsea Wind Farm, North Sea, United Kingdom")
   - If about FINANCE/BANKING: Find a financial district or major bank (e.g., "Wall Street, New York City, New York, USA" or "Canary Wharf, London, United Kingdom")
   - If about TECHNOLOGY: Find a tech hub or major tech company location (e.g., "Silicon Valley, California, USA" or "Shoreditch, London, United Kingdom")
   - If about AGRICULTURE/FARMING: Find a major agricultural region or farm (e.g., "Central Valley, California, USA" or "Corn Belt, Iowa, USA")
   - If about MANUFACTURING/INDUSTRY: Find a major industrial area or factory (e.g., "Detroit, Michigan, USA" or "Ruhr Valley, Germany")
   - If about TRANSPORTATION: Find a major port, airport, or transportation hub (e.g., "Port of Los Angeles, California, USA" or "Heathrow Airport, London, United Kingdom")
   - If about HEALTHCARE: Find a major medical center or hospital district (e.g., "Texas Medical Center, Houston, Texas, USA")
   - If about EDUCATION: Find a major university or education district (e.g., "Harvard University, Cambridge, Massachusetts, USA")
   - If about POLITICS/GOVERNMENT: Find a government building or political center (e.g., "Capitol Hill, Washington, DC, USA" or "Westminster, London, United Kingdom")
   - If about ENVIRONMENT/CLIMATE: Find a relevant natural location or environmental site (e.g., "Amazon Rainforest, Brazil" or "Great Barrier Reef, Australia")
   - If about SPACE/AEROSPACE: Find a space center or aerospace facility (e.g., "Kennedy Space Center, Florida, USA")
   - If about OIL/GAS: Find an oil field or refinery (e.g., "Permian Basin, Texas, USA" or "North Sea Oil Fields, United Kingdom")
   - If about REAL ESTATE: Find a major real estate development or district
   - If about RETAIL/COMMERCE: Find a major shopping district or commercial area
   - If no specific topic-related location exists, use the city/region where the main event occurs

3. Use FULL address format: "Specific Place Name, City, State/Province, Country"
4. For US locations: MUST include state
5. Prefer REAL, SPECIFIC places that actually exist and are related to the topic
6. Be creative but accurate - find places that represent the article's theme

Location Format Examples:
- "Alta Wind Energy Center, Tehachapi, California, USA" (for energy article)
- "Wall Street, New York City, New York, USA" (for finance article)
- "Silicon Valley, San Jose, California, USA" (for tech article)
- "Central Valley, Fresno, California, USA" (for agriculture article)

Respond with ONLY valid JSON:
{{
    "location": "Topic-Related Location String",
    "confidence": 0.0-1.0,
    "reasoning": "Why this location was chosen and how it relates to the article topic",
    "location_type": "street|neighborhood|city|region|country|facility",
    "topic": "Main topic/theme of the article",
    "location_category": "energy|finance|technology|agriculture|manufacturing|transportation|healthcare|education|government|environment|other"
}}

If truly no location can be determined, use "Unknown"."""
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a precision location detection expert. Extract the EXACT geographic location with maximum specificity. You MUST respond with ONLY valid JSON, no other text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Very low temperature for maximum consistency
                max_tokens=300
            )
            
            result = json.loads(response.choices[0].message.content)
            location_str = result.get('location', 'Unknown')
            confidence = result.get('confidence', 0.5)
            topic = result.get('topic', '')
            location_category = result.get('location_category', 'other')
            
            # Validate and refine location string
            location_str = self._validate_and_refine_location(location_str, result.get('location_type', ''))
            
            # Clean and normalize location string
            location_str = self._normalize_location_string(location_str)
            
            # Try to find topic-specific location using Google Places API if available
            topic_place_name = None
            if self.google_api_key and location_str != 'Unknown' and topic:
                topic_coords = self._find_topic_specific_location(location_str, topic, location_category)
                if topic_coords and topic_coords['lat'] != 0:
                    coordinates = {'lat': topic_coords['lat'], 'lng': topic_coords['lng']}
                    topic_place_name = topic_coords.get('place_name')
                    if topic_place_name:
                        # Update location name to include the specific place
                        location_str = f"{topic_place_name}, {location_str}"
                    print(f"✓ Found topic-specific location for '{topic}': {location_str}")
                else:
                    # Fall back to regular geocoding
                    coordinates = self._geocode_location(location_str)
            else:
                # Geocode the location with multiple attempts
                coordinates = self._geocode_location(location_str)
            
            # If geocoding failed, try alternative location strings
            if coordinates['lat'] == 0 and coordinates['lng'] == 0 and location_str != 'Unknown':
                # Try simplified version
                simplified = self._simplify_location_string(location_str)
                if simplified != location_str:
                    coordinates = self._geocode_location(simplified)
                    if coordinates['lat'] != 0:
                        location_str = simplified  # Use simplified if it works
            
            return {
                'location_name': location_str,
                'coordinates': coordinates,
                'confidence': confidence,
                'location_type': result.get('location_type', 'city'),
                'topic': topic,
                'location_category': location_category
            }
        except json.JSONDecodeError as e:
            print(f"JSON decode error in AI location detection: {e}")
            # Try to extract location from response text
            try:
                response_text = response.choices[0].message.content
                # Try to find JSON in the response
                json_match = re.search(r'\{[^}]+\}', response_text)
                if json_match:
                    result = json.loads(json_match.group())
                    location_str = result.get('location', 'Unknown')
                    location_str = self._normalize_location_string(location_str)
                    coordinates = self._geocode_location(location_str)
                    return {
                        'location_name': location_str,
                        'coordinates': coordinates,
                        'confidence': 0.6
                    }
            except:
                pass
            return self._fallback_location_detection(article)
        except Exception as e:
            print(f"Error in AI location detection: {e}")
            return self._fallback_location_detection(article)
    
    def _validate_and_refine_location(self, location_str: str, location_type: str) -> str:
        """Validate and refine location string for better geocoding"""
        if not location_str or location_str == 'Unknown':
            return 'Unknown'
        
        # Remove common prefixes that might confuse geocoding
        prefixes_to_remove = [
            'Located in ', 'Located at ', 'Takes place in ', 'Happening in ',
            'Event in ', 'News from ', 'Report from ', 'Story from '
        ]
        for prefix in prefixes_to_remove:
            if location_str.startswith(prefix):
                location_str = location_str[len(prefix):].strip()
        
        # Ensure proper format
        # If it's just a country, try to get more specific
        if location_type == 'country' and ',' not in location_str:
            # Try to add a major city if it's just a country
            country_cities = {
                'USA': 'Washington, DC, USA',
                'United States': 'Washington, DC, USA',
                'UK': 'London, United Kingdom',
                'United Kingdom': 'London, United Kingdom',
                'France': 'Paris, France',
                'Germany': 'Berlin, Germany',
                'Japan': 'Tokyo, Japan',
                'China': 'Beijing, China',
            }
            if location_str in country_cities:
                return country_cities[location_str]
        
        return location_str.strip()
    
    def _normalize_location_string(self, location_str: str) -> str:
        """Normalize and clean location string for better geocoding"""
        if not location_str or location_str == 'Unknown':
            return 'Unknown'
        
        # Remove extra whitespace
        location_str = ' '.join(location_str.split())
        
        # Fix common abbreviations
        replacements = {
            'USA': 'United States',
            'U.S.A.': 'United States',
            'U.S.': 'United States',
            'UK': 'United Kingdom',
            'U.K.': 'United Kingdom',
        }
        
        for abbrev, full in replacements.items():
            location_str = location_str.replace(abbrev, full)
        
        return location_str.strip()
    
    def _fallback_location_detection(self, article: Dict) -> Dict:
        """Fallback location detection without AI"""
        # Expanded keyword-based location detection with more cities
        common_locations = {
            # US Cities
            'new york': {'lat': 40.7128, 'lng': -74.0060, 'name': 'New York City, New York, USA'},
            'washington': {'lat': 38.9072, 'lng': -77.0369, 'name': 'Washington, DC, USA'},
            'los angeles': {'lat': 34.0522, 'lng': -118.2437, 'name': 'Los Angeles, California, USA'},
            'chicago': {'lat': 41.8781, 'lng': -87.6298, 'name': 'Chicago, Illinois, USA'},
            'san francisco': {'lat': 37.7749, 'lng': -122.4194, 'name': 'San Francisco, California, USA'},
            'boston': {'lat': 42.3601, 'lng': -71.0589, 'name': 'Boston, Massachusetts, USA'},
            'miami': {'lat': 25.7617, 'lng': -80.1918, 'name': 'Miami, Florida, USA'},
            'seattle': {'lat': 47.6062, 'lng': -122.3321, 'name': 'Seattle, Washington, USA'},
            'houston': {'lat': 29.7604, 'lng': -95.3698, 'name': 'Houston, Texas, USA'},
            'atlanta': {'lat': 33.7490, 'lng': -84.3880, 'name': 'Atlanta, Georgia, USA'},
            # International Cities
            'london': {'lat': 51.5074, 'lng': -0.1278, 'name': 'London, United Kingdom'},
            'paris': {'lat': 48.8566, 'lng': 2.3522, 'name': 'Paris, France'},
            'tokyo': {'lat': 35.6762, 'lng': 139.6503, 'name': 'Tokyo, Japan'},
            'beijing': {'lat': 39.9042, 'lng': 116.4074, 'name': 'Beijing, China'},
            'moscow': {'lat': 55.7558, 'lng': 37.6173, 'name': 'Moscow, Russia'},
            'berlin': {'lat': 52.5200, 'lng': 13.4050, 'name': 'Berlin, Germany'},
            'madrid': {'lat': 40.4168, 'lng': -3.7038, 'name': 'Madrid, Spain'},
            'rome': {'lat': 41.9028, 'lng': 12.4964, 'name': 'Rome, Italy'},
            'sydney': {'lat': -33.8688, 'lng': 151.2093, 'name': 'Sydney, Australia'},
            'toronto': {'lat': 43.6532, 'lng': -79.3832, 'name': 'Toronto, Canada'},
            'mumbai': {'lat': 19.0760, 'lng': 72.8777, 'name': 'Mumbai, India'},
            'dubai': {'lat': 25.2048, 'lng': 55.2708, 'name': 'Dubai, UAE'},
            'singapore': {'lat': 1.3521, 'lng': 103.8198, 'name': 'Singapore'},
            'hong kong': {'lat': 22.3193, 'lng': 114.1694, 'name': 'Hong Kong'},
        }
        
        text = (article.get('title', '') + ' ' + article.get('summary', '')).lower()
        
        # Try to find location matches
        for loc_key, loc_data in common_locations.items():
            if loc_key in text:
                # Try to geocode for more accuracy
                location_str = loc_data.get('name', loc_key.title())
                coordinates = self._geocode_location(location_str)
                
                # Use geocoded coordinates if valid, otherwise use fallback
                if coordinates['lat'] != 0 and coordinates['lng'] != 0:
                    return {
                        'location_name': location_str,
                        'coordinates': coordinates,
                        'confidence': 0.7
                    }
                else:
                    return {
                        'location_name': location_str,
                        'coordinates': {'lat': loc_data['lat'], 'lng': loc_data['lng']},
                        'confidence': 0.6
                    }
        
        # Default to a random major city if nothing found
        import random
        default_locs = [loc for loc in common_locations.values() if 'name' in loc]
        if default_locs:
            chosen = random.choice(default_locs)
            return {
                'location_name': chosen.get('name', 'Unknown'),
                'coordinates': {'lat': chosen['lat'], 'lng': chosen['lng']},
                'confidence': 0.3
            }
        
        return {
            'location_name': 'Unknown',
            'coordinates': {'lat': 0, 'lng': 0},
            'confidence': 0.1
        }
    
    def _geocode_location(self, location_str: str) -> Dict:
        """Geocode a location string to coordinates with caching and multiple strategies"""
        if location_str == 'Unknown' or not location_str:
            return {'lat': 0, 'lng': 0}
        
        # Check cache first
        cache_key = location_str.lower().strip()
        if cache_key in self.geocoding_cache:
            cached_result = self.geocoding_cache[cache_key]
            if cached_result['lat'] != 0 or cached_result['lng'] != 0:
                return cached_result
        
        # Try multiple geocoding strategies
        coordinates = self._geocode_with_retry(location_str)
        
        # Cache the result (even if it failed, to avoid repeated failed attempts)
        self.geocoding_cache[cache_key] = coordinates
        self.save_geocoding_cache()
        
        return coordinates
    
    def _geocode_with_retry(self, location_str: str, max_retries: int = 3) -> Dict:
        """Geocode with retry logic and multiple geocoding services"""
        # Strategy 1: Try Google Geocoding API (most accurate)
        if self.google_geocoder:
            for attempt in range(max_retries):
                try:
                    location = self.google_geocoder.geocode(location_str, timeout=15)
                    if location:
                        coords = {'lat': location.latitude, 'lng': location.longitude}
                        print(f"✓ Geocoded '{location_str}' via Google: {coords}")
                        return coords
                except (GeocoderTimedOut, GeocoderServiceError) as e:
                    if attempt < max_retries - 1:
                        time.sleep(1 * (attempt + 1))  # Exponential backoff
                        continue
                    print(f"Google geocoding error for '{location_str}': {e}")
                except Exception as e:
                    print(f"Unexpected Google geocoding error for '{location_str}': {e}")
                    break
        
        # Strategy 2: Try Nominatim (OpenStreetMap) - free but less accurate
        for attempt in range(max_retries):
            try:
                location = self.geocoder.geocode(location_str, timeout=15, exactly_one=True)
                if location:
                    coords = {'lat': location.latitude, 'lng': location.longitude}
                    print(f"✓ Geocoded '{location_str}' via Nominatim: {coords}")
                    return coords
            except (GeocoderTimedOut, GeocoderServiceError) as e:
                if attempt < max_retries - 1:
                    time.sleep(1 * (attempt + 1))  # Exponential backoff
                    continue
                print(f"Nominatim geocoding error for '{location_str}': {e}")
            except Exception as e:
                print(f"Unexpected Nominatim geocoding error for '{location_str}': {e}")
                break
        
        # Strategy 3: Try with simplified location string (remove country if present)
        simplified = self._simplify_location_string(location_str)
        if simplified != location_str:
            for attempt in range(max_retries):
                try:
                    location = self.geocoder.geocode(simplified, timeout=15, exactly_one=True)
                    if location:
                        coords = {'lat': location.latitude, 'lng': location.longitude}
                        print(f"✓ Geocoded simplified '{simplified}' via Nominatim: {coords}")
                        return coords
                except Exception as e:
                    if attempt < max_retries - 1:
                        time.sleep(1)
                        continue
                    break
        
        print(f"✗ Failed to geocode '{location_str}' after all attempts")
        return {'lat': 0, 'lng': 0}
    
    def _find_topic_specific_location(self, base_location: str, topic: str, category: str) -> Optional[Dict]:
        """Find a topic-specific location using Google Places API"""
        if not self.google_api_key:
            return None
        
        try:
            import requests
            
            # First, geocode the base location to get coordinates
            base_coords = self._geocode_location(base_location)
            if base_coords['lat'] == 0:
                return None
            
            # Map topics to Google Places types
            place_type_mapping = {
                'energy': 'electric_utility',
                'renewable energy': 'electric_utility',
                'wind power': 'electric_utility',
                'solar power': 'electric_utility',
                'finance': 'bank',
                'banking': 'bank',
                'technology': 'electronics_store',
                'tech': 'electronics_store',
                'agriculture': 'farm',
                'farming': 'farm',
                'manufacturing': 'factory',
                'industry': 'factory',
                'transportation': 'airport',
                'healthcare': 'hospital',
                'education': 'university',
                'government': 'city_hall',
                'politics': 'city_hall',
                'environment': 'park',
                'space': 'airport',
                'oil': 'gas_station',
                'real estate': 'real_estate_agency',
                'retail': 'shopping_mall'
            }
            
            # Find matching place type
            place_type = None
            topic_lower = topic.lower()
            for key, value in place_type_mapping.items():
                if key in topic_lower:
                    place_type = value
                    break
            
            # If no specific type, use category-based search
            if not place_type:
                category_mapping = {
                    'energy': 'electric_utility',
                    'finance': 'bank',
                    'technology': 'electronics_store',
                    'agriculture': 'farm',
                    'manufacturing': 'factory',
                    'transportation': 'airport',
                    'healthcare': 'hospital',
                    'education': 'university',
                    'government': 'city_hall',
                    'environment': 'park'
                }
                place_type = category_mapping.get(category, None)
            
            if not place_type:
                return None
            
            # Search for places near the base location
            url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
            params = {
                'location': f"{base_coords['lat']},{base_coords['lng']}",
                'radius': 50000,  # 50km radius
                'type': place_type,
                'key': self.google_api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'OK' and data.get('results'):
                    # Get the first result (closest match)
                    place = data['results'][0]
                    location = place.get('geometry', {}).get('location', {})
                    place_name = place.get('name', '')
                    place_address = place.get('vicinity', '')
                    
                    if location.get('lat') and location.get('lng'):
                        return {
                            'lat': location['lat'],
                            'lng': location['lng'],
                            'place_name': place_name,
                            'place_address': place_address
                        }
            
            return None
        except Exception as e:
            print(f"Error finding topic-specific location: {e}")
            return None
    
    def _simplify_location_string(self, location_str: str) -> str:
        """Simplify location string for better geocoding"""
        # Remove common suffixes that might confuse geocoding
        suffixes = [', USA', ', United States', ', US', ', United Kingdom', ', UK']
        simplified = location_str
        for suffix in suffixes:
            if simplified.endswith(suffix):
                simplified = simplified[:-len(suffix)].strip()
        
        # If it's "City, State, Country", try just "City, State"
        parts = [p.strip() for p in simplified.split(',')]
        if len(parts) >= 3:
            # Keep first two parts (usually city and state)
            simplified = ', '.join(parts[:2])
        
        return simplified.strip()
    
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
