"""Companies data module - fetches stock prices, revenue, and company info for top companies."""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import yfinance as yf

# Top 20 companies with their headquarters locations
TOP_COMPANIES = [
    {"symbol": "AAPL", "name": "Apple Inc.", "city": "Cupertino", "country": "USA", "lat": 37.3349, "lng": -122.0090},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "city": "Redmond", "country": "USA", "lat": 47.6397, "lng": -122.1285},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "city": "Mountain View", "country": "USA", "lat": 37.4220, "lng": -122.0841},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "city": "Seattle", "country": "USA", "lat": 47.6062, "lng": -122.3321},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "city": "Santa Clara", "country": "USA", "lat": 37.3707, "lng": -121.9676},
    {"symbol": "META", "name": "Meta Platforms Inc.", "city": "Menlo Park", "country": "USA", "lat": 37.4530, "lng": -122.1817},
    {"symbol": "TSLA", "name": "Tesla Inc.", "city": "Austin", "country": "USA", "lat": 30.2231, "lng": -97.7613},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway", "city": "Omaha", "country": "USA", "lat": 41.2565, "lng": -95.9345},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "city": "New York", "country": "USA", "lat": 40.7580, "lng": -73.9855},
    {"symbol": "V", "name": "Visa Inc.", "city": "San Francisco", "country": "USA", "lat": 37.7897, "lng": -122.3972},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "city": "New Brunswick", "country": "USA", "lat": 40.4862, "lng": -74.4518},
    {"symbol": "WMT", "name": "Walmart Inc.", "city": "Bentonville", "country": "USA", "lat": 36.3729, "lng": -94.2088},
    {"symbol": "UNH", "name": "UnitedHealth Group", "city": "Minnetonka", "country": "USA", "lat": 44.9131, "lng": -93.4687},
    {"symbol": "XOM", "name": "Exxon Mobil Corporation", "city": "Spring", "country": "USA", "lat": 30.0799, "lng": -95.4194},
    {"symbol": "MA", "name": "Mastercard Inc.", "city": "Purchase", "country": "USA", "lat": 41.0410, "lng": -73.7146},
    {"symbol": "PG", "name": "Procter & Gamble Co.", "city": "Cincinnati", "country": "USA", "lat": 39.1031, "lng": -84.5120},
    {"symbol": "ASML", "name": "ASML Holding N.V.", "city": "Veldhoven", "country": "Netherlands", "lat": 51.4200, "lng": 5.4050},
    {"symbol": "TSM", "name": "Taiwan Semiconductor", "city": "Hsinchu", "country": "Taiwan", "lat": 24.7867, "lng": 120.9967},
    {"symbol": "SAP", "name": "SAP SE", "city": "Walldorf", "country": "Germany", "lat": 49.2956, "lng": 8.6428},
    {"symbol": "NVO", "name": "Novo Nordisk A/S", "city": "Bagsværd", "country": "Denmark", "lat": 55.7560, "lng": 12.4562},
]

# Lesser-known but promising companies for recommendations
EMERGING_COMPANIES = [
    {"symbol": "PLTR", "name": "Palantir Technologies", "sector": "Technology"},
    {"symbol": "CRWD", "name": "CrowdStrike Holdings", "sector": "Cybersecurity"},
    {"symbol": "SNOW", "name": "Snowflake Inc.", "sector": "Cloud Data"},
    {"symbol": "NET", "name": "Cloudflare Inc.", "sector": "Web Infrastructure"},
    {"symbol": "DDOG", "name": "Datadog Inc.", "sector": "Monitoring"},
    {"symbol": "ZS", "name": "Zscaler Inc.", "sector": "Security"},
    {"symbol": "MDB", "name": "MongoDB Inc.", "sector": "Database"},
    {"symbol": "OKTA", "name": "Okta Inc.", "sector": "Identity Management"},
    {"symbol": "TEAM", "name": "Atlassian Corporation", "sector": "Software"},
    {"symbol": "HUBS", "name": "HubSpot Inc.", "sector": "Marketing Software"},
    {"symbol": "BILL", "name": "Bill Holdings Inc.", "sector": "Fintech"},
    {"symbol": "CFLT", "name": "Confluent Inc.", "sector": "Data Streaming"},
    {"symbol": "S", "name": "SentinelOne Inc.", "sector": "Cybersecurity"},
    {"symbol": "PATH", "name": "UiPath Inc.", "sector": "Automation"},
    {"symbol": "DOCN", "name": "DigitalOcean Holdings", "sector": "Cloud"},
]


def fetch_company_stock_data(symbol: str, period: str = "1y") -> Dict[str, Any]:
    """Fetch weekly stock price data for a company."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return {"symbol": symbol, "error": "No data available", "weekly_prices": []}
        
        # Resample to weekly (Friday close)
        weekly = hist['Close'].resample('W-FRI').last().dropna()
        
        weekly_prices = []
        for ts, price in weekly.items():
            weekly_prices.append({
                "date": ts.strftime("%Y-%m-%d"),
                "price": round(float(price), 2)
            })
        
        # Get current price and change
        current_price = float(hist['Close'].iloc[-1])
        prev_price = float(hist['Close'].iloc[0]) if len(hist) > 1 else current_price
        change_pct = ((current_price - prev_price) / prev_price) * 100 if prev_price else 0
        
        return {
            "symbol": symbol,
            "current_price": round(current_price, 2),
            "change_percent": round(change_pct, 2),
            "weekly_prices": weekly_prices,
            "period": period
        }
    except Exception as e:
        print(f"Error fetching stock data for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e), "weekly_prices": []}


def fetch_company_info(symbol: str) -> Dict[str, Any]:
    """Fetch company info including market cap and revenue estimates."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        return {
            "symbol": symbol,
            "market_cap": info.get("marketCap"),
            "revenue": info.get("totalRevenue"),
            "pe_ratio": info.get("trailingPE"),
            "dividend_yield": info.get("dividendYield"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "employees": info.get("fullTimeEmployees"),
            "description": info.get("longBusinessSummary", "")[:200] + "..." if info.get("longBusinessSummary") else None
        }
    except Exception as e:
        print(f"Error fetching company info for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


def get_top_companies_basic() -> List[Dict[str, Any]]:
    """Get basic info for all top companies with current price."""
    companies = []
    
    for company in TOP_COMPANIES:
        try:
            ticker = yf.Ticker(company["symbol"])
            hist = ticker.history(period="5d")
            
            if not hist.empty:
                current_price = float(hist['Close'].iloc[-1])
                prev_close = float(hist['Close'].iloc[0]) if len(hist) > 1 else current_price
                change_pct = ((current_price - prev_close) / prev_close) * 100 if prev_close else 0
                
                companies.append({
                    **company,
                    "current_price": round(current_price, 2),
                    "change_percent": round(change_pct, 2)
                })
            else:
                companies.append({**company, "current_price": None, "change_percent": 0})
        except Exception as e:
            print(f"Error fetching {company['symbol']}: {e}")
            companies.append({**company, "current_price": None, "change_percent": 0})
    
    return companies


def get_emerging_companies_basic() -> List[Dict[str, Any]]:
    """Get basic info for emerging companies."""
    companies = []
    
    for company in EMERGING_COMPANIES:
        try:
            ticker = yf.Ticker(company["symbol"])
            hist = ticker.history(period="5d")
            
            if not hist.empty:
                current_price = float(hist['Close'].iloc[-1])
                prev_close = float(hist['Close'].iloc[0]) if len(hist) > 1 else current_price
                change_pct = ((current_price - prev_close) / prev_close) * 100 if prev_close else 0
                
                companies.append({
                    **company,
                    "current_price": round(current_price, 2),
                    "change_percent": round(change_pct, 2)
                })
            else:
                companies.append({**company, "current_price": None, "change_percent": 0})
        except Exception as e:
            print(f"Error fetching {company['symbol']}: {e}")
            companies.append({**company, "current_price": None, "change_percent": 0})
    
    return companies


def generate_recommendations(emerging_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate investment recommendations based on price performance."""
    recommendations = []
    
    # Sort by change percent to find best/worst performers
    sorted_companies = sorted(
        [c for c in emerging_data if c.get('change_percent') is not None],
        key=lambda x: x.get('change_percent', 0),
        reverse=True
    )
    
    # Top performers - BUY recommendations
    for company in sorted_companies[:3]:
        if company.get('change_percent', 0) > 5:
            rec = "BUY"
            reasoning = f"Strong momentum with {company['change_percent']:.1f}% gain. Sector leader in {company.get('sector', 'tech')}."
            risk = "MEDIUM"
            confidence = min(8, 5 + int(company['change_percent'] / 10))
        elif company.get('change_percent', 0) > 0:
            rec = "BUY"
            reasoning = f"Positive trend with {company['change_percent']:.1f}% growth. Solid fundamentals."
            risk = "LOW"
            confidence = 7
        else:
            rec = "HOLD"
            reasoning = "Mixed signals. Wait for clearer trend."
            risk = "MEDIUM"
            confidence = 5
        
        recommendations.append({
            "symbol": company['symbol'],
            "name": company['name'],
            "current_price": company.get('current_price'),
            "change_percent": company.get('change_percent'),
            "recommendation": rec,
            "reasoning": reasoning,
            "risk_level": risk,
            "confidence": confidence,
            "target_audience": "growth investors" if rec == "BUY" else "conservative investors"
        })
    
    # Underperformers - potential value plays
    for company in sorted_companies[-2:]:
        if company.get('change_percent', 0) < -10:
            rec = "WATCH"
            reasoning = f"Significant pullback of {company['change_percent']:.1f}%. Potential value opportunity if fundamentals remain strong."
            risk = "HIGH"
            confidence = 4
        else:
            rec = "HOLD"
            reasoning = "Consolidating. Monitor for breakout signals."
            risk = "MEDIUM"
            confidence = 5
        
        recommendations.append({
            "symbol": company['symbol'],
            "name": company['name'],
            "current_price": company.get('current_price'),
            "change_percent": company.get('change_percent'),
            "recommendation": rec,
            "reasoning": reasoning,
            "risk_level": risk,
            "confidence": confidence,
            "target_audience": "value investors" if rec == "WATCH" else "long-term holders"
        })
    
    # Market outlook based on average performance
    avg_change = sum(c.get('change_percent', 0) for c in sorted_companies) / len(sorted_companies) if sorted_companies else 0
    
    if avg_change > 5:
        outlook = "Technology sector showing strong bullish momentum. Consider increasing exposure."
    elif avg_change > 0:
        outlook = "Tech stocks trending positive with moderate growth across the sector."
    elif avg_change > -5:
        outlook = "Mixed market conditions. Selective opportunities in quality names."
    else:
        outlook = "Sector under pressure. Focus on defensive positions and quality holdings."
    
    return {
        "recommendations": recommendations,
        "market_outlook": outlook,
        "generated_at": datetime.now().isoformat(),
        "avg_sector_change": round(avg_change, 2)
    }
