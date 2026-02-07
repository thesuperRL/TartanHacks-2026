"""Company data provider for top companies and lesser-known companies with stock data"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import asyncio
import yfinance as yf
from dedalus_labs import AsyncDedalus, DedalusRunner

# Top 20 global companies with their headquarters locations
TOP_COMPANIES = [
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "hq": {"city": "Cupertino", "country": "USA", "lat": 37.3346, "lng": -122.0090}},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology", "hq": {"city": "Redmond", "country": "USA", "lat": 47.6740, "lng": -122.1215}},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology", "hq": {"city": "Mountain View", "country": "USA", "lat": 37.4220, "lng": -122.0841}},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Cyclical", "hq": {"city": "Seattle", "country": "USA", "lat": 47.6062, "lng": -122.3321}},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology", "hq": {"city": "Santa Clara", "country": "USA", "lat": 37.3707, "lng": -121.9553}},
    {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Technology", "hq": {"city": "Menlo Park", "country": "USA", "lat": 37.4530, "lng": -122.1817}},
    {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Automotive", "hq": {"city": "Austin", "country": "USA", "lat": 30.2672, "lng": -97.7431}},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway", "sector": "Financial", "hq": {"city": "Omaha", "country": "USA", "lat": 41.2565, "lng": -95.9345}},
    {"symbol": "TSM", "name": "Taiwan Semiconductor", "sector": "Technology", "hq": {"city": "Hsinchu", "country": "Taiwan", "lat": 24.8066, "lng": 120.9686}},
    {"symbol": "V", "name": "Visa Inc.", "sector": "Financial", "hq": {"city": "San Francisco", "country": "USA", "lat": 37.7749, "lng": -122.4194}},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financial", "hq": {"city": "New York", "country": "USA", "lat": 40.7128, "lng": -74.0060}},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "hq": {"city": "New Brunswick", "country": "USA", "lat": 40.4862, "lng": -74.4518}},
    {"symbol": "WMT", "name": "Walmart Inc.", "sector": "Consumer Defensive", "hq": {"city": "Bentonville", "country": "USA", "lat": 36.3729, "lng": -94.2088}},
    {"symbol": "PG", "name": "Procter & Gamble Co.", "sector": "Consumer Defensive", "hq": {"city": "Cincinnati", "country": "USA", "lat": 39.1031, "lng": -84.5120}},
    {"symbol": "NESN.SW", "name": "Nestle S.A.", "sector": "Consumer Defensive", "hq": {"city": "Vevey", "country": "Switzerland", "lat": 46.4628, "lng": 6.8418}},
    {"symbol": "ASML", "name": "ASML Holding N.V.", "sector": "Technology", "hq": {"city": "Veldhoven", "country": "Netherlands", "lat": 51.4201, "lng": 5.4095}},
    {"symbol": "TM", "name": "Toyota Motor Corp.", "sector": "Automotive", "hq": {"city": "Toyota City", "country": "Japan", "lat": 35.0826, "lng": 137.1569}},
    {"symbol": "SHEL", "name": "Shell plc", "sector": "Energy", "hq": {"city": "London", "country": "UK", "lat": 51.5074, "lng": -0.1278}},
    {"symbol": "XOM", "name": "Exxon Mobil Corp.", "sector": "Energy", "hq": {"city": "Irving", "country": "USA", "lat": 32.8140, "lng": -96.9489}},
    {"symbol": "SAP", "name": "SAP SE", "sector": "Technology", "hq": {"city": "Walldorf", "country": "Germany", "lat": 49.3066, "lng": 8.6426}},
]

# Lesser-known but promising companies
LESSER_KNOWN_COMPANIES = [
    {"symbol": "PLTR", "name": "Palantir Technologies", "sector": "Technology", "description": "Data analytics and AI platform company"},
    {"symbol": "SNOW", "name": "Snowflake Inc.", "sector": "Technology", "description": "Cloud data platform provider"},
    {"symbol": "DDOG", "name": "Datadog Inc.", "sector": "Technology", "description": "Cloud monitoring and security platform"},
    {"symbol": "NET", "name": "Cloudflare Inc.", "sector": "Technology", "description": "Web performance and security company"},
    {"symbol": "CRWD", "name": "CrowdStrike Holdings", "sector": "Technology", "description": "Cybersecurity platform provider"},
    {"symbol": "ZS", "name": "Zscaler Inc.", "sector": "Technology", "description": "Cloud security company"},
    {"symbol": "OKTA", "name": "Okta Inc.", "sector": "Technology", "description": "Identity and access management"},
    {"symbol": "MELI", "name": "MercadoLibre Inc.", "sector": "Consumer Cyclical", "description": "Latin American e-commerce platform"},
    {"symbol": "SE", "name": "Sea Limited", "sector": "Technology", "description": "Southeast Asian tech conglomerate"},
    {"symbol": "GRAB", "name": "Grab Holdings", "sector": "Technology", "description": "Southeast Asian super app"},
    {"symbol": "NU", "name": "Nu Holdings", "sector": "Financial", "description": "Brazilian digital bank"},
    {"symbol": "SOFI", "name": "SoFi Technologies", "sector": "Financial", "description": "Digital financial services platform"},
    {"symbol": "AFRM", "name": "Affirm Holdings", "sector": "Financial", "description": "Buy now, pay later platform"},
    {"symbol": "RIVN", "name": "Rivian Automotive", "sector": "Automotive", "description": "Electric vehicle manufacturer"},
    {"symbol": "LCID", "name": "Lucid Group", "sector": "Automotive", "description": "Luxury electric vehicle maker"},
]


class CompanyDataProvider:
    """Provides data for top companies and lesser-known companies"""
    
    def __init__(self):
        self.cache = {}
        self.cache_duration = timedelta(minutes=15)
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid"""
        if key not in self.cache:
            return False
        cached_time = self.cache[key].get('timestamp')
        if not cached_time:
            return False
        return datetime.now() - cached_time < self.cache_duration
    
    def _sanitize_value(self, value, default=None):
        """Sanitize a value to ensure it's JSON-serializable (no NaN, Inf)"""
        import math
        if value is None:
            return default
        if isinstance(value, float):
            if math.isnan(value) or math.isinf(value):
                return default
        return value
    
    def _sanitize_dict(self, d: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize a dictionary to remove NaN/Inf values"""
        import math
        result = {}
        for key, value in d.items():
            if isinstance(value, dict):
                result[key] = self._sanitize_dict(value)
            elif isinstance(value, list):
                result[key] = [self._sanitize_dict(item) if isinstance(item, dict) else self._sanitize_value(item) for item in value]
            elif isinstance(value, float):
                if math.isnan(value) or math.isinf(value):
                    result[key] = None
                else:
                    result[key] = value
            else:
                result[key] = value
        return result
    
    def get_top_companies(self) -> List[Dict[str, Any]]:
        """Get list of top companies with basic info and locations"""
        cache_key = 'top_companies'
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]['data']
        
        companies = []
        for company in TOP_COMPANIES:
            try:
                ticker = yf.Ticker(company['symbol'])
                info = ticker.info
                hist = ticker.history(period='5d')
                
                current_price = float(hist['Close'].iloc[-1]) if not hist.empty else None
                prev_price = float(hist['Close'].iloc[-2]) if len(hist) > 1 else current_price
                change_percent = ((current_price - prev_price) / prev_price * 100) if prev_price else 0
                
                companies.append({
                    "symbol": company['symbol'],
                    "name": company['name'],
                    "sector": company['sector'],
                    "headquarters": company['hq'],
                    "currentPrice": round(current_price, 2) if current_price else None,
                    "changePercent": round(change_percent, 2),
                    "marketCap": info.get('marketCap'),
                    "marketCapFormatted": self._format_market_cap(info.get('marketCap'))
                })
            except Exception as e:
                print(f"Error fetching data for {company['symbol']}: {e}")
                companies.append({
                    "symbol": company['symbol'],
                    "name": company['name'],
                    "sector": company['sector'],
                    "headquarters": company['hq'],
                    "currentPrice": None,
                    "changePercent": None,
                    "marketCap": None,
                    "marketCapFormatted": "N/A"
                })
        
        self.cache[cache_key] = {'data': companies, 'timestamp': datetime.now()}
        return companies
    
    def get_company_chart_data(self, symbol: str) -> Dict[str, Any]:
        """Get weekly stock price and revenue data for a company (1 year)"""
        cache_key = f'chart_{symbol}'
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]['data']
        
        try:
            ticker = yf.Ticker(symbol)
            
            # Get 1 year of weekly data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=365)
            hist = ticker.history(start=start_date, end=end_date)
            
            if hist.empty:
                return {"error": f"No data found for {symbol}"}
            
            # Resample to weekly data
            weekly_data = []
            try:
                weekly = hist['Close'].resample('W-FRI').last()
                weekly_volume = hist['Volume'].resample('W-FRI').sum()
                
                for date, price in weekly.items():
                    if price is not None:
                        weekly_data.append({
                            "date": date.strftime('%Y-%m-%d'),
                            "price": round(float(price), 2),
                            "volume": int(weekly_volume.get(date, 0))
                        })
            except Exception:
                # Fallback: group by week period
                for i in range(0, len(hist), 5):
                    if i < len(hist):
                        date = hist.index[i]
                        price = hist['Close'].iloc[i]
                        weekly_data.append({
                            "date": date.strftime('%Y-%m-%d'),
                            "price": round(float(price), 2),
                            "volume": int(hist['Volume'].iloc[i])
                        })
            
            # Get company info for revenue data
            info = ticker.info
            
            # Get quarterly financials for revenue
            import math
            revenue_data = []
            try:
                financials = ticker.quarterly_income_stmt
                if financials is not None and not financials.empty:
                    if 'Total Revenue' in financials.index:
                        revenue_row = financials.loc['Total Revenue']
                        for date, value in revenue_row.items():
                            # Check for None, NaN, and Inf values
                            if value is not None:
                                try:
                                    float_value = float(value)
                                    if not math.isnan(float_value) and not math.isinf(float_value):
                                        revenue_data.append({
                                            "quarter": date.strftime('%Y-Q%q') if hasattr(date, 'strftime') else str(date),
                                            "date": date.strftime('%Y-%m-%d') if hasattr(date, 'strftime') else str(date),
                                            "revenue": float_value,
                                            "revenueFormatted": self._format_revenue(float_value)
                                        })
                                except (ValueError, TypeError):
                                    # Skip invalid values
                                    pass
            except Exception as e:
                print(f"Error fetching revenue for {symbol}: {e}")
            
            # Calculate year change safely
            year_change = None
            if not hist.empty and len(hist) > 0:
                try:
                    start_price = float(hist['Close'].iloc[0])
                    end_price = float(hist['Close'].iloc[-1])
                    if start_price > 0 and not math.isnan(start_price) and not math.isnan(end_price):
                        year_change = round(((end_price - start_price) / start_price * 100), 2)
                except (ValueError, TypeError):
                    pass
            
            result = {
                "symbol": symbol,
                "name": info.get('longName') or info.get('shortName') or symbol,
                "sector": info.get('sector', 'Unknown'),
                "weeklyPrices": weekly_data,
                "quarterlyRevenue": revenue_data[:4],  # Last 4 quarters
                "currentPrice": self._sanitize_value(round(float(hist['Close'].iloc[-1]), 2)) if not hist.empty else None,
                "yearHigh": self._sanitize_value(round(float(hist['High'].max()), 2)) if not hist.empty else None,
                "yearLow": self._sanitize_value(round(float(hist['Low'].min()), 2)) if not hist.empty else None,
                "yearChange": year_change
            }
            
            # Sanitize the entire result to catch any remaining NaN/Inf
            result = self._sanitize_dict(result)
            
            self.cache[cache_key] = {'data': result, 'timestamp': datetime.now()}
            return result
            
        except Exception as e:
            return {"error": f"Failed to fetch data for {symbol}: {str(e)}"}
    
    def get_lesser_known_companies(self) -> List[Dict[str, Any]]:
        """Get lesser-known companies with current stock data"""
        cache_key = 'lesser_known'
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]['data']
        
        companies = []
        for company in LESSER_KNOWN_COMPANIES:
            try:
                ticker = yf.Ticker(company['symbol'])
                info = ticker.info
                hist = ticker.history(period='1mo')
                
                if not hist.empty:
                    current_price = float(hist['Close'].iloc[-1])
                    month_ago_price = float(hist['Close'].iloc[0])
                    month_change = ((current_price - month_ago_price) / month_ago_price * 100)
                    
                    # Get 5-day change
                    hist_5d = ticker.history(period='5d')
                    day_change = 0
                    if len(hist_5d) > 1:
                        day_change = ((float(hist_5d['Close'].iloc[-1]) - float(hist_5d['Close'].iloc[-2])) / float(hist_5d['Close'].iloc[-2]) * 100)
                    
                    companies.append({
                        "symbol": company['symbol'],
                        "name": company['name'],
                        "sector": company['sector'],
                        "description": company['description'],
                        "currentPrice": round(current_price, 2),
                        "dayChange": round(day_change, 2),
                        "monthChange": round(month_change, 2),
                        "marketCap": info.get('marketCap'),
                        "marketCapFormatted": self._format_market_cap(info.get('marketCap')),
                        "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh'),
                        "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow')
                    })
                else:
                    companies.append({
                        "symbol": company['symbol'],
                        "name": company['name'],
                        "sector": company['sector'],
                        "description": company['description'],
                        "currentPrice": None,
                        "dayChange": None,
                        "monthChange": None,
                        "marketCap": None,
                        "marketCapFormatted": "N/A"
                    })
            except Exception as e:
                print(f"Error fetching data for {company['symbol']}: {e}")
                companies.append({
                    "symbol": company['symbol'],
                    "name": company['name'],
                    "sector": company['sector'],
                    "description": company['description'],
                    "currentPrice": None,
                    "dayChange": None,
                    "monthChange": None,
                    "marketCap": None,
                    "marketCapFormatted": "N/A"
                })
        
        self.cache[cache_key] = {'data': companies, 'timestamp': datetime.now()}
        return companies
    
    def get_portfolio_stocks_data(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Fetch current data for portfolio stocks to evaluate for sell recommendations"""
        portfolio_data = []
        
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                hist = ticker.history(period='1mo')
                
                if not hist.empty and info:
                    current_price = round(float(hist['Close'].iloc[-1]), 2)
                    prev_close = float(info.get('previousClose', current_price))
                    day_change = round(((current_price - prev_close) / prev_close) * 100, 2) if prev_close else 0
                    
                    # Calculate month change
                    if len(hist) > 1:
                        month_start = float(hist['Close'].iloc[0])
                        month_change = round(((current_price - month_start) / month_start) * 100, 2)
                    else:
                        month_change = 0
                    
                    portfolio_data.append({
                        "symbol": symbol,
                        "name": info.get('shortName', symbol),
                        "currentPrice": current_price,
                        "dayChange": day_change,
                        "monthChange": month_change,
                        "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh'),
                        "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow'),
                        "sector": info.get('sector', 'Unknown')
                    })
            except Exception as e:
                print(f"Error fetching portfolio stock {symbol}: {e}")
                portfolio_data.append({
                    "symbol": symbol,
                    "name": symbol,
                    "currentPrice": None,
                    "dayChange": None,
                    "monthChange": None
                })
        
        return portfolio_data
    
    async def get_investment_recommendations(self, companies: List[Dict[str, Any]], portfolio_stocks: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get AI-powered investment recommendations for lesser-known companies using Dedalus Labs"""
        
        # Build company data for the prompt
        company_data = []
        for company in companies:
            if company.get('currentPrice'):
                company_data.append(
                    f"- {company['symbol']} ({company['name']}): ${company['currentPrice']}, "
                    f"Day: {company.get('dayChange', 0):+.2f}%, Month: {company.get('monthChange', 0):+.2f}%, "
                    f"52W Range: ${company.get('fiftyTwoWeekLow', 'N/A')}-${company.get('fiftyTwoWeekHigh', 'N/A')}, "
                    f"Sector: {company['sector']}"
                )
        
        # Build portfolio data for sell recommendations
        portfolio_data = []
        if portfolio_stocks:
            for stock in portfolio_stocks:
                if stock.get('currentPrice'):
                    portfolio_data.append(
                        f"- {stock['symbol']} ({stock['name']}): ${stock['currentPrice']}, "
                        f"Day: {stock.get('dayChange', 0):+.2f}%, Month: {stock.get('monthChange', 0):+.2f}%, "
                        f"52W Range: ${stock.get('fiftyTwoWeekLow', 'N/A')}-${stock.get('fiftyTwoWeekHigh', 'N/A')}, "
                        f"Sector: {stock.get('sector', 'Unknown')}"
                    )
        
        portfolio_section = ""
        if portfolio_data:
            portfolio_section = f"""

USER'S CURRENT PORTFOLIO (analyze for SELL recommendations):
{chr(10).join(portfolio_data)}

IMPORTANT: Carefully analyze the user's portfolio stocks above. If any are underperforming, overvalued, or have negative momentum, include them in the "sell" recommendations with a clear rationale explaining why the user should consider selling."""
        
        prompt = f"""You are a financial analyst providing investment recommendations. Analyze the following data and provide structured recommendations.

EMERGING COMPANIES DATA (for BUY recommendations):
{chr(10).join(company_data)}{portfolio_section}

INSTRUCTIONS:
1. Analyze each company's price movement, sector trends, and growth potential
2. For emerging companies: Categorize into "Strong Buy", "Buy", or "Hold"
3. For portfolio stocks: Critically evaluate if any should be SOLD (look for negative trends, overvaluation, poor performance)
4. Be honest about sell recommendations - if a stock is performing poorly, recommend selling it
5. For each recommendation, provide a brief rationale (1-2 sentences)
6. Identify the top 3 picks with specific entry points and target prices

Return ONLY valid JSON in this exact format:
{{
    "recommendations": {{
        "strongBuy": [
            {{"symbol": "ABC", "name": "Company Name", "rationale": "Brief reason", "entryPoint": 50.00, "targetPrice": 75.00, "riskLevel": "Medium"}}
        ],
        "buy": [
            {{"symbol": "XYZ", "name": "Company Name", "rationale": "Brief reason"}}
        ],
        "hold": [
            {{"symbol": "DEF", "name": "Company Name", "rationale": "Brief reason"}}
        ],
        "sell": [
            {{"symbol": "GHI", "name": "Company Name", "rationale": "Brief reason explaining why to sell"}}
        ]
    }},
    "topPicks": [
        {{"symbol": "ABC", "name": "Company Name", "recommendation": "Strong Buy", "entryPoint": 50.00, "targetPrice": 75.00, "potentialReturn": "50%", "rationale": "Detailed reason (2-3 sentences)"}}
    ],
    "marketInsights": "Brief market analysis relevant to these companies (2-3 sentences)",
    "sectorTrends": [
        {{"sector": "Technology", "trend": "Bullish", "reason": "Brief reason"}}
    ],
    "lastUpdated": "{datetime.now().strftime('%Y-%m-%d %H:%M')}"
}}

CRITICAL: Return realistic, well-reasoned recommendations. Be honest about poor performers in the portfolio - recommend selling them if warranted."""

        client = None
        try:
            client = AsyncDedalus()
            runner = DedalusRunner(client)
            
            response = await runner.run(input=prompt, model="google/gemini-2.5-flash")
            
            # Extract text from response
            response_text = None
            for attr in ('final_output', 'text', 'content', 'body', 'output'):
                val = getattr(response, attr, None)
                if isinstance(val, str) and val.strip():
                    response_text = val
                    break
            
            if not response_text:
                response_text = str(response)
            
            # Clean up response and parse JSON
            if '```' in response_text:
                parts = response_text.split('```')
                for p in parts:
                    p_strip = p.strip()
                    if p_strip.startswith('json'):
                        response_text = p_strip[4:].strip()
                        break
                    elif p_strip.startswith('{'):
                        response_text = p_strip
                        break
            
            # Find JSON object
            start = response_text.find('{')
            if start != -1:
                depth = 0
                for i in range(start, len(response_text)):
                    if response_text[i] == '{':
                        depth += 1
                    elif response_text[i] == '}':
                        depth -= 1
                        if depth == 0:
                            response_text = response_text[start:i+1]
                            break
            
            result = json.loads(response_text)
            return result
            
        except Exception as e:
            print(f"Error getting AI recommendations: {e}")
            # Return fallback recommendations
            return self._generate_fallback_recommendations(companies)
        finally:
            # Properly close the async client to avoid event loop errors
            if client is not None:
                try:
                    await client.close()
                except Exception:
                    pass  # Ignore cleanup errors
    
    def _generate_fallback_recommendations(self, companies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate fallback recommendations when AI is unavailable"""
        # Sort by month change to find best performers
        valid_companies = [c for c in companies if c.get('currentPrice') and c.get('monthChange') is not None]
        sorted_companies = sorted(valid_companies, key=lambda x: x.get('monthChange', 0), reverse=True)
        
        strong_buy = []
        buy = []
        hold = []
        sell = []
        
        for i, company in enumerate(sorted_companies):
            item = {
                "symbol": company['symbol'],
                "name": company['name'],
                "rationale": f"Based on {company.get('monthChange', 0):+.1f}% monthly performance"
            }
            
            month_change = company.get('monthChange', 0)
            if month_change > 15:
                item['rationale'] = f"Strong momentum with {month_change:+.1f}% monthly gain"
                strong_buy.append(item)
            elif month_change > 5:
                item['rationale'] = f"Positive trend with {month_change:+.1f}% monthly gain"
                buy.append(item)
            elif month_change > -5:
                item['rationale'] = f"Stable performance with {month_change:+.1f}% monthly change"
                hold.append(item)
            else:
                item['rationale'] = f"Underperforming with {month_change:+.1f}% monthly decline"
                sell.append(item)
        
        top_picks = []
        for company in sorted_companies[:3]:
            current = company.get('currentPrice', 0)
            top_picks.append({
                "symbol": company['symbol'],
                "name": company['name'],
                "recommendation": "Strong Buy" if company.get('monthChange', 0) > 10 else "Buy",
                "entryPoint": round(current * 0.95, 2),
                "targetPrice": round(current * 1.3, 2),
                "potentialReturn": "30%",
                "rationale": f"{company['name']} shows strong momentum in the {company['sector']} sector."
            })
        
        return {
            "recommendations": {
                "strongBuy": strong_buy[:3],
                "buy": buy[:4],
                "hold": hold[:5],
                "sell": sell[:2]
            },
            "topPicks": top_picks,
            "marketInsights": "Market conditions suggest focusing on technology and financial services sectors with strong fundamentals.",
            "sectorTrends": [
                {"sector": "Technology", "trend": "Bullish", "reason": "AI and cloud growth driving valuations"},
                {"sector": "Financial", "trend": "Neutral", "reason": "Interest rate uncertainty affecting banks"}
            ],
            "lastUpdated": datetime.now().strftime('%Y-%m-%d %H:%M')
        }
    
    def _format_market_cap(self, market_cap: int) -> str:
        """Format market cap in human-readable format"""
        if not market_cap:
            return "N/A"
        if market_cap >= 1e12:
            return f"${market_cap / 1e12:.2f}T"
        elif market_cap >= 1e9:
            return f"${market_cap / 1e9:.2f}B"
        elif market_cap >= 1e6:
            return f"${market_cap / 1e6:.2f}M"
        else:
            return f"${market_cap:,.0f}"
    
    def _format_revenue(self, revenue: float) -> str:
        """Format revenue in human-readable format"""
        if not revenue:
            return "N/A"
        if abs(revenue) >= 1e12:
            return f"${revenue / 1e12:.2f}T"
        elif abs(revenue) >= 1e9:
            return f"${revenue / 1e9:.2f}B"
        elif abs(revenue) >= 1e6:
            return f"${revenue / 1e6:.2f}M"
        else:
            return f"${revenue:,.0f}"
