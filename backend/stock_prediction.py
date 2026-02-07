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
        
        prompt = f"""You are a financial analyst AI. Analyze the following article and predict its impact on the provided assets over the next {self.weeks_ahead} weeks.

ARTICLE:
Title: {article.get('title', 'N/A')}
Source: {article_source}
Content: {article_text}

TARGET ASSETS: {', '.join(assets)}

HISTORICAL CONTEXT:
{json.dumps(historical_data, indent=2)}

TASK:
1. Analyze the article's sentiment and relevance to each asset
2. ONLY include assets in your response if they have relevance_score >= 0.3 (i.e., only meaningful impact)
3. For each relevant asset, generate {self.weeks_ahead} weekly data points (Week 1 through Week {self.weeks_ahead})
4. Each data point should include:
   - predicted_price_change_percent: Expected percentage change from current price
   - confidence: Confidence level (0.0 to 1.0)
   - reasoning: Brief explanation of the prediction

Return your response as a JSON object with this structure:
{{
  "overall_sentiment": "positive/negative/neutral",
  "article_relevance_summary": "Brief summary of how relevant this article is",
  "predictions": {{
    "SYMBOL": {{
      "sentiment_impact": "positive/negative/neutral",
      "relevance_score": 0.0-1.0,
      "weekly_predictions": [
        {{
          "week": 1,
          "predicted_price_change_percent": number,
          "confidence": 0.0-1.0,
          "reasoning": "string"
        }},
        ...
      ],
      "summary": "Overall prediction summary for this asset"
    }},
    ...
  }}
}}

IMPORTANT: Only include assets with relevance_score >= 0.3. Exclude assets that have no meaningful connection to the article.
Be realistic and conservative in your predictions. Consider market volatility and uncertainty."""
        
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

        # Nothing parsed — return raw best-effort content
        return {'raw': possible_texts[0]}

    
    def _fetch_historical_data(self, symbol: str, months: int = 5) -> Dict[str, Any]:
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
            Dictionary with predictions only for relevant assets (relevance_score >= 0.3)
        """
        # Validate inputs
        if not assets or not isinstance(assets, list):
            raise ValueError('assets must be a non-empty list of stock symbols')
        
        if not article or not isinstance(article, dict):
            raise ValueError('article must be a dictionary')
        
        # Normalize asset symbols
        assets = [symbol.upper().strip() for symbol in assets]
        
        # Fetch historical data for all assets
        historical_data = {}
        for symbol in assets:
            historical_data[symbol] = self._fetch_historical_data(symbol)
        
        # Build the prompt for AI analysis
        prompt = self._build_prediction_prompt(assets, article, historical_data)
        
        # Generate AI predictions using dedalus_labs (async call)
        predictions = await self._generate_predictions_with_ai(prompt)
        
        # Filter predictions to only include relevant assets (relevance_score >= 0.3)
        filtered_predictions = {}
        if 'predictions' in predictions and isinstance(predictions['predictions'], dict):
            for symbol, pred_data in predictions['predictions'].items():
                if isinstance(pred_data, dict) and pred_data.get('relevance_score', 0) >= 0.3:
                    filtered_predictions[symbol] = pred_data
        
        # Also filter historical data to only include relevant assets
        filtered_historical = {symbol: historical_data[symbol] for symbol in filtered_predictions.keys() if symbol in historical_data}

        # For each relevant asset, build a combined weekly series (historical weeks + predicted weeks)
        for symbol, pred_data in filtered_predictions.items():
            hist = filtered_historical.get(symbol, {})
            hist_series = hist.get('weekly_series', []) if isinstance(hist, dict) else []

            # Determine base price for predictions
            base_price = hist.get('current_price') if isinstance(hist, dict) else None
            if base_price is None and hist_series:
                base_price = hist_series[-1].get('close')

            # Last historical date to anchor future weeks
            last_hist_date = None
            if hist_series:
                try:
                    last_hist_date = datetime.fromisoformat(hist_series[-1]['date'])
                except Exception:
                    try:
                        last_hist_date = datetime.strptime(hist_series[-1]['date'], "%Y-%m-%d %H:%M:%S")
                    except Exception:
                        last_hist_date = datetime.now()
            else:
                last_hist_date = datetime.now()

            predicted_points = []
            weekly_preds = pred_data.get('weekly_predictions', []) if isinstance(pred_data, dict) else []
            running_price = float(base_price) if base_price is not None else None
            for i, wp in enumerate(weekly_preds):
                pct = wp.get('predicted_price_change_percent') if isinstance(wp, dict) else None
                try:
                    pct_val = float(pct)
                except Exception:
                    pct_val = 0.0

                if running_price is None:
                    predicted_price = None
                else:
                    predicted_price = running_price * (1.0 + pct_val / 100.0)
                    running_price = predicted_price

                future_date = last_hist_date + timedelta(weeks=(i + 1))
                predicted_points.append({
                    'date': future_date.isoformat(),
                    'close': float(predicted_price) if predicted_price is not None else None,
                    'predicted_price_change_percent': pct_val,
                    'confidence': wp.get('confidence') if isinstance(wp, dict) else None,
                    'reasoning': wp.get('reasoning') if isinstance(wp, dict) else None,
                    'source': 'predicted'
                })

            # Mark historical entries with source
            combined = []
            for h in hist_series:
                entry = dict(h)
                entry['source'] = 'historical'
                combined.append(entry)

            combined.extend(predicted_points)

            # Attach combined series back to predictions for frontend use
            filtered_predictions[symbol]['combined_weekly_series'] = combined

        # Combine historical context with predictions
        result = {
            'article_metadata': {
                'title': article.get('title', 'N/A'),
                'source': article.get('source', 'Unknown'),
                'timestamp': datetime.now().isoformat()
            },
            'overall_sentiment': predictions.get('overall_sentiment'),
            'article_relevance_summary': predictions.get('article_relevance_summary'),
            'relevant_assets': list(filtered_predictions.keys()),
            'relevant_assets_count': len(filtered_predictions),
            'historical_data': filtered_historical,
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
