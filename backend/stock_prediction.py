"""Stock prediction module using news data and AI-driven market analysis"""

import os
from datetime import datetime, timedelta
import json
from typing import List, Dict, Any
import asyncio
import yfinance as yf
from dedalus_labs import AsyncDedalus, DedalusRunner

class StockPredictor:
    """Predicts stock prices based on news sentiment and market data using AI"""
    
    def __init__(self):
        """Initialize the stock predictor with API clients"""
        self.weeks_ahead = 8  # Default prediction horizon (next two months)
    
    def _build_prediction_prompt(self, assets: List[str], article: Dict[str, Any], historical_data: Dict[str, Any]) -> str:
        """
        Build the prompt for AI analysis of article impact on assets.
        
        Args:
            assets: List of stock symbols
            article: Article object with title/content
            historical_data: Historical price data for context
        
        Returns:
            Formatted prompt string for AI model
        """
        article_text = article.get('content', '') or article.get('title', '')
        article_source = article.get('source', 'Unknown')
        
        # Extract current prices from historical data for context
        current_prices_info = []
        for symbol in assets:
            hist = historical_data.get(symbol, {})
            if isinstance(hist, dict) and hist.get('current_price'):
                current_prices_info.append(f"{symbol}: ${hist['current_price']:.2f}")
        current_prices_str = "\n".join(current_prices_info) if current_prices_info else "N/A"
        
        prompt = f"""Analyze this news article and predict exact stock prices for the next {self.weeks_ahead} weeks.

ARTICLE: {article.get('title', 'N/A')}
Source: {article_source}
Content: {article_text}

CURRENT PRICES:
{current_prices_str}

TARGET ASSETS: {', '.join(assets)}

TASK: For each asset DIRECTLY relevant to this article, provide:
1. Eight future stock prices (absolute prices, not percentages) for weeks 1-8
2. One sentence explaining why the price will change that way

Include ONLY stocks significantly affected by the article. Exclude unrelated stocks.

Return ONLY valid JSON in this format:
{{
  "predictions": {{
    "AAPL": {{
      "future_prices": [150.25, 151.50, 152.75, 154.00, 155.25, 156.50, 157.75, 159.00],
      "explanation": "Positive market sentiment drives uptick."
    }},
    "MSFT": {{
      "future_prices": [320.10, 321.30, 322.50, 323.70, 324.90, 326.10, 327.30, 328.50],
      "explanation": "Stable growth trajectory continues."
    }}
  }}
}}

Be realistic, concise, and return ONLY the JSON."""
        
        return prompt
    
    async def _generate_predictions_with_ai(self, prompt: str) -> Dict[str, Any]:
        """
        Use dedalus_labs AI endpoint to analyze the prompt and generate predictions.
        
        Args:
            prompt: The formatted prompt for AI analysis
        
        Returns:
            Dictionary with AI-generated predictions and data points for relevant assets only
        """
        api_key = os.getenv('DEDALUS_API_KEY')

        # Initialize AsyncDedalus without positional args (constructor may not accept api_key)
        try:
            client = AsyncDedalus()
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to initialize AsyncDedalus client: {str(e)}'
            }

        # Best-effort: set API key if provided using common patterns
        if api_key:
            try:
                if hasattr(client, 'configure'):
                    client.configure(api_key=api_key)
                elif hasattr(client, 'set_api_key'):
                    client.set_api_key(api_key)
                else:
                    setattr(client, 'api_key', api_key)
            except Exception:
                # non-fatal — continue and let the request surface errors
                pass

        runner = DedalusRunner(client)

        try:
            response = await runner.run(input=prompt, model="google/gemini-2.5-flash")
        except Exception as e:
            return {
                'status': 'error',
                'message': f'AI request failed: {str(e)}'
            }

        # Helper: find JSON substring with balanced braces/brackets
        def find_balanced_json(s: str) -> str | None:
            if not s:
                return None
            # look for object
            start = s.find('{')
            if start != -1:
                depth = 0
                for i in range(start, len(s)):
                    if s[i] == '{':
                        depth += 1
                    elif s[i] == '}':
                        depth -= 1
                        if depth == 0:
                            return s[start:i+1]
            # look for array
            start = s.find('[')
            if start != -1:
                depth = 0
                for i in range(start, len(s)):
                    if s[i] == '[':
                        depth += 1
                    elif s[i] == ']':
                        depth -= 1
                        if depth == 0:
                            return s[start:i+1]
            return None

        # Extract text from response in several common attributes
        possible_texts = []
        for attr in ('final_output', 'text', 'content', 'body', 'output', 'raw'):
            try:
                val = getattr(response, attr, None)
            except Exception:
                val = None
            if isinstance(val, str) and val.strip():
                possible_texts.append(val)

        # If response is mapping-like, try to access choices/messages
        try:
            if not possible_texts and isinstance(response, dict):
                # Try OpenAI-style dict
                choices = response.get('choices')
                if choices and len(choices) > 0:
                    ch = choices[0]
                    if isinstance(ch, dict):
                        msg = ch.get('message') or ch.get('text') or ch.get('content')
                        if isinstance(msg, str):
                            possible_texts.append(msg)
        except Exception:
            pass

        # If still empty, stringify response
        if not possible_texts:
            possible_texts.append(str(response))

        # Try to find JSON in candidate texts
        for txt in possible_texts:
            # strip code fences
            # look for ```json ... ``` or ``` ... ```
            if '```' in txt:
                parts = txt.split('```')
                for p in parts:
                    p_strip = p.strip()
                    if p_strip.startswith('json'):
                        candidate = p_strip[len('json'):].strip()
                    else:
                        candidate = p_strip
                    found = find_balanced_json(candidate)
                    if found:
                        try:
                            return json.loads(found)
                        except Exception:
                            # continue to next candidate
                            pass

            # direct balanced JSON search
            found = find_balanced_json(txt)
            if found:
                try:
                    return json.loads(found)
                except Exception:
                    # try to clean escaped newlines and quotes
                    cleaned = found.replace('\n', ' ').replace('\r', ' ')
                    try:
                        return json.loads(cleaned)
                    except Exception:
                        pass

            # last attempt: try entire text as JSON
            try:
                return json.loads(txt)
            except Exception:
                continue

        # Nothing parsed — try aggressive extraction
        # Search all possible_texts for any valid JSON
        for txt in possible_texts:
            # Try to extract any {...} or {...} structures
            import re
            # Find all potential JSON objects
            pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
            matches = re.findall(pattern, txt)
            for match in matches:
                try:
                    parsed = json.loads(match)
                    return parsed
                except:
                    pass
        
        return {'raw': possible_texts[0] if possible_texts else ''}

    
    def _fetch_historical_data(self, symbol: str, months: int = 12) -> Dict[str, Any]:
        """
        Fetch historical stock data for the given symbol.
        
        Args:
            symbol: Stock ticker symbol
            months: Number of months of historical data to fetch
        
        Returns:
            Dictionary with historical data and statistics
        """
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30*months)

            ticker = yf.Ticker(symbol)
            hist = ticker.history(start=start_date, end=end_date)

            if hist.empty:
                return {
                    'symbol': symbol,
                    'current_price': None,
                    'historical_data': None,
                    'weekly_series': [],
                    'error': f'No historical data found for symbol: {symbol}'
                }

            # Get current price (most recent close)
            current_price = hist['Close'].iloc[-1] if not hist.empty else None

            # Build weekly series (resample to weekly close). Prefer pandas resample.
            weekly_series = []
            try:
                weekly = hist['Close'].resample('W-FRI').last()
                for ts, val in weekly.items():
                    date_iso = ts.isoformat()
                    weekly_series.append({'date': date_iso, 'close': float(val) if val is not None else None})
            except Exception:
                # Fallback: group by week period
                try:
                    grouped = hist['Close'].groupby(hist.index.to_period('W')).last()
                    for ts, val in grouped.items():
                        date_iso = ts.to_timestamp().isoformat()
                        weekly_series.append({'date': date_iso, 'close': float(val) if val is not None else None})
                except Exception:
                    # If all else fails, provide daily points truncated to one per 7 days
                    pts = hist['Close'].tolist()
                    idx = hist.index.tolist()
                    for i in range(0, len(pts), 7):
                        try:
                            date_iso = idx[i].isoformat()
                            weekly_series.append({'date': date_iso, 'close': float(pts[i])})
                        except Exception:
                            pass

            return {
                'symbol': symbol,
                'current_price': float(current_price) if current_price else None,
                'historical_data_points': len(hist),
                'weekly_series': weekly_series,
                'price_range': {
                    'min': float(hist['Close'].min()),
                    'max': float(hist['Close'].max()),
                    'current': float(current_price) if current_price else None
                },
                'volatility': float(hist['Close'].pct_change().std()) if len(hist) > 1 else None
            }
        except Exception as e:
            return {
                'symbol': symbol,
                'error': f'Failed to fetch historical data: {str(e)}'
            }
    
    async def predict_article_impact(self, assets: List[str], article: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main method to predict article impact on multiple assets.
        
        Args:
            assets: List of stock symbols (e.g., ['AAPL', 'MSFT'])
            article: Article object with at minimum 'content' or 'title' field
        
        Returns:
            Dictionary with predictions only for relevant assets
        """
        # Validate inputs
        if not assets or not isinstance(assets, list):
            raise ValueError('assets must be a non-empty list of stock symbols')
        
        if not article or not isinstance(article, dict):
            raise ValueError('article must be a dictionary')
        
        # Normalize asset symbols
        assets = [symbol.upper().strip() for symbol in assets]
        
        # Fetch historical data for all assets (1 year of weekly data)
        historical_data = {}
        for symbol in assets:
            historical_data[symbol] = self._fetch_historical_data(symbol, months=12)
        
        # Build the prompt for AI analysis
        prompt = self._build_prediction_prompt(assets, article, historical_data)
        
        # Generate AI predictions using dedalus_labs (async call)
        predictions = await self._generate_predictions_with_ai(prompt)
        
        # Extract predictions from response (may be nested under 'predictions' key)
        pred_dict = predictions.get('predictions', {})
        if not pred_dict and isinstance(predictions, dict) and len(predictions) > 0:
            # Fallback: if no 'predictions' key, assume entire response is the predictions dict
            pred_dict = predictions
        
        # Keep only assets that have predictions (they're all relevant since AI filtered)
        filtered_predictions = {}
        if isinstance(pred_dict, dict):
            for symbol, pred_data in pred_dict.items():
                if isinstance(pred_data, dict) and pred_data.get('future_prices'):
                    filtered_predictions[symbol] = pred_data

        # Filter historical data to only include predicted assets
        filtered_historical = {symbol: historical_data[symbol] for symbol in filtered_predictions.keys() if symbol in historical_data}

        # For each predicted asset, extract price lists for graphing
        for symbol, pred_data in filtered_predictions.items():
            hist = filtered_historical.get(symbol, {})
            hist_series = hist.get('weekly_series', []) if isinstance(hist, dict) else []

            # Get the 8 future prices from predictions
            future_prices = pred_data.get('future_prices', [])
            if not isinstance(future_prices, list):
                future_prices = []

            # Extract historical prices as a simple list
            historical_prices = [float(h.get('close', 0)) for h in hist_series if isinstance(h, dict) and h.get('close') is not None]

            # Attach price lists back to predictions for frontend use (minimal output)
            filtered_predictions[symbol]['historical_prices'] = historical_prices
            filtered_predictions[symbol]['predicted_prices'] = [float(p) if p is not None else 0 for p in future_prices]
            # Remove the original future_prices to avoid duplication
            filtered_predictions[symbol].pop('future_prices', None)

        # Build result response with minimal metadata
        result = {
            'article_metadata': {
                'title': article.get('title', 'N/A'),
                'source': article.get('source', 'Unknown'),
                'timestamp': datetime.now().isoformat()
            },
            'relevant_assets': list(filtered_predictions.keys()),
            'relevant_assets_count': len(filtered_predictions),
            'predictions': filtered_predictions
        }

        return result
    
    def predict(self, symbol):
        """
        Legacy method for single stock prediction.
        
        Args:
            symbol (str): Stock ticker symbol (e.g., 'AAPL', 'GOOGL')
        
        Returns:
            dict: Prediction data including predicted price, confidence, and sentiment
        """
        historical = self._fetch_historical_data(symbol)
        
        return {
            'symbol': symbol,
            'current_price': historical.get('current_price'),
            'historical_context': historical,
            'predicted_price': None,
            'predicted_change_percent': None,
            'confidence': None,
            'sentiment': None,
            'recommendation': 'HOLD',
            'note': 'Use predict_article_impact() for article-based predictions'
        }
