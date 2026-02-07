import os
from openrouter_client import OpenRouterClient
from geopy.geocoders import Nominatim, GoogleV3
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from typing import List, Dict, Optional
import json
import time
import re

class NewsProcessor:
    def __init__(self):
        try:
            self.client = OpenRouterClient()
        except ValueError:
            print("Warning: OPENROUTER_API_KEY not set. Location detection will be limited.")
            self.client = None
        
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
        
        # Country-based default landmarks - used as fallback when location detection fails
        # These are well-known, prominent landmarks most likely to be relevant for articles
        self.country_default_landmarks = {
            'USA': {
                'finance': 'New York Stock Exchange, New York, NY, USA',
                'political': 'US Capitol Building, Washington, DC, USA'
            },
            'United States': {
                'finance': 'New York Stock Exchange, New York, NY, USA',
                'political': 'US Capitol Building, Washington, DC, USA'
            },
            'UK': {
                'finance': 'London Stock Exchange, London, UK',
                'political': 'Houses of Parliament, London, UK'
            },
            'United Kingdom': {
                'finance': 'London Stock Exchange, London, UK',
                'political': 'Houses of Parliament, London, UK'
            },
            'Spain': {
                'finance': 'Banco de España, Madrid, Spain',
                'political': 'Spanish Parliament (Congreso de los Diputados), Madrid, Spain'
            },
            'France': {
                'finance': 'Euronext Paris, Paris, France',
                'political': 'Élysée Palace, Paris, France'
            },
            'Germany': {
                'finance': 'Deutsche Börse, Frankfurt, Germany',
                'political': 'Reichstag Building, Berlin, Germany'
            },
            'Italy': {
                'finance': 'Borsa Italiana, Milan, Italy',
                'political': 'Palazzo Chigi, Rome, Italy'
            },
            'Japan': {
                'finance': 'Tokyo Stock Exchange, Tokyo, Japan',
                'political': 'National Diet Building, Tokyo, Japan'
            },
            'China': {
                'finance': 'Shanghai Stock Exchange, Shanghai, China',
                'political': 'Great Hall of the People, Beijing, China'
            },
            'Canada': {
                'finance': 'Toronto Stock Exchange, Toronto, Canada',
                'political': 'Parliament Hill, Ottawa, Canada'
            },
            'Australia': {
                'finance': 'Australian Securities Exchange, Sydney, Australia',
                'political': 'Parliament House, Canberra, Australia'
            },
            'India': {
                'finance': 'Bombay Stock Exchange, Mumbai, India',
                'political': 'Parliament House, New Delhi, India'
            },
            'Brazil': {
                'finance': 'B3 - Brasil Bolsa Balcão, São Paulo, Brazil',
                'political': 'National Congress, Brasília, Brazil'
            },
            'Russia': {
                'finance': 'Moscow Exchange, Moscow, Russia',
                'political': 'Kremlin, Moscow, Russia'
            },
            'South Korea': {
                'finance': 'Korea Exchange, Seoul, South Korea',
                'political': 'National Assembly Building, Seoul, South Korea'
            },
            'Singapore': {
                'finance': 'Singapore Exchange, Singapore',
                'political': 'Parliament House, Singapore'
            },
            'Hong Kong': {
                'finance': 'Hong Kong Stock Exchange, Hong Kong',
                'political': 'Central Government Complex, Hong Kong'
            },
            'Switzerland': {
                'finance': 'SIX Swiss Exchange, Zurich, Switzerland',
                'political': 'Federal Palace, Bern, Switzerland'
            },
            'Netherlands': {
                'finance': 'Euronext Amsterdam, Amsterdam, Netherlands',
                'political': 'Binnenhof, The Hague, Netherlands'
            },
            'Belgium': {
                'finance': 'Euronext Brussels, Brussels, Belgium',
                'political': 'European Parliament, Brussels, Belgium'
            },
            'Sweden': {
                'finance': 'Nasdaq Stockholm, Stockholm, Sweden',
                'political': 'Parliament House, Stockholm, Sweden'
            },
            'Norway': {
                'finance': 'Oslo Stock Exchange, Oslo, Norway',
                'political': 'Storting, Oslo, Norway'
            },
            'Denmark': {
                'finance': 'Nasdaq Copenhagen, Copenhagen, Denmark',
                'political': 'Christiansborg Palace, Copenhagen, Denmark'
            },
            'Poland': {
                'finance': 'Warsaw Stock Exchange, Warsaw, Poland',
                'political': 'Sejm, Warsaw, Poland'
            },
            'Turkey': {
                'finance': 'Borsa Istanbul, Istanbul, Turkey',
                'political': 'Grand National Assembly, Ankara, Turkey'
            },
            'Mexico': {
                'finance': 'Mexican Stock Exchange, Mexico City, Mexico',
                'political': 'National Palace, Mexico City, Mexico'
            },
            'Argentina': {
                'finance': 'Buenos Aires Stock Exchange, Buenos Aires, Argentina',
                'political': 'Casa Rosada, Buenos Aires, Argentina'
            },
            'South Africa': {
                'finance': 'Johannesburg Stock Exchange, Johannesburg, South Africa',
                'political': 'Union Buildings, Pretoria, South Africa'
            },
            'Saudi Arabia': {
                'finance': 'Tadawul, Riyadh, Saudi Arabia',
                'political': 'Royal Palace, Riyadh, Saudi Arabia'
            },
            'UAE': {
                'finance': 'Dubai Financial Market, Dubai, UAE',
                'political': 'Presidential Palace, Abu Dhabi, UAE'
            },
            'United Arab Emirates': {
                'finance': 'Dubai Financial Market, Dubai, UAE',
                'political': 'Presidential Palace, Abu Dhabi, UAE'
            },
            'Thailand': {
                'finance': 'Stock Exchange of Thailand, Bangkok, Thailand',
                'political': 'Grand Palace, Bangkok, Thailand'
            },
            'Indonesia': {
                'finance': 'Indonesia Stock Exchange, Jakarta, Indonesia',
                'political': 'Merdeka Palace, Jakarta, Indonesia'
            },
            'Philippines': {
                'finance': 'Philippine Stock Exchange, Manila, Philippines',
                'political': 'Malacañang Palace, Manila, Philippines'
            },
            'Malaysia': {
                'finance': 'Bursa Malaysia, Kuala Lumpur, Malaysia',
                'political': 'Parliament House, Kuala Lumpur, Malaysia'
            },
            'Vietnam': {
                'finance': 'Ho Chi Minh Stock Exchange, Ho Chi Minh City, Vietnam',
                'political': 'Presidential Palace, Hanoi, Vietnam'
            },
            'Taiwan': {
                'finance': 'Taiwan Stock Exchange, Taipei, Taiwan',
                'political': 'Presidential Office Building, Taipei, Taiwan'
            },
            'New Zealand': {
                'finance': 'NZX, Wellington, New Zealand',
                'political': 'Parliament House, Wellington, New Zealand'
            },
            'Chile': {
                'finance': 'Santiago Stock Exchange, Santiago, Chile',
                'political': 'La Moneda Palace, Santiago, Chile'
            },
            'Colombia': {
                'finance': 'Colombia Stock Exchange, Bogotá, Colombia',
                'political': 'Casa de Nariño, Bogotá, Colombia'
            },
            'Peru': {
                'finance': 'Lima Stock Exchange, Lima, Peru',
                'political': 'Government Palace, Lima, Peru'
            },
            'Egypt': {
                'finance': 'Egyptian Exchange, Cairo, Egypt',
                'political': 'Abdeen Palace, Cairo, Egypt'
            },
            'Nigeria': {
                'finance': 'Nigerian Stock Exchange, Lagos, Nigeria',
                'political': 'Aso Rock Presidential Villa, Abuja, Nigeria'
            },
            'Kenya': {
                'finance': 'Nairobi Securities Exchange, Nairobi, Kenya',
                'political': 'State House, Nairobi, Kenya'
            },
            'Israel': {
                'finance': 'Tel Aviv Stock Exchange, Tel Aviv, Israel',
                'political': 'Knesset, Jerusalem, Israel'
            },
            'Greece': {
                'finance': 'Athens Stock Exchange, Athens, Greece',
                'political': 'Hellenic Parliament, Athens, Greece'
            },
            'Portugal': {
                'finance': 'Euronext Lisbon, Lisbon, Portugal',
                'political': 'Assembly of the Republic, Lisbon, Portugal'
            },
            'Austria': {
                'finance': 'Vienna Stock Exchange, Vienna, Austria',
                'political': 'Hofburg Palace, Vienna, Austria'
            },
            'Czech Republic': {
                'finance': 'Prague Stock Exchange, Prague, Czech Republic',
                'political': 'Prague Castle, Prague, Czech Republic'
            },
            'Finland': {
                'finance': 'Nasdaq Helsinki, Helsinki, Finland',
                'political': 'Parliament House, Helsinki, Finland'
            },
            'Ireland': {
                'finance': 'Euronext Dublin, Dublin, Ireland',
                'political': 'Leinster House, Dublin, Ireland'
            }
        }
    
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
                    loaded_articles = json.load(f)
                    # Filter out articles without valid URLs
                    self.processed_articles = [
                        a for a in loaded_articles 
                        if a.get('url') and isinstance(a.get('url'), str) and a.get('url').strip().startswith(('http://', 'https://'))
                    ]
                    if len(loaded_articles) != len(self.processed_articles):
                        print(f"Filtered out {len(loaded_articles) - len(self.processed_articles)} articles without valid URLs")
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
        if not self.client:
            # Fallback: try to extract location from title/summary
            return self._fallback_location_detection(article)
        
        try:
            # Get full article text for better context
            full_text = f"{article.get('title', '')} {article.get('summary', '')} {article.get('content', '')}"
            full_text = full_text[:2000]  # Limit to avoid token limits
            
            prompt = f"""You are an expert geographer analyzing news articles to find SPECIFIC LANDMARK LOCATIONS that are SEMANTICALLY RELATED to the article's topic.

Article Title: {article.get('title', '')}
Article Summary: {article.get('summary', '')[:1000]}
Full Text: {full_text[:1000]}

CRITICAL REQUIREMENTS:
1. FIRST: Identify the MAIN TOPIC/THEME of the article (e.g., "energy", "renewable energy", "wind power", "finance", "technology", "healthcare", "education", "transportation", "agriculture", "manufacturing", etc.)

2. THEN: Find a SPECIFIC, REAL LANDMARK NAME (not just a city). NEVER return just a city name like "Madrid, Spain" or "London, UK". ALWAYS return a specific landmark:
   - If about ENERGY/RENEWABLE ENERGY: Find a wind farm, solar farm, or power plant (e.g., "Alta Wind Energy Center, Mojave Desert, California, USA" or "Hornsea Wind Farm, North Sea, United Kingdom")
   - If about FINANCE/BANKING: Find a MAJOR FINANCIAL LANDMARK like stock exchanges, major bank headquarters, or financial districts. NEVER just "London, UK" - use "London Stock Exchange, London, UK":
     * US: "New York Stock Exchange, New York, NY, USA" or "Federal Reserve Bank of New York, New York, NY, USA" or "Wall Street, New York, NY, USA"
     * UK: "London Stock Exchange, London, UK" or "Bank of England, London, UK" or "Canary Wharf, London, UK"
     * Europe: "Euronext Paris, Paris, France" or "Deutsche Börse, Frankfurt, Germany" or "Borsa Italiana, Milan, Italy"
     * Asia: "Tokyo Stock Exchange, Tokyo, Japan" or "Hong Kong Stock Exchange, Hong Kong" or "Shanghai Stock Exchange, Shanghai, China"
     * Other: "Bank of America Tower, New York, NY, USA" or "JPMorgan Chase Tower, New York, NY, USA"
     * IMPORTANT: ALWAYS use specific landmark names, never just city names
   - If about TECHNOLOGY: Find a tech hub or major tech company location (e.g., "Silicon Valley, California, USA" or "Shoreditch, London, United Kingdom")
   - If about AGRICULTURE/FARMING: Find a major agricultural region or farm (e.g., "Central Valley, California, USA" or "Corn Belt, Iowa, USA")
   - If about MANUFACTURING/INDUSTRY: Find a major industrial area or factory (e.g., "Detroit, Michigan, USA" or "Ruhr Valley, Germany")
   - If about TRANSPORTATION: Find a major port, airport, or transportation hub (e.g., "Port of Los Angeles, California, USA" or "Heathrow Airport, London, United Kingdom")
   - If about HEALTHCARE: Find a major medical center or hospital district (e.g., "Texas Medical Center, Houston, Texas, USA")
   - If about EDUCATION: Find a major university or education district (e.g., "Harvard University, Cambridge, Massachusetts, USA")
   - If about POLITICS/GOVERNMENT/GEOPOLITICAL/WAR: Find a SPECIFIC, STREET-VIEW-ACCESSIBLE government building, embassy, political landmark, or diplomatic facility. NEVER just "Madrid, Spain" - use "Spanish Parliament, Madrid, Spain" or "US Embassy in Madrid, Madrid, Spain":
     * For US politics: "US Capitol Building, Washington, DC, USA" or "White House, Washington, DC, USA" or "United Nations Headquarters, New York, NY, USA"
     * For UK politics: "10 Downing Street, London, UK" or "Houses of Parliament, Westminster, London, UK" or "Foreign and Commonwealth Office, London, UK"
     * For EU politics: "European Parliament, Brussels, Belgium" or "European Commission, Brussels, Belgium" or "NATO Headquarters, Brussels, Belgium"
     * For Spain: "Spanish Parliament (Congreso de los Diputados), Madrid, Spain" or "Royal Palace of Madrid, Madrid, Spain" or "US Embassy in Madrid, Madrid, Spain"
     * For France: "Palace of Versailles, Versailles, France" or "Élysée Palace, Paris, France" or "French National Assembly, Paris, France"
     * For Germany: "Reichstag Building, Berlin, Germany" or "Brandenburg Gate, Berlin, Germany" or "German Bundestag, Berlin, Germany"
     * For Italy: "Palazzo Chigi, Rome, Italy" or "Italian Parliament, Rome, Italy" or "Quirinal Palace, Rome, Italy"
     * For embassies: Use specific embassy names (e.g., "US Embassy in [City], [City], [Country]" or "Embassy of [Country], [City], [Country]")
     * For conflict zones: Use specific government buildings (e.g., "Presidential Palace, [City], [Country]" not just "[City], [Country]")
     * For international relations: Use specific UN buildings, embassy names, or diplomatic compounds
     * IMPORTANT: ALWAYS include a specific landmark name, never just a city
   - If about ENVIRONMENT/CLIMATE: Find a relevant natural location or environmental site (e.g., "Amazon Rainforest, Brazil" or "Great Barrier Reef, Australia")
   - If about SPACE/AEROSPACE: Find a space center or aerospace facility (e.g., "Kennedy Space Center, Florida, USA")
   - If about OIL/GAS: Find an oil field or refinery (e.g., "Permian Basin, Texas, USA" or "North Sea Oil Fields, United Kingdom")
   - If about REAL ESTATE: Find a major real estate development or district
   - If about RETAIL/COMMERCE: Find a major shopping district or commercial area
   - If no specific topic-related location exists, use the city/region where the main event occurs

3. Use FULL address format: "Specific Landmark Name, City, State/Province, Country"
4. For US locations: MUST include state
5. CRITICAL: ALWAYS use WELL-KNOWN PUBLIC LANDMARKS - NEVER use:
   - Just city names (e.g., "Madrid, Spain" - use "Spanish Parliament, Madrid, Spain")
   - Street addresses with house numbers (e.g., "123 Main Street")
   - Residential buildings or houses
   - Generic office buildings without landmark names
   - Private residences
   - Random commercial buildings
6. REQUIRED: Use actual landmark names (e.g., "New York Stock Exchange" not "123 Wall Street", "Spanish Parliament" not "Madrid")
7. REQUIRED: Landmarks must be publicly accessible, well-known institutions, or famous buildings
8. REQUIRED: For financial articles, use: stock exchanges, central banks, major bank headquarters, financial districts
9. REQUIRED: For political articles, use: government buildings, embassies, parliaments, capitols, UN buildings
10. REQUIRED: If article mentions a city, find a SPECIFIC landmark in that city (e.g., if article mentions Madrid, use "Spanish Parliament, Madrid, Spain" or "Royal Palace of Madrid, Madrid, Spain")
11. NEVER return just a city name - ALWAYS include a specific landmark, building, or institution name

Location Format Examples (ALWAYS include specific landmark):
- "Alta Wind Energy Center, Tehachapi, California, USA" (for energy article - NOT just "Tehachapi, California")
- "New York Stock Exchange, New York, NY, USA" (for finance article - NOT just "New York, NY")
- "Spanish Parliament (Congreso de los Diputados), Madrid, Spain" (for political article - NOT just "Madrid, Spain")
- "London Stock Exchange, London, UK" (for finance article - NOT just "London, UK")
- "Reichstag Building, Berlin, Germany" (for political article - NOT just "Berlin, Germany")

CRITICAL: The location field MUST contain a SPECIFIC LANDMARK NAME, not just a city.
- CORRECT: "Spanish Parliament, Madrid, Spain"
- WRONG: "Madrid, Spain"
- CORRECT: "London Stock Exchange, London, UK"  
- WRONG: "London, UK"
- CORRECT: "Reichstag Building, Berlin, Germany"
- WRONG: "Berlin, Germany"

Respond with ONLY valid JSON:
{{
    "location": "Specific Landmark Name, City, State/Province, Country",
    "confidence": 0.0-1.0,
    "reasoning": "Why this location was chosen and how it relates to the article topic",
    "location_type": "street|neighborhood|city|region|country|facility",
    "topic": "Main topic/theme of the article",
    "location_category": "energy|finance|technology|agriculture|manufacturing|transportation|healthcare|education|government|environment|other"
}}

If truly no location can be determined, use "Unknown"."""
            
            response = self.client.chat_completions_create(
                model=None,  # Uses default free model
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
            reasoning = result.get('reasoning', '')
            
            # Validate and refine location string
            location_str = self._validate_and_refine_location(location_str, result.get('location_type', ''))
            
            # ALWAYS check if location is vague and find a specific landmark
            # This is critical - we want landmarks, not cities
            reasoning = result.get('reasoning', '')
            landmark_found = False
            if self._is_vague_location(location_str):
                print(f"⚠ Location is vague: {location_str}, finding specific landmark...")
                landmark_location = self._find_landmark_for_city(location_str, topic, location_category)
                if landmark_location:
                    old_location = location_str
                    location_str = landmark_location
                    landmark_found = True
                    # Update reasoning to reflect the specific landmark found
                    landmark_name = location_str.split(',')[0] if ',' in location_str else location_str
                    city_part = ', '.join(location_str.split(',')[1:]) if ',' in location_str else location_str
                    if city_part and city_part != location_str:
                        reasoning = f"This landmark ({landmark_name}) in {city_part} is a significant location for {topic or location_category} related activities. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                    else:
                        reasoning = f"This landmark ({landmark_name}) is a significant location for {topic or location_category} related activities. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                    print(f"✓ Found landmark: {location_str}")
                else:
                    # If we can't find a landmark, try to extract city and search more aggressively
                    city_name = self._extract_city_name(location_str)
                    if city_name:
                        landmark_location = self._find_landmark_for_city_aggressive(city_name, topic, location_category)
                        if landmark_location:
                            location_str = landmark_location
                            print(f"✓ Found landmark via aggressive search: {location_str}")
            
            # Clean and normalize location string
            location_str = self._normalize_location_string(location_str)
            
            # ALWAYS try to find topic-specific location using Google Places API
            # This ensures we get a specific landmark, not just a city
            topic_place_name = None
            if self.google_api_key and location_str != 'Unknown' and topic:
                topic_coords = self._find_topic_specific_location(location_str, topic, location_category)
                if topic_coords and topic_coords['lat'] != 0:
                    coordinates = {'lat': topic_coords['lat'], 'lng': topic_coords['lng']}
                    topic_place_name = topic_coords.get('place_name')
                    if topic_place_name:
                        # Update location name to include the specific place
                        # Only use landmark name if it's more specific than what we have
                        if not self._is_vague_location(topic_place_name):
                            location_str = f"{topic_place_name}, {location_str}"
                            landmark_found = True
                            # Update reasoning with specific landmark info
                            if not reasoning or 'landmark' not in reasoning.lower():
                                reasoning = f"This landmark ({topic_place_name}) is a significant location for {topic or location_category} related activities. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                        else:
                            # If topic search returned vague result, keep searching
                            city = self._extract_city_name(location_str)
                            if city:
                                better_landmark = self._find_landmark_for_city_aggressive(city, topic, location_category)
                                if better_landmark:
                                    location_str = better_landmark
                                    landmark_found = True
                                    if not reasoning or 'landmark' not in reasoning.lower():
                                        landmark_name = better_landmark.split(',')[0] if ',' in better_landmark else better_landmark
                                        reasoning = f"This landmark ({landmark_name}) is a significant location for {topic or location_category} related activities. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                    print(f"✓ Found topic-specific location for '{topic}': {location_str}")
                else:
                    # For political/government articles, try to refine to a more specific street-view-accessible landmark
                    if location_category == 'government' or 'political' in topic.lower() or 'geopolitical' in topic.lower():
                        refined_coords = self._refine_political_location(location_str, topic)
                        if refined_coords and refined_coords['lat'] != 0:
                            coordinates = refined_coords
                            if refined_coords.get('place_name'):
                                new_location = f"{refined_coords['place_name']}, {location_str}"
                                # Only use if it's more specific
                                if not self._is_vague_location(refined_coords['place_name']):
                                    location_str = new_location
                                    landmark_found = True
                                    if not reasoning or 'landmark' not in reasoning.lower():
                                        reasoning = f"This landmark ({refined_coords['place_name']}) is a significant political/government location. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                                else:
                                    # Still vague, try to find better landmark
                                    city = self._extract_city_name(location_str)
                                    if city:
                                        better = self._find_landmark_for_city_aggressive(city, topic, location_category)
                                        if better:
                                            location_str = better
                                            landmark_found = True
                                            coordinates = self._geocode_location(location_str)
                                            if not reasoning or 'landmark' not in reasoning.lower():
                                                landmark_name = better.split(',')[0] if ',' in better else better
                                                reasoning = f"This landmark ({landmark_name}) is a significant political/government location. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                            print(f"✓ Refined political location for '{topic}': {location_str}")
                        else:
                            # Try aggressive search
                            city = self._extract_city_name(location_str)
                            if city:
                                aggressive_landmark = self._find_landmark_for_city_aggressive(city, topic, location_category)
                                if aggressive_landmark:
                                    location_str = aggressive_landmark
                                    landmark_found = True
                                    coordinates = self._geocode_location(location_str)
                                    if not reasoning or 'landmark' not in reasoning.lower():
                                        landmark_name = aggressive_landmark.split(',')[0] if ',' in aggressive_landmark else aggressive_landmark
                                        reasoning = f"This landmark ({landmark_name}) is a significant political/government location. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                                else:
                                    coordinates = self._geocode_location(location_str)
                            else:
                                coordinates = self._geocode_location(location_str)
                    # For financial articles, try to refine to a financial landmark
                    elif location_category == 'finance' or 'financial' in topic.lower() or 'banking' in topic.lower():
                        refined_coords = self._refine_financial_location(location_str, topic)
                        if refined_coords and refined_coords['lat'] != 0:
                            coordinates = refined_coords
                            if refined_coords.get('place_name'):
                                new_location = f"{refined_coords['place_name']}, {location_str}"
                                # Only use if it's more specific
                                if not self._is_vague_location(refined_coords['place_name']):
                                    location_str = new_location
                                    landmark_found = True
                                    if not reasoning or 'landmark' not in reasoning.lower():
                                        reasoning = f"This landmark ({refined_coords['place_name']}) is a significant financial location. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                                else:
                                    # Still vague, try to find better landmark
                                    city = self._extract_city_name(location_str)
                                    if city:
                                        better = self._find_landmark_for_city_aggressive(city, topic, location_category)
                                        if better:
                                            location_str = better
                                            landmark_found = True
                                            coordinates = self._geocode_location(location_str)
                                            if not reasoning or 'landmark' not in reasoning.lower():
                                                landmark_name = better.split(',')[0] if ',' in better else better
                                                reasoning = f"This landmark ({landmark_name}) is a significant financial location. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                            print(f"✓ Refined financial location for '{topic}': {location_str}")
                        else:
                            # Try aggressive search
                            city = self._extract_city_name(location_str)
                            if city:
                                aggressive_landmark = self._find_landmark_for_city_aggressive(city, topic, location_category)
                                if aggressive_landmark:
                                    location_str = aggressive_landmark
                                    landmark_found = True
                                    coordinates = self._geocode_location(location_str)
                                    if not reasoning or 'landmark' not in reasoning.lower():
                                        landmark_name = aggressive_landmark.split(',')[0] if ',' in aggressive_landmark else aggressive_landmark
                                        reasoning = f"This landmark ({landmark_name}) is a significant financial location. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                                else:
                                    coordinates = self._geocode_location(location_str)
                            else:
                                coordinates = self._geocode_location(location_str)
                    else:
                        # Fall back to regular geocoding
                        coordinates = self._geocode_location(location_str)
            else:
                # Geocode the location with multiple attempts
                coordinates = self._geocode_location(location_str)
            
            # Final check: if location is still vague after all processing, force landmark search
            if self._is_vague_location(location_str) and location_str != 'Unknown':
                print(f"⚠ Final check: Location still vague: {location_str}, forcing landmark search...")
                city = self._extract_city_name(location_str)
                if city:
                    # Try aggressive search first
                    forced_landmark = self._find_landmark_for_city_aggressive(city, topic, location_category)
                    if forced_landmark:
                        location_str = forced_landmark
                        landmark_found = True
                        # Re-geocode with new landmark location
                        coordinates = self._geocode_location(location_str)
                        if not reasoning or 'landmark' not in reasoning.lower():
                            landmark_name = forced_landmark.split(',')[0] if ',' in forced_landmark else forced_landmark
                            reasoning = f"This landmark ({landmark_name}) is a significant location for {topic or location_category} related activities. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                        print(f"✓ Forced landmark found: {location_str}")
                    else:
                        # Last resort: use default landmark
                        default_landmark = self._find_default_landmark_for_city(city, location_category)
                        if default_landmark:
                            location_str = default_landmark
                            landmark_found = True
                            coordinates = self._geocode_location(location_str)
                            if not reasoning or 'landmark' not in reasoning.lower():
                                landmark_name = default_landmark.split(',')[0] if ',' in default_landmark else default_landmark
                                reasoning = f"This landmark ({landmark_name}) is a significant location for {topic or location_category} related activities. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                            print(f"✓ Using default landmark: {location_str}")
                        else:
                            print(f"✗ WARNING: Could not find landmark for {city}, location may be vague")
            
            # If geocoding failed, try alternative location strings
            if coordinates['lat'] == 0 and coordinates['lng'] == 0 and location_str != 'Unknown':
                # Try simplified version
                simplified = self._simplify_location_string(location_str)
                if simplified != location_str:
                    coordinates = self._geocode_location(simplified)
                    if coordinates['lat'] != 0:
                        location_str = simplified  # Use simplified if it works
            
            # FINAL SAFEGUARD: If location is still vague after all processing, reject it and use a default landmark
            if self._is_vague_location(location_str) and location_str != 'Unknown':
                print(f"⚠ CRITICAL: Location still vague after all processing: {location_str}")
                city = self._extract_city_name(location_str)
                country = self._extract_country_from_location(location_str)
                
                # Try country-based default first (most reliable)
                if country and country in self.country_default_landmarks:
                    default_landmark = self.country_default_landmarks[country].get(location_category)
                    if default_landmark:
                        location_str = default_landmark
                        landmark_found = True
                        coordinates = self._geocode_location(location_str)
                        if not reasoning or 'landmark' not in reasoning.lower():
                            landmark_name = default_landmark.split(',')[0] if ',' in default_landmark else default_landmark
                            reasoning = f"This landmark ({landmark_name}) is a significant {location_category} location in {country} and is directly relevant to the article topic."
                        print(f"✓ Using country default landmark for {country}: {location_str}")
                    else:
                        # Try city-based search as fallback
                        if city:
                            default_landmark = self._find_default_landmark_for_city(city, location_category)
                            if default_landmark:
                                location_str = default_landmark
                                landmark_found = True
                                coordinates = self._geocode_location(location_str)
                                if not reasoning or 'landmark' not in reasoning.lower():
                                    landmark_name = default_landmark.split(',')[0] if ',' in default_landmark else default_landmark
                                    reasoning = f"This landmark ({landmark_name}) is a significant location for {topic or location_category} related activities. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                                print(f"✓ Using default landmark: {location_str}")
                            else:
                                print(f"✗ Could not find landmark for {city}, location may be vague")
                elif city:
                    # Last resort: try to find ANY landmark in the city
                    default_landmark = self._find_default_landmark_for_city(city, location_category)
                    if default_landmark:
                        location_str = default_landmark
                        landmark_found = True
                        coordinates = self._geocode_location(location_str)
                        if not reasoning or 'landmark' not in reasoning.lower():
                            landmark_name = default_landmark.split(',')[0] if ',' in default_landmark else default_landmark
                            reasoning = f"This landmark ({landmark_name}) is a significant location for {topic or location_category} related activities. {reasoning if reasoning else 'This location is directly relevant to the article topic.'}"
                        print(f"✓ Using default landmark: {location_str}")
                    else:
                        print(f"✗ Could not find landmark for {city}, location may be vague")
                else:
                    print(f"✗ Could not extract city or country from {location_str}")
            
            # Ensure reasoning is set if we found a landmark but reasoning is still empty
            if landmark_found and (not reasoning or len(reasoning.strip()) < 20):
                landmark_name = location_str.split(',')[0] if ',' in location_str else location_str
                reasoning = f"This landmark ({landmark_name}) is a significant location for {topic or location_category} related activities and is directly relevant to the article topic."
            
            return {
                'location_name': location_str,
                'coordinates': coordinates,
                'confidence': confidence,
                'location_type': result.get('location_type', 'city'),
                'topic': topic,
                'location_category': location_category,
                'location_reasoning': reasoning
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
                'political': 'city_hall',
                'geopolitical': 'city_hall',
                'diplomatic': 'embassy',
                'embassy': 'embassy',
                'war': 'city_hall',
                'conflict': 'city_hall',
                'international relations': 'embassy',
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
                    'political': 'city_hall',  # Prefer city_hall for political, but will try embassy as fallback
                    'environment': 'park'
                }
                place_type = category_mapping.get(category, None)
            
            # For political/government category, try multiple place types for better results
            if category == 'government' or category == 'political':
                # First try embassy (better for international relations)
                if 'embassy' in topic_lower or 'diplomatic' in topic_lower or 'international' in topic_lower:
                    place_type = 'embassy'
                # Otherwise prefer city_hall (government buildings)
                elif not place_type:
                    place_type = 'city_hall'
            
            if not place_type:
                return None
            
            # First, try text search for landmarks with topic-specific keywords
            # Use very specific landmark names
            landmark_keywords = {
                'finance': ['New York Stock Exchange', 'NYSE', 'Federal Reserve Bank', 'Wall Street', 'financial district', 'stock exchange'],
                'banking': ['Federal Reserve', 'central bank', 'bank headquarters', 'JPMorgan Chase', 'Bank of America', 'financial district'],
                'government': ['US Capitol', 'Capitol Building', 'White House', 'parliament', 'government building', 'city hall'],
                'political': ['US Capitol', 'Capitol Building', 'White House', 'parliament', 'embassy', 'diplomatic mission'],
                'geopolitical': ['United Nations', 'UN Headquarters', 'NATO', 'embassy', 'diplomatic'],
                'embassy': ['embassy', 'consulate', 'diplomatic mission']
            }
            
            # Try text search for landmarks first (more accurate)
            if category in landmark_keywords or any(kw in topic_lower for kw in landmark_keywords.keys()):
                keywords = []
                if category in landmark_keywords:
                    keywords.extend(landmark_keywords[category])
                for kw, kw_list in landmark_keywords.items():
                    if kw in topic_lower:
                        keywords.extend(kw_list)
                
                if keywords:
                    # Use text search to find specific landmarks - use more specific queries
                    text_search_url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
                    for keyword in keywords[:3]:  # Try first 3 keywords
                        # Make query more specific by adding city name
                        city_name = base_location.split(',')[0].strip() if ',' in base_location else base_location
                        specific_query = f"{keyword} {city_name}"
                        text_params = {
                            'query': specific_query,
                            'key': self.google_api_key
                        }
                        try:
                            text_response = requests.get(text_search_url, params=text_params, timeout=10)
                            if text_response.status_code == 200:
                                text_data = text_response.json()
                                if text_data.get('status') == 'OK' and text_data.get('results'):
                                    # Filter for places with high prominence (landmarks)
                                    results = text_data.get('results', [])
                                    # Sort by prominence (higher is better for landmarks)
                                    # Require minimum rating * reviews for landmarks
                                    results = [r for r in results if (r.get('rating', 0) * r.get('user_ratings_total', 1)) >= 20]
                                    if not results:
                                        continue
                                    results.sort(key=lambda x: x.get('rating', 0) * x.get('user_ratings_total', 1), reverse=True)
                                    
                                    # Try up to 3 results to find a valid landmark
                                    for place in results[:3]:
                                        location = place.get('geometry', {}).get('location', {})
                                        place_name = place.get('name', '')
                                        place_address = place.get('formatted_address', '')
                                        
                                        if location.get('lat') and location.get('lng'):
                                            # Validate this is actually a landmark, not a random house
                                            if self._is_valid_landmark(place, category, topic_lower):
                                                # Get Place Details for additional verification
                                                place_id = place.get('place_id')
                                                if place_id:
                                                    verified_place = self._verify_landmark_with_details(place_id)
                                                    if verified_place:
                                                        return verified_place
                                                return {
                                                    'lat': location['lat'],
                                                    'lng': location['lng'],
                                                    'place_name': place_name,
                                                    'place_address': place_address
                                                }
                                            else:
                                                print(f"✗ Rejected non-landmark: {place_name}")
                                                continue
                        except Exception as e:
                            print(f"Text search error: {e}")
                            continue
            
            # Fallback to nearby search with place type
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
                    # Sort results by prominence/rating to prioritize landmarks
                    results = data.get('results', [])
                    results.sort(key=lambda x: (x.get('rating', 0) * x.get('user_ratings_total', 1)), reverse=True)
                    place = results[0]
                    location = place.get('geometry', {}).get('location', {})
                    place_name = place.get('name', '')
                    place_address = place.get('vicinity', '')
                    
                    if location.get('lat') and location.get('lng'):
                        # Validate this is actually a landmark, not a random house
                        if self._is_valid_landmark(place, category, topic_lower):
                            return {
                                'lat': location['lat'],
                                'lng': location['lng'],
                                'place_name': place_name,
                                'place_address': place_address
                            }
                        else:
                            print(f"✗ Rejected non-landmark: {place_name}")
                            # Try next result
                            if len(results) > 1:
                                for next_place in results[1:3]:  # Try next 2 results
                                    if self._is_valid_landmark(next_place, category, topic_lower):
                                        next_location = next_place.get('geometry', {}).get('location', {})
                                        next_name = next_place.get('name', '')
                                        next_address = next_place.get('formatted_address', '') or next_place.get('vicinity', '')
                                        if next_location.get('lat') and next_location.get('lng'):
                                            return {
                                                'lat': next_location['lat'],
                                                'lng': next_location['lng'],
                                                'place_name': next_name,
                                                'place_address': next_address
                                            }
            
            return None
        except Exception as e:
            print(f"Error finding topic-specific location: {e}")
            return None
    
    def _refine_political_location(self, base_location: str, topic: str) -> Optional[Dict]:
        """Refine political location to a more specific, street-view-accessible landmark"""
        if not self.google_api_key:
            return None
        
        try:
            import requests
            
            # First, geocode the base location
            base_coords = self._geocode_location(base_location)
            if base_coords['lat'] == 0:
                return None
            
            # Try text search for specific political landmarks first
            landmark_queries = [
                f"capitol {base_location}",
                f"parliament {base_location}",
                f"embassy {base_location}",
                f"government building {base_location}",
                f"city hall {base_location}"
            ]
            
            text_search_url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
            for query in landmark_queries[:3]:  # Try first 3 queries
                try:
                    params = {
                        'query': query,
                        'key': self.google_api_key
                    }
                    response = requests.get(text_search_url, params=params, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('status') == 'OK' and data.get('results'):
                            # Sort by prominence/rating to get landmarks
                            results = data.get('results', [])
                            results.sort(key=lambda x: (x.get('rating', 0) * x.get('user_ratings_total', 1)), reverse=True)
                            place = results[0]
                            location = place.get('geometry', {}).get('location', {})
                            place_name = place.get('name', '')
                            
                            if location.get('lat') and location.get('lng'):
                                return {
                                    'lat': location['lat'],
                                    'lng': location['lng'],
                                    'place_name': place_name
                                }
                except Exception as e:
                    print(f"Text search error for {query}: {e}")
                    continue
            
            # Fallback to nearby search for specific place types
            # Priority: embassy > city_hall > courthouse > government buildings
            place_types = ['embassy', 'city_hall', 'courthouse']
            
            for place_type in place_types:
                url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
                params = {
                    'location': f"{base_coords['lat']},{base_coords['lng']}",
                    'radius': 10000,  # 10km radius for more precise results
                    'type': place_type,
                    'key': self.google_api_key
                }
                
                try:
                    response = requests.get(url, params=params, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('status') == 'OK' and data.get('results'):
                            # Sort by prominence to prioritize landmarks
                            results = data.get('results', [])
                            results.sort(key=lambda x: (x.get('rating', 0) * x.get('user_ratings_total', 1)), reverse=True)
                            place = results[0]
                            location = place.get('geometry', {}).get('location', {})
                            place_name = place.get('name', '')
                            
                            if location.get('lat') and location.get('lng'):
                                # Validate it's a landmark
                                if self._is_valid_landmark(place, 'political', topic.lower()):
                                    return {
                                        'lat': location['lat'],
                                        'lng': location['lng'],
                                        'place_name': place_name
                                    }
                                else:
                                    print(f"✗ Rejected non-landmark: {place_name}")
                                    # Try next result
                                    if len(results) > 1:
                                        for next_place in results[1:3]:
                                            if self._is_valid_landmark(next_place, 'political', topic.lower()):
                                                next_location = next_place.get('geometry', {}).get('location', {})
                                                next_name = next_place.get('name', '')
                                                if next_location.get('lat') and next_location.get('lng'):
                                                    return {
                                                        'lat': next_location['lat'],
                                                        'lng': next_location['lng'],
                                                        'place_name': next_name
                                                    }
                                    continue
                except Exception as e:
                    print(f"Error searching for {place_type}: {e}")
                    continue
            
            # If no specific place found, return the base coordinates
            return base_coords
            
        except Exception as e:
            print(f"Error refining political location: {e}")
            return None
    
    def _refine_financial_location(self, base_location: str, topic: str) -> Optional[Dict]:
        """Refine financial location to a more specific, street-view-accessible landmark"""
        if not self.google_api_key:
            return None
        
        try:
            import requests
            
            # First, geocode the base location
            base_coords = self._geocode_location(base_location)
            if base_coords['lat'] == 0:
                return None
            
            # Extract city name for city-specific queries
            city_name = self._extract_city_name(base_location).lower()
            
            # City-specific landmark mappings for better accuracy
            city_specific_landmarks = {
                'madrid': [
                    'Banco de España',  # Bank of Spain - the central bank
                    'Bolsas y Mercados Españoles',  # BME - the actual stock exchange
                    'Bolsa de Madrid',  # Madrid Stock Exchange building
                    'Bank of Spain Madrid'
                ],
                'london': [
                    'London Stock Exchange',
                    'Bank of England',
                    'Canary Wharf London'
                ],
                'paris': [
                    'Euronext Paris',
                    'Banque de France',
                    'La Défense Paris'
                ],
                'frankfurt': [
                    'Deutsche Börse',
                    'European Central Bank',
                    'Frankfurt Stock Exchange'
                ],
                'milan': [
                    'Borsa Italiana',
                    'Bank of Italy Milan'
                ],
                'tokyo': [
                    'Tokyo Stock Exchange',
                    'Bank of Japan'
                ],
                'hong kong': [
                    'Hong Kong Stock Exchange',
                    'Hong Kong Monetary Authority'
                ],
                'singapore': [
                    'Singapore Exchange',
                    'Monetary Authority of Singapore'
                ]
            }
            
            # Try city-specific landmarks first if available
            landmark_queries = []
            if city_name in city_specific_landmarks:
                for landmark in city_specific_landmarks[city_name]:
                    landmark_queries.append(landmark)
            
            # Add generic queries
            landmark_queries.extend([
                f"central bank {base_location}",
                f"stock exchange {base_location}",
                f"federal reserve {base_location}",
                f"financial district {base_location}",
                f"bank headquarters {base_location}",
                f"trading floor {base_location}"
            ])
            
            text_search_url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
            all_valid_results = []
            
            # Try all queries and collect valid results
            for query in landmark_queries[:8]:  # Try up to 8 queries
                try:
                    params = {
                        'query': query,
                        'key': self.google_api_key
                    }
                    response = requests.get(text_search_url, params=params, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('status') == 'OK' and data.get('results'):
                            results = data.get('results', [])
                            # Check all results, not just the first one
                            for place in results[:5]:  # Check top 5 results
                                location = place.get('geometry', {}).get('location', {})
                                place_name = place.get('name', '')
                                
                                if location.get('lat') and location.get('lng'):
                                    # Validate it's a landmark
                                    if self._is_valid_landmark(place, 'finance', topic.lower()):
                                        # Calculate prominence score
                                        rating = place.get('rating', 0)
                                        reviews = place.get('user_ratings_total', 0)
                                        prominence_score = rating * reviews
                                        
                                        all_valid_results.append({
                                            'lat': location['lat'],
                                            'lng': location['lng'],
                                            'place_name': place_name,
                                            'prominence': prominence_score,
                                            'rating': rating,
                                            'reviews': reviews
                                        })
                except Exception as e:
                    print(f"Text search error for {query}: {e}")
                    continue
            
            # Sort by prominence and return the best result
            if all_valid_results:
                all_valid_results.sort(key=lambda x: x['prominence'], reverse=True)
                best_result = all_valid_results[0]
                print(f"✓ Found financial landmark: {best_result['place_name']} (prominence: {best_result['prominence']})")
                return {
                    'lat': best_result['lat'],
                    'lng': best_result['lng'],
                    'place_name': best_result['place_name']
                }
            
            # Fallback to nearby search for banks (prioritize major banks)
            url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
            params = {
                'location': f"{base_coords['lat']},{base_coords['lng']}",
                'radius': 10000,  # 10km radius
                'type': 'bank',
                'key': self.google_api_key
            }
            
            try:
                response = requests.get(url, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'OK' and data.get('results'):
                        # Sort by prominence to prioritize major banks/landmarks
                        results = data.get('results', [])
                        results.sort(key=lambda x: (x.get('rating', 0) * x.get('user_ratings_total', 1)), reverse=True)
                        place = results[0]
                        location = place.get('geometry', {}).get('location', {})
                        place_name = place.get('name', '')
                        
                        if location.get('lat') and location.get('lng'):
                            # Validate it's a landmark
                            if self._is_valid_landmark(place, 'finance', topic.lower()):
                                return {
                                    'lat': location['lat'],
                                    'lng': location['lng'],
                                    'place_name': place_name
                                }
                            else:
                                print(f"✗ Rejected non-landmark: {place_name}")
                                # Try next result
                                if len(results) > 1:
                                    for next_place in results[1:3]:
                                        if self._is_valid_landmark(next_place, 'finance', topic.lower()):
                                            next_location = next_place.get('geometry', {}).get('location', {})
                                            next_name = next_place.get('name', '')
                                            if next_location.get('lat') and next_location.get('lng'):
                                                return {
                                                    'lat': next_location['lat'],
                                                    'lng': next_location['lng'],
                                                    'place_name': next_name
                                                }
            except Exception as e:
                print(f"Error searching for banks: {e}")
            
            # If no specific place found, return the base coordinates
            return base_coords
            
        except Exception as e:
            print(f"Error refining financial location: {e}")
            return None
    
    def _is_valid_landmark(self, place: Dict, category: str, topic: str) -> bool:
        """Validate that a place is actually a landmark, not a random house or generic building"""
        if not place:
            return False
        
        place_name = place.get('name', '').lower()
        place_types = place.get('types', [])
        address = (place.get('formatted_address', '') or place.get('vicinity', '')).lower()
        rating = place.get('rating', 0)
        user_ratings_total = place.get('user_ratings_total', 0)
        
        # Reject if it looks like a residential address
        # Check for house numbers in address (e.g., "123", "456", etc.)
        import re
        # More strict: reject any address with house number pattern
        house_number_pattern = r'\b\d{1,5}\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|boulevard|blvd|place|pl|court|ct|circle|cir)\b'
        if re.search(house_number_pattern, address, re.IGNORECASE):
            # But allow if it's a famous address like "1600 Pennsylvania Avenue" (White House)
            famous_addresses = ['1600 pennsylvania', '10 downing', '221b baker', '1 wall street', '1 times square']
            if not any(famous in address.lower() for famous in famous_addresses):
                print(f"  ✗ Rejected: Looks like residential address: {address}")
                return False
        
        # Also reject if name contains house number pattern
        if re.search(r'^\d{1,5}\s+', place_name):
            print(f"  ✗ Rejected: Name starts with house number: {place_name}")
            return False
        
        # Reject if it's a residential type
        residential_types = ['street_address', 'premise', 'subpremise', 'room']
        if any(rt in place_types for rt in residential_types):
            print(f"  ✗ Rejected: Residential type: {place_types}")
            return False
        
        # For financial/political, require minimum prominence indicators
        if category in ['finance', 'political', 'government']:
            # Must have either good rating (>= 4.0) or many reviews (>= 20) or be a known institution type
            institution_types = ['establishment', 'point_of_interest', 'bank', 'finance', 'city_hall', 
                               'embassy', 'courthouse', 'government', 'stock_exchange', 'tourist_attraction']
            is_institution = any(it in place_types for it in institution_types)
            
            # Calculate prominence score
            prominence_score = rating * user_ratings_total
            
            # Stricter requirements: must be institution AND have good metrics
            if is_institution:
                # For financial landmarks, require higher prominence to avoid less prominent exchanges
                if category == 'finance':
                    # Require minimum prominence score of 100 (e.g., 4.0 rating * 25 reviews)
                    if prominence_score < 100:
                        print(f"  ✗ Rejected: Financial institution not prominent enough (prominence: {prominence_score}, rating: {rating}, reviews: {user_ratings_total})")
                        return False
                else:
                    if rating < 3.5 and user_ratings_total < 15:
                        print(f"  ✗ Rejected: Institution but not prominent enough (rating: {rating}, reviews: {user_ratings_total})")
                        return False
            else:
                # Not an institution type - require very high metrics
                if rating < 4.0 or user_ratings_total < 30:
                    print(f"  ✗ Rejected: Not prominent enough (rating: {rating}, reviews: {user_ratings_total})")
                    return False
            
            # Additional check: reject generic or less specific names for financial landmarks
            if category == 'finance':
                # Reject if name is too generic (e.g., "Madrid Stock Exchange" without proper context)
                generic_financial_names = ['stock exchange', 'financial center', 'trading center']
                if any(gn in place_name for gn in generic_financial_names) and prominence_score < 200:
                    # Only reject if there's likely a better option (lower prominence)
                    print(f"  ✗ Rejected: Generic financial name with low prominence: {place_name}")
                    return False
        
        # Reject generic names that suggest random buildings
        generic_indicators = ['apartment', 'residential', 'house', 'home', 'private', 'unit', 'suite', 'condo', 'condominium', 'residence']
        if any(gi in place_name for gi in generic_indicators):
            print(f"  ✗ Rejected: Generic/residential name: {place_name}")
            return False
        
        # Require that the name contains landmark-like words OR is a known institution
        landmark_indicators = ['bank', 'exchange', 'capitol', 'parliament', 'embassy', 'government', 'federal', 
                              'reserve', 'united nations', 'nato', 'headquarters', 'building', 'tower', 
                              'center', 'centre', 'plaza', 'square', 'hall', 'palace', 'museum', 'library']
        has_landmark_word = any(li in place_name for li in landmark_indicators)
        is_institution_type = any(it in place_types for it in ['establishment', 'point_of_interest', 'tourist_attraction'])
        
        # If it doesn't have landmark words and isn't an institution type, be more strict
        if not has_landmark_word and not is_institution_type:
            # Require very high ratings/reviews
            if rating < 4.5 or user_ratings_total < 50:
                print(f"  ✗ Rejected: No landmark indicators and low prominence: {place_name}")
                return False
        
        # For financial: must be related to finance
        if category == 'finance' or 'finance' in topic or 'banking' in topic:
            financial_keywords = ['bank', 'exchange', 'financial', 'federal reserve', 'trading', 
                                'stock', 'investment', 'capital', 'finance', 'chase', 'morgan', 
                                'goldman', 'wells fargo', 'citibank', 'jpmorgan']
            if not any(fk in place_name for fk in financial_keywords):
                # Check types
                financial_types = ['bank', 'finance', 'atm', 'accounting', 'insurance_agency']
                if not any(ft in place_types for ft in financial_types):
                    print(f"  ✗ Rejected: Not financial-related: {place_name}")
                    return False
        
        # For political: must be related to government/politics
        if category in ['political', 'government'] or 'political' in topic or 'government' in topic:
            political_keywords = ['capitol', 'parliament', 'embassy', 'government', 'diplomatic', 
                                'consulate', 'city hall', 'courthouse', 'federal', 'state', 
                                'united nations', 'nato', 'european']
            if not any(pk in place_name for pk in political_keywords):
                # Check types
                political_types = ['city_hall', 'embassy', 'courthouse', 'government', 'local_government_office']
                if not any(pt in place_types for pt in political_types):
                    print(f"  ✗ Rejected: Not political/government-related: {place_name}")
                    return False
        
        # Accept if it passes all checks
        print(f"  ✓ Valid landmark: {place.get('name', 'Unknown')}")
        return True
    
    def _verify_landmark_with_details(self, place_id: str) -> Optional[Dict]:
        """Use Place Details API to verify a place is actually a landmark"""
        if not self.google_api_key or not place_id:
            return None
        
        try:
            import requests
            url = 'https://maps.googleapis.com/maps/api/place/details/json'
            params = {
                'place_id': place_id,
                'fields': 'name,formatted_address,geometry,types,rating,user_ratings_total,place_id',
                'key': self.google_api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'OK' and data.get('result'):
                    place = data['result']
                    location = place.get('geometry', {}).get('location', {})
                    place_name = place.get('name', '')
                    place_address = place.get('formatted_address', '')
                    
                    # Additional validation with Place Details
                    place_types = place.get('types', [])
                    # Must be a point of interest or establishment, not residential
                    if 'point_of_interest' in place_types or 'establishment' in place_types:
                        if 'street_address' not in place_types and 'premise' not in place_types:
                            if location.get('lat') and location.get('lng'):
                                return {
                                    'lat': location['lat'],
                                    'lng': location['lng'],
                                    'place_name': place_name,
                                    'place_address': place_address
                                }
            
            return None
        except Exception as e:
            print(f"Error verifying landmark details: {e}")
            return None
    
    def _is_vague_location(self, location_str: str) -> bool:
        """Check if location string is vague (just city name or lacks specific landmark)"""
        if not location_str or location_str == 'Unknown':
            return True
        
        parts = [p.strip() for p in location_str.split(',')]
        first_part = parts[0].lower()
        
        # Landmark indicators - if these are present, it's likely a specific landmark
        landmark_indicators = [
            'building', 'palace', 'parliament', 'capitol', 'embassy', 'exchange', 
            'bank', 'tower', 'center', 'centre', 'headquarters', 'hall', 'square',
            'plaza', 'museum', 'library', 'university', 'hospital', 'airport',
            'station', 'port', 'stadium', 'theater', 'theatre', 'cathedral',
            'church', 'mosque', 'temple', 'monument', 'memorial', 'park',
            'stock exchange', 'federal reserve', 'central bank', 'reserve bank',
            'congress', 'senate', 'assembly', 'bourse', 'börse', 'palazzo',
            'palais', 'reichstag', 'bundestag', 'elysee', 'versailles',
            'royal palace', 'presidential', 'diplomatic', 'consulate', 'mission'
        ]
        
        has_landmark_word = any(indicator in first_part for indicator in landmark_indicators)
        is_long_name = len(first_part.split()) >= 3  # 3+ words likely a landmark
        
        # Common vague patterns (just city names)
        vague_patterns = [
            r'^[a-z]+$',  # Single word (likely city)
            r'^[a-z]+\s+[a-z]+$',  # Two words (could be city name)
        ]
        
        import re
        matches_vague_pattern = any(re.match(pattern, first_part) for pattern in vague_patterns)
        
        # If it matches vague pattern AND doesn't have landmark words AND is short
        if matches_vague_pattern and not has_landmark_word and not is_long_name:
            return True
        
        # If it's just "City, Country" format without landmark indicators
        if len(parts) <= 2 and not has_landmark_word and not is_long_name:
            return True
        
        # Check for common city-only names (famous cities that might be returned without landmarks)
        common_cities = ['madrid', 'london', 'paris', 'berlin', 'rome', 'tokyo', 
                        'beijing', 'moscow', 'sydney', 'toronto', 'mumbai', 'dubai',
                        'singapore', 'hong kong', 'seoul', 'mexico city', 'cairo',
                        'istanbul', 'lagos', 'jakarta', 'bangkok', 'barcelona',
                        'amsterdam', 'vienna', 'prague', 'warsaw', 'athens']
        
        if first_part in common_cities and not has_landmark_word:
            return True
        
        return False
    
    def _extract_city_name(self, location_str: str) -> str:
        """Extract city name from location string"""
        if not location_str or location_str == 'Unknown':
            return ''
        
        parts = [p.strip() for p in location_str.split(',')]
        # City is usually the first part, or second if first is a landmark
        # If first part looks like a landmark, city might be in second part
        first_part = parts[0].lower()
        
        landmark_indicators = ['building', 'palace', 'parliament', 'capitol', 'embassy', 
                              'exchange', 'bank', 'tower', 'center', 'headquarters']
        
        if any(ind in first_part for ind in landmark_indicators) and len(parts) > 1:
            # First part is landmark, city is likely second
            return parts[1]
        else:
            # First part is likely the city
            return parts[0]
    
    def _find_landmark_for_city(self, city_location: str, topic: str, category: str) -> Optional[str]:
        """Find a specific landmark in a city when only city name is provided"""
        city_name = self._extract_city_name(city_location)
        if not city_name:
            city_name = city_location.split(',')[0].strip()
        return self._find_landmark_for_city_aggressive(city_name, topic, category)
    
    def _find_landmark_for_city_aggressive(self, city_name: str, topic: str, category: str) -> Optional[str]:
        """Aggressively find a specific landmark in a city - tries many queries"""
        if not self.google_api_key or not city_name:
            return None
        
        try:
            import requests
            
            # Determine landmark type based on category/topic
            topic_lower = topic.lower()
            city_lower = city_name.lower()
            landmark_queries = []
            
            # City-specific landmark mappings for better accuracy
            city_specific_landmarks = {
                'madrid': {
                    'finance': ['Banco de España', 'Bolsas y Mercados Españoles', 'Bolsa de Madrid', 'Bank of Spain Madrid'],
                    'political': ['Spanish Parliament', 'Congreso de los Diputados', 'Royal Palace of Madrid', 'US Embassy Madrid']
                },
                'london': {
                    'finance': ['London Stock Exchange', 'Bank of England', 'Canary Wharf'],
                    'political': ['Houses of Parliament', '10 Downing Street', 'Foreign and Commonwealth Office']
                },
                'paris': {
                    'finance': ['Euronext Paris', 'Banque de France', 'La Défense'],
                    'political': ['Élysée Palace', 'French National Assembly', 'Palace of Versailles']
                },
                'frankfurt': {
                    'finance': ['Deutsche Börse', 'European Central Bank', 'Frankfurt Stock Exchange'],
                    'political': ['Reichstag Building', 'German Bundestag']
                },
                'milan': {
                    'finance': ['Borsa Italiana', 'Bank of Italy Milan'],
                    'political': ['Palazzo Chigi', 'Italian Parliament']
                }
            }
            
            # Try city-specific landmarks first
            if city_lower in city_specific_landmarks:
                if category in city_specific_landmarks[city_lower]:
                    landmark_queries.extend(city_specific_landmarks[city_lower][category])
            
            if category == 'finance' or 'financial' in topic_lower or 'banking' in topic_lower:
                # Very specific financial landmark queries
                landmark_queries.extend([
                    f"{city_name} stock exchange",
                    f"stock exchange in {city_name}",
                    f"{city_name} central bank",
                    f"central bank of {city_name}",
                    f"Federal Reserve {city_name}",
                    f"{city_name} financial district",
                    f"Wall Street {city_name}",
                    f"bank headquarters {city_name}",
                    f"major bank {city_name}",
                    f"{city_name} trading floor"
                ])
            elif category in ['political', 'government'] or 'political' in topic_lower or 'government' in topic_lower or 'geopolitical' in topic_lower:
                # Very specific political/government landmark queries
                landmark_queries = [
                    f"{city_name} parliament",
                    f"parliament of {city_name}",
                    f"{city_name} capitol",
                    f"capitol building {city_name}",
                    f"government building {city_name}",
                    f"embassy in {city_name}",
                    f"US Embassy {city_name}",
                    f"{city_name} city hall",
                    f"presidential palace {city_name}",
                    f"presidential residence {city_name}",
                    f"{city_name} government",
                    f"ministry {city_name}",
                    f"foreign ministry {city_name}",
                    f"diplomatic mission {city_name}"
                ]
            else:
                # Generic landmark search - but still specific
                landmark_queries = [
                    f"famous landmark {city_name}",
                    f"tourist attraction {city_name}",
                    f"monument {city_name}",
                    f"iconic building {city_name}"
                ]
            
            # Search for landmarks - try more queries
            text_search_url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
            all_results = []
            
            for query in landmark_queries[:8]:  # Try up to 8 queries
                try:
                    params = {
                        'query': query,
                        'key': self.google_api_key
                    }
                    response = requests.get(text_search_url, params=params, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('status') == 'OK' and data.get('results'):
                            results = data.get('results', [])
                            # Filter by prominence and add to collection
                            for r in results:
                                if (r.get('rating', 0) * r.get('user_ratings_total', 1)) >= 15:
                                    if r not in all_results:  # Avoid duplicates
                                        all_results.append(r)
                except Exception as e:
                    print(f"Error searching for '{query}': {e}")
                    continue
            
            if not all_results:
                return None
            
            # Sort all results by prominence
            all_results.sort(key=lambda x: x.get('rating', 0) * x.get('user_ratings_total', 1), reverse=True)
            
            # Try to find a valid landmark from all collected results
            for place in all_results[:5]:  # Try top 5 results
                if self._is_valid_landmark(place, category, topic_lower):
                    place_name = place.get('name', '')
                    place_address = place.get('formatted_address', '')
                    
                    # Construct full location string
                    if place_address:
                        # Extract city and country from formatted address
                        address_parts = [p.strip() for p in place_address.split(',')]
                        if len(address_parts) >= 2:
                            # Use landmark name + city + country
                            city_country = ', '.join(address_parts[-2:])
                            return f"{place_name}, {city_country}"
                        else:
                            # Fallback: use original city location
                            return f"{place_name}, {city_name}"
                    else:
                        return f"{place_name}, {city_name}"
            
            # If no valid landmark found, return None (don't use vague location)
            return None
        except Exception as e:
            print(f"Error finding landmark for city: {e}")
            return None
    
    def _extract_country_from_location(self, location_str: str) -> Optional[str]:
        """Extract country name from location string"""
        if not location_str or location_str == 'Unknown':
            return None
        
        parts = [p.strip() for p in location_str.split(',')]
        # Country is usually the last part
        if len(parts) >= 2:
            country = parts[-1]
            # Normalize country names
            country_normalizations = {
                'USA': 'United States',
                'US': 'United States',
                'UAE': 'United Arab Emirates',
                'UK': 'United Kingdom'
            }
            return country_normalizations.get(country, country)
        return None
    
    def _find_default_landmark_for_city(self, city_name: str, category: str) -> Optional[str]:
        """Find a default well-known landmark for a city as last resort"""
        # First, try to find country-based default landmark
        # This is more reliable than searching for generic landmarks
        try:
            # Try to geocode the city to get its country
            city_coords = self._geocode_location(city_name)
            if city_coords['lat'] != 0:
                # Reverse geocode to get country
                try:
                    if self.google_geocoder:
                        location = self.google_geocoder.reverse(
                            f"{city_coords['lat']}, {city_coords['lng']}",
                            exactly_one=True
                        )
                        if location:
                            address = location.raw.get('address', {})
                            country = address.get('country', '')
                            
                            # Try country-based defaults first
                            if country in self.country_default_landmarks:
                                default_landmark = self.country_default_landmarks[country].get(category)
                                if default_landmark:
                                    print(f"✓ Using country default landmark for {country}: {default_landmark}")
                                    return default_landmark
                            
                            # Try alternative country names
                            country_alternatives = {
                                'United States of America': 'United States',
                                'United States': 'United States',
                                'USA': 'United States',
                                'US': 'United States',
                                'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
                                'United Kingdom': 'United Kingdom',
                                'UK': 'United Kingdom',
                                'UAE': 'United Arab Emirates',
                                'United Arab Emirates': 'United Arab Emirates'
                            }
                            
                            normalized_country = country_alternatives.get(country, country)
                            if normalized_country in self.country_default_landmarks:
                                default_landmark = self.country_default_landmarks[normalized_country].get(category)
                                if default_landmark:
                                    print(f"✓ Using country default landmark for {normalized_country}: {default_landmark}")
                                    return default_landmark
                except Exception as e:
                    print(f"Error reverse geocoding: {e}")
        except Exception as e:
            print(f"Error getting country for {city_name}: {e}")
        
        # Fallback: try to extract country from city name if it includes country
        # (e.g., "Madrid, Spain" -> "Spain")
        if ',' in city_name:
            parts = [p.strip() for p in city_name.split(',')]
            potential_country = parts[-1]
            if potential_country in self.country_default_landmarks:
                default_landmark = self.country_default_landmarks[potential_country].get(category)
                if default_landmark:
                    print(f"✓ Using country default landmark from city name: {default_landmark}")
                    return default_landmark
        
        # Last resort: use Google Places API to find a landmark
        if not self.google_api_key:
            return None
        
        try:
            import requests
            
            # Use very generic but reliable queries that should return famous landmarks
            default_queries = [
                f"famous landmark {city_name}",
                f"tourist attraction {city_name}",
                f"iconic building {city_name}",
                f"monument {city_name}"
            ]
            
            # Add category-specific defaults
            if category == 'finance':
                default_queries.insert(0, f"financial district {city_name}")
                default_queries.insert(1, f"bank {city_name}")
            elif category in ['political', 'government']:
                default_queries.insert(0, f"government building {city_name}")
                default_queries.insert(1, f"city hall {city_name}")
            
            text_search_url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
            
            for query in default_queries[:5]:
                try:
                    params = {
                        'query': query,
                        'key': self.google_api_key
                    }
                    response = requests.get(text_search_url, params=params, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('status') == 'OK' and data.get('results'):
                            results = data.get('results', [])
                            # Sort by prominence - get the most famous one
                            results.sort(key=lambda x: (x.get('rating', 0) * x.get('user_ratings_total', 1)), reverse=True)
                            
                            # Take the top result if it has good metrics
                            if results:
                                place = results[0]
                                rating = place.get('rating', 0)
                                reviews = place.get('user_ratings_total', 0)
                                
                                # Only use if it's a well-known place
                                if rating >= 4.0 or reviews >= 50:
                                    place_name = place.get('name', '')
                                    place_address = place.get('formatted_address', '')
                                    
                                    if place_address:
                                        address_parts = [p.strip() for p in place_address.split(',')]
                                        if len(address_parts) >= 2:
                                            return f"{place_name}, {', '.join(address_parts[-2:])}"
                                        else:
                                            return f"{place_name}, {city_name}"
                                    else:
                                        return f"{place_name}, {city_name}"
                except Exception as e:
                    continue
            
            return None
        except Exception as e:
            print(f"Error finding default landmark: {e}")
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
        if not self.client:
            return article.get('category', 'political')
        
        try:
            prompt = f"""Categorize this news article as either "financial" or "political":
            
Title: {article.get('title', '')}
Summary: {article.get('summary', '')[:300]}

Respond with ONLY one word: "financial" or "political"."""
            
            response = self.client.chat_completions_create(
                model=None,  # Uses default free model
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
    
    def process_articles(self, articles: List[Dict] = None, mode: str = 'economic'):
        """Process articles: detect locations, categorize, and prepare for API
        
        Args:
            articles: List of articles to process
            mode: 'economic' for finance-oriented titles, 'political' for political/geopolitical-oriented titles
        """
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
            
            # Transform title based on mode
            original_title = article.get('title', '')
            if mode == 'political':
                transformed_title = self._make_title_political_oriented(original_title)
            else:  # default to economic
                transformed_title = self._make_title_finance_oriented(original_title)
            
            # Validate and preserve URL
            article_url = article.get('url', '')
            if not article_url or not isinstance(article_url, str) or not article_url.strip():
                print(f"Warning: Article '{original_title[:50]}...' has no valid URL, skipping")
                continue
            
            article_url = article_url.strip()
            if not article_url.startswith(('http://', 'https://')):
                print(f"Warning: Article '{original_title[:50]}...' has invalid URL format: {article_url}, skipping")
                continue
            
            # Create processed article with validated URL
            processed_article = {
                'id': f"article_{i}_{hash(article_url)}",
                'title': transformed_title,
                'url': article_url,  # Use validated URL
                'summary': article.get('summary', ''),
                'category': category,
                'source': article.get('source', 'Unknown'),
                'published': article.get('published', ''),
                'location': location_data['location_name'],
                'coordinates': location_data['coordinates'],
                'location_reasoning': location_data.get('location_reasoning', 'This location is relevant to the article topic.'),
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
    
    def _make_title_political_oriented(self, title: str) -> str:
        """Transform any title to be political/geopolitical/war-oriented"""
        if not title:
            return "Geopolitical Analysis: International Relations and Strategic Developments"
        
        title_lower = title.lower()
        
        # Check if already political/geopolitical/war-related
        political_keywords = ['political', 'politics', 'geopolitical', 'geopolitics', 'war', 'conflict', 
                             'diplomacy', 'diplomatic', 'government', 'election', 'vote', 'policy', 
                             'sanctions', 'treaty', 'alliance', 'military', 'defense', 'security', 
                             'crisis', 'tension', 'summit', 'negotiation', 'sovereignty', 'border',
                             'territory', 'regime', 'administration', 'cabinet', 'parliament', 'congress']
        
        if any(keyword in title_lower for keyword in political_keywords):
            # Already political-oriented, return as is
            return title
        
        # Transform to political-oriented
        # Add political/geopolitical context to the title
        political_prefixes = [
            "Geopolitical Impact: ",
            "Political Analysis: ",
            "Strategic Implications: ",
            "Diplomatic Developments: ",
            "International Relations: ",
            "Political Crisis: ",
            "Geopolitical Tensions: ",
            "Strategic Assessment: ",
            "Political Shift: ",
            "Geopolitical Dynamics: "
        ]
        
        import random
        prefix = random.choice(political_prefixes)
        
        # If title is very long, truncate and add political context
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
        articles = self.processed_articles if category == 'all' else [a for a in self.processed_articles if a.get('category') == category]
        # Filter out articles without valid URLs
        return [a for a in articles if a.get('url') and isinstance(a.get('url'), str) and a.get('url').strip().startswith(('http://', 'https://'))]
    
    def get_popular_articles(self, category: str = 'all', limit: int = 20) -> List[Dict]:
        """Get most popular articles, sorted by popularity score"""
        articles = self.get_articles_by_category(category)
        # Ensure all articles have valid URLs before sorting
        valid_articles = [a for a in articles if a.get('url') and isinstance(a.get('url'), str) and a.get('url').strip().startswith(('http://', 'https://'))]
        sorted_articles = sorted(valid_articles, key=lambda x: x.get('popularity_score', 0), reverse=True)
        return sorted_articles[:limit]
