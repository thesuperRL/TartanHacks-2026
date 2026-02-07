from flask import Flask, jsonify, request, send_file
from flask_cors import CORS, cross_origin
from news_scraper import NewsScraper
from news_processor import NewsProcessor
from stock_prediction import StockPredictor
from portfolio_predictor import PortfolioPredictor
from company_data import CompanyDataProvider
import os
import asyncio
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from dotenv import load_dotenv
from openai import OpenAI
import tempfile
import subprocess
from pathlib import Path

load_dotenv()

app = Flask(__name__)
# Configure CORS to allow requests from React dev server
# In development, allow all origins for easier testing
CORS(app, 
     origins="*",
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     supports_credentials=False
)

# Initialize components
scraper = NewsScraper()
processor = NewsProcessor()
stock_predictor = StockPredictor()
portfolio_predictor = PortfolioPredictor()
company_data_provider = CompanyDataProvider()

# DEPRECATED: Authentication and portfolio storage moved to Firebase
# Keeping these for backward compatibility, but they're no longer used
# Simple in-memory user storage (in production, use a database)
users_db = {}
tokens_db = {}

# Portfolio storage file (DEPRECATED - now using Firebase Firestore)
PORTFOLIOS_FILE = 'portfolios.json'

def generate_token():
    return secrets.token_urlsafe(32)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def load_portfolios():
    """Load portfolios from JSON file"""
    if os.path.exists(PORTFOLIOS_FILE):
        try:
            with open(PORTFOLIOS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading portfolios: {e}")
            return {}
    return {}

def save_portfolios(portfolios):
    """Save portfolios to JSON file"""
    try:
        with open(PORTFOLIOS_FILE, 'w') as f:
            json.dump(portfolios, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving portfolios: {e}")
        return False

def get_user_from_token():
    """Extract user from Authorization token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    # Token format: "Bearer <token>" or just "<token>"
    token = auth_header.replace('Bearer ', '') if 'Bearer ' in auth_header else auth_header
    
    token_data = tokens_db.get(token)
    if not token_data:
        return None
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(token_data['expires_at'])
    if datetime.now() > expires_at:
        return None
    
    user_id = token_data.get('user_id')
    email = token_data.get('email')
    
    if user_id and email:
        return {
            'id': user_id,
            'email': email
        }
    return None

@app.route('/api/news', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_news():
    """Get all news articles with locations"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    category = request.args.get('category', 'all')  # 'financial', 'political', or 'all'
    mode = request.args.get('mode', 'economic')  # 'economic' or 'political'
    articles = processor.get_articles_by_category(category)
    
    # Transform titles based on mode if needed
    # Only transform if the mode doesn't match the current title orientation
    if mode == 'political':
        for article in articles:
            title = article.get('title', '')
            # Check if title is already political-oriented
            political_keywords = ['geopolitical', 'political', 'diplomatic', 'strategic', 'international relations', 'crisis', 'tensions']
            if not any(keyword.lower() in title.lower() for keyword in political_keywords):
                # Extract original title (remove finance prefixes if present)
                original_title = title
                finance_prefixes = ['Market Impact: ', 'Financial Analysis: ', 'Investment Outlook: ', 
                                   'Market Trends: ', 'Economic Impact: ', 'Trading Implications: ', 
                                   'Financial Markets: ']
                for prefix in finance_prefixes:
                    if original_title.startswith(prefix):
                        original_title = original_title[len(prefix):]
                        break
                article['title'] = processor._make_title_political_oriented(original_title)
    # For economic mode, titles are already finance-oriented by default
    
    return jsonify(articles)

@app.route('/api/news/popular', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_popular_news():
    """Get most popular news articles (for the blurred list)"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    category = request.args.get('category', 'all')
    mode = request.args.get('mode', 'economic')  # 'economic' or 'political'
    articles = processor.get_popular_articles(category, limit=20)
    
    # Transform titles based on mode if needed
    # Only transform if the mode doesn't match the current title orientation
    if mode == 'political':
        for article in articles:
            title = article.get('title', '')
            # Check if title is already political-oriented
            political_keywords = ['geopolitical', 'political', 'diplomatic', 'strategic', 'international relations', 'crisis', 'tensions']
            if not any(keyword.lower() in title.lower() for keyword in political_keywords):
                # Extract original title (remove finance prefixes if present)
                original_title = title
                finance_prefixes = ['Market Impact: ', 'Financial Analysis: ', 'Investment Outlook: ', 
                                   'Market Trends: ', 'Economic Impact: ', 'Trading Implications: ', 
                                   'Financial Markets: ']
                for prefix in finance_prefixes:
                    if original_title.startswith(prefix):
                        original_title = original_title[len(prefix):]
                        break
                article['title'] = processor._make_title_political_oriented(original_title)
    # For economic mode, titles are already finance-oriented by default
    
    return jsonify(articles)

@app.route('/api/news/refresh', methods=['POST', 'OPTIONS'])
@cross_origin()
def refresh_news():
    """Trigger a news refresh/scrape"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    try:
        data = request.get_json() or {}
        mode = data.get('mode', 'economic')  # 'economic' or 'political'
        articles = scraper.scrape_all_sources()
        processor.process_articles(articles, mode=mode)
        return jsonify({'status': 'success', 'message': 'News refreshed successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# DEPRECATED: Authentication endpoints - now using Firebase
# Keeping for backward compatibility
@app.route('/api/auth/signup', methods=['POST', 'OPTIONS'])
@cross_origin()
def signup():
    """User signup endpoint"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400
        
        if len(password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400
        
        if email in users_db:
            return jsonify({'message': 'Email already registered'}), 400
        
        # Create user
        user_id = secrets.token_urlsafe(16)
        users_db[email] = {
            'id': user_id,
            'email': email,
            'name': name or email.split('@')[0],
            'password_hash': hash_password(password),
            'created_at': datetime.now().isoformat()
        }
        
        # Generate token
        token = generate_token()
        tokens_db[token] = {
            'user_id': user_id,
            'email': email,
            'expires_at': (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        return jsonify({
            'user': {
                'id': user_id,
                'email': email,
                'name': name or email.split('@')[0]
            },
            'token': token
        }), 201
        
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# DEPRECATED: Authentication endpoints - now using Firebase
@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
@cross_origin()
def login():
    """User login endpoint"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400
        
        user = users_db.get(email)
        if not user or user['password_hash'] != hash_password(password):
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Generate token
        token = generate_token()
        tokens_db[token] = {
            'user_id': user['id'],
            'email': email,
            'expires_at': (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        return jsonify({
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name']
            },
            'token': token
        }), 200
        
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# DEPRECATED: Authentication endpoints - now using Firebase
@app.route('/api/auth/google', methods=['POST', 'OPTIONS'])
@cross_origin()
def google_auth():
    """Google OAuth authentication endpoint"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        credential = data.get('credential')
        user_info = data.get('user_info')  # For OAuth2 flow
        
        if not credential and not user_info:
            return jsonify({'message': 'Google credential or user info is required'}), 400
        
        # Handle OAuth2 flow (when user_info is provided)
        if user_info:
            email = user_info.get('email', '').lower().strip()
            name = user_info.get('name', email.split('@')[0] if email else 'Google User')
            user_id_google = user_info.get('sub') or user_info.get('id')
            
            if not email:
                return jsonify({'message': 'Email is required from Google'}), 400
            
            # Use Google ID as unique identifier
            email = f"google_{user_id_google}@{email.split('@')[1] if '@' in email else 'google.com'}"
        else:
            # Handle JWT credential flow (One Tap)
            # Decode JWT without verification for demo (in production, verify with Google's public keys)
            try:
                import base64
                # JWT has 3 parts separated by dots
                parts = credential.split('.')
                if len(parts) >= 2:
                    # Decode the payload (second part)
                    payload = parts[1]
                    # Add padding if needed
                    payload += '=' * (4 - len(payload) % 4)
                    decoded = json.loads(base64.urlsafe_b64decode(payload))
                    
                    email = decoded.get('email', '').lower().strip()
                    name = decoded.get('name', email.split('@')[0] if email else 'Google User')
                    user_id_google = decoded.get('sub', '')
                    
                    if not email:
                        return jsonify({'message': 'Email not found in Google credential'}), 400
                    
                    # Use Google ID as unique identifier
                    email = f"google_{user_id_google}@{email.split('@')[1] if '@' in email else 'google.com'}"
                else:
                    # Fallback: create from hash
                    email_hash = hashlib.sha256(credential.encode()).hexdigest()[:16]
                    email = f"google_{email_hash}@google.com"
                    name = "Google User"
            except Exception as decode_error:
                # Fallback: create from hash
                email_hash = hashlib.sha256(credential.encode()).hexdigest()[:16]
                email = f"google_{email_hash}@google.com"
                name = "Google User"
        
        # Check if user exists, otherwise create
        if email not in users_db:
            user_id = secrets.token_urlsafe(16)
            users_db[email] = {
                'id': user_id,
                'email': email,
                'name': name,
                'password_hash': None,  # Google users don't have passwords
                'created_at': datetime.now().isoformat(),
                'auth_provider': 'google'
            }
        
        user = users_db[email]
        
        # Generate token
        token = generate_token()
        tokens_db[token] = {
            'user_id': user['id'],
            'email': email,
            'expires_at': (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        return jsonify({
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name']
            },
            'token': token
        }), 200
        
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# DEPRECATED: Portfolio endpoints - now using Firebase Firestore
@app.route('/api/portfolio', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_portfolio():
    """Get user's portfolio"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    user = get_user_from_token()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401
    
    portfolios = load_portfolios()
    user_portfolio = portfolios.get(user['id'], [])
    
    return jsonify({'stocks': user_portfolio}), 200

# DEPRECATED: Portfolio endpoints - now using Firebase Firestore
@app.route('/api/portfolio', methods=['POST', 'PUT', 'OPTIONS'])
@cross_origin()
def save_portfolio():
    """Save user's portfolio"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    user = get_user_from_token()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        stocks = data.get('stocks', [])
        
        # Validate stocks format
        if not isinstance(stocks, list):
            return jsonify({'message': 'Invalid stocks format'}), 400
        
        portfolios = load_portfolios()
        portfolios[user['id']] = stocks
        save_portfolios(portfolios)
        
        return jsonify({'message': 'Portfolio saved successfully', 'stocks': stocks}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def health_check():
    """Health check endpoint"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    return jsonify({'status': 'healthy', 'cors': 'enabled'})

@app.route('/api/stocks/prices', methods=['POST', 'OPTIONS'])
@cross_origin()
def get_stock_prices():
    """
    Get real-time stock prices for multiple symbols.
    
    Expected JSON input:
    {
        "symbols": ["AAPL", "MSFT", "GOOGL"]
    }
    
    Returns current prices and percentage changes for each symbol.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body must contain JSON data'
            }), 400
        
        symbols = data.get('symbols', [])
        
        if not symbols or not isinstance(symbols, list):
            return jsonify({
                'status': 'error',
                'message': 'symbols must be a non-empty list of stock symbols'
            }), 400
        
        # Normalize symbols
        symbols = [s.upper().strip() for s in symbols if s]
        
        if not symbols:
            return jsonify({
                'status': 'error',
                'message': 'symbols list cannot be empty'
            }), 400
        
        # Fetch current prices for all symbols
        import yfinance as yf
        from datetime import datetime, timedelta
        
        results = []
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                # Get current info and recent history
                info = ticker.info
                hist = ticker.history(period='5d')
                
                if hist.empty:
                    results.append({
                        'symbol': symbol,
                        'price': None,
                        'change': None,
                        'name': info.get('longName', symbol),
                        'error': 'No data available'
                    })
                    continue
                
                # Get current price (most recent close)
                current_price = float(hist['Close'].iloc[-1])
                
                # Calculate percentage change from previous close
                if len(hist) > 1:
                    previous_price = float(hist['Close'].iloc[-2])
                    change_percent = ((current_price - previous_price) / previous_price) * 100
                else:
                    # If only one day of data, try to get previous close from info
                    previous_close = info.get('previousClose')
                    if previous_close:
                        change_percent = ((current_price - previous_close) / previous_close) * 100
                    else:
                        change_percent = 0.0
                
                # Get company name
                company_name = info.get('longName') or info.get('shortName') or symbol
                
                results.append({
                    'symbol': symbol,
                    'price': round(current_price, 2),
                    'change': round(change_percent, 2),
                    'name': company_name
                })
            except Exception as e:
                results.append({
                    'symbol': symbol,
                    'price': None,
                    'change': None,
                    'name': symbol,
                    'error': str(e)
                })
        
        return jsonify({
            'status': 'success',
            'stocks': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error fetching stock prices: {str(e)}'
        }), 500

@app.route('/api/portfolio/predictions', methods=['POST', 'OPTIONS'])
@cross_origin()
def get_portfolio_predictions():
    """
    Scrape news and generate predictions for portfolio stocks.
    
    Expected JSON input:
    {
        "symbols": ["AAPL", "MSFT", "GOOGL"]
    }
    
    Returns predictions based on scraped news for each stock.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body must contain JSON data'
            }), 400
        
        symbols = data.get('symbols', [])
        
        if not symbols or not isinstance(symbols, list):
            return jsonify({
                'status': 'error',
                'message': 'symbols must be a non-empty list of stock symbols'
            }), 400
        
        # Normalize symbols
        symbols = [s.upper().strip() for s in symbols if s]
        
        if not symbols:
            return jsonify({
                'status': 'error',
                'message': 'symbols list cannot be empty'
            }), 400
        
        # Limit to 10 stocks to avoid timeout
        if len(symbols) > 10:
            return jsonify({
                'status': 'error',
                'message': 'Maximum 10 stocks allowed per request'
            }), 400
        
        # Run async prediction
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            predictions = loop.run_until_complete(
                portfolio_predictor.predict_portfolio_stocks(symbols)
            )
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error in portfolio predictions: {error_trace}")
            return jsonify({
                'status': 'error',
                'message': f'Error generating predictions: {str(e)}',
                'details': str(e)
            }), 500
        finally:
            loop.close()
        
        return jsonify(predictions), 200
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': f'Invalid input: {str(e)}'
        }), 400
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in portfolio predictions endpoint: {error_trace}")
        return jsonify({
            'status': 'error',
            'message': f'Error generating predictions: {str(e)}',
            'details': str(e)
        }), 500

@app.route('/api/predict/article-impact', methods=['POST', 'OPTIONS'])
@cross_origin()
def predict_article_impact():
    """
    Predict the impact of an article on multiple asset prices.
    
    Expected JSON input:
    {
        "assets": ["AAPL", "MSFT", "GOOGL"],
        "article": {
            "title": "...",
            "content": "...",
            "source": "..."
        }
    }
    
    Returns predicted price movements for each asset over the next few weeks.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body must contain JSON data'
            }), 400
        
        assets = data.get('assets')
        article = data.get('article')
        
        # Validate assets
        if not assets:
            return jsonify({
                'status': 'error',
                'message': 'Missing required field: assets (must be a list of stock symbols)'
            }), 400
        
        if not isinstance(assets, list):
            return jsonify({
                'status': 'error',
                'message': 'assets must be a list of stock symbols'
            }), 400
        
        if len(assets) == 0:
            return jsonify({
                'status': 'error',
                'message': 'assets list cannot be empty'
            }), 400
        
        # Validate article
        if not article:
            return jsonify({
                'status': 'error',
                'message': 'Missing required field: article'
            }), 400
        
        if not isinstance(article, dict):
            return jsonify({
                'status': 'error',
                'message': 'article must be an object with content'
            }), 400
        
        article_content = article.get('content') or article.get('title', '')
        if not article_content:
            return jsonify({
                'status': 'error',
                'message': 'article must contain either "content" or "title" field'
            }), 400
        
        # Generate predictions (call async function using asyncio)
        try:
            # Use a fresh event loop for this request to avoid event loop issues
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                predictions = loop.run_until_complete(stock_predictor.predict_article_impact(assets, article))
            finally:
                loop.close()
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Prediction failed: {str(e)}'
            }), 500
        
        # If AI returned an error object, propagate it
        if isinstance(predictions, dict) and predictions.get('status') == 'error':
            return jsonify({
                'status': 'error',
                'message': predictions.get('message', 'AI error')
            }), 500

        if not isinstance(predictions, dict):
            return jsonify({
                'status': 'error',
                'message': 'Unexpected prediction response format from AI'
            }), 500

        return jsonify({
            'status': 'success',
            'data': predictions
        }), 200
    
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': f'Invalid input: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error processing prediction: {str(e)}'
        }), 500

@app.route('/api/articles/search', methods=['POST', 'OPTIONS'])
@cross_origin()
def search_articles():
    """AI-powered article search"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        query = data.get('query', '')
        articles = data.get('articles', [])
        
        if not query or not articles:
            return jsonify({
                'status': 'error',
                'message': 'Query and articles are required'
            }), 400
        
        # Use OpenAI for semantic search
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            # Fallback to text search
            filtered = [a for a in articles if query.lower() in (a.get('title', '') + ' ' + a.get('summary', '')).lower()]
            return jsonify({
                'status': 'success',
                'articles': filtered,
                'explanation': None
            }), 200
        
        client = OpenAI(api_key=api_key)
        
        # Create article summaries for AI
        article_summaries = []
        for i, article in enumerate(articles[:50]):  # Limit to 50 for performance
            article_summaries.append(f"{i}: {article.get('title', '')} - {article.get('summary', '')[:200]}")
        
        prompt = f"""Search through these financial articles and find the most relevant ones for this query: "{query}"

Articles:
{chr(10).join(article_summaries)}

Return a JSON object with:
1. A list of article indices (0-based) that are most relevant
2. A brief explanation of why these articles match the query

Format:
{{
    "indices": [0, 3, 5],
    "explanation": "These articles match because..."
}}"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a financial news search assistant. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        result = json.loads(response.choices[0].message.content)
        indices = result.get('indices', [])
        explanation = result.get('explanation', '')
        
        # Get articles by indices
        matched_articles = [articles[i] for i in indices if 0 <= i < len(articles)]
        
        return jsonify({
            'status': 'success',
            'articles': matched_articles,
            'explanation': explanation
        }), 200
        
    except Exception as e:
        print(f"Error in article search: {e}")
        # Fallback to text search
        query_lower = query.lower()
        filtered = [a for a in articles if query_lower in (a.get('title', '') + ' ' + a.get('summary', '')).lower()]
        return jsonify({
            'status': 'success',
            'articles': filtered,
            'explanation': None
        }), 200

@app.route('/api/video/daily-digest', methods=['POST', 'OPTIONS'])
@cross_origin()
def generate_daily_digest_video():
    """Generate a financial daily digest video"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        portfolio = data.get('portfolio', [])
        stocks = data.get('stocks', [])
        predictions = data.get('predictions')
        
        # Generate video script using AI
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({
                'status': 'error',
                'message': 'OpenAI API key not configured'
            }), 500
        
        client = OpenAI(api_key=api_key)
        
        # Build portfolio summary
        portfolio_summary = []
        for stock in stocks:
            price = stock.get('price', 0)
            change = stock.get('change', 0)
            portfolio_summary.append(f"{stock.get('symbol', 'N/A')}: ${price:.2f} ({change:+.2f}%)")
        
        predictions_summary = ""
        if predictions:
            pred_items = []
            for symbol, pred in predictions.items():
                if isinstance(pred, dict):
                    change = pred.get('predictedChange', 0)
                    price = pred.get('predictedPrice', 0)
                    pred_items.append(f"{symbol}: Predicted {change:+.2f}% to ${price:.2f}")
            predictions_summary = "\n".join(pred_items)
        
        prompt = f"""Create a script for a 2-minute financial daily digest video based on this portfolio:

Portfolio Holdings:
{chr(10).join(portfolio_summary) if portfolio_summary else 'No holdings'}

Predictions:
{predictions_summary if predictions_summary else 'No predictions available'}

Create an engaging, professional script that:
1. Opens with a greeting and date
2. Summarizes portfolio performance
3. Highlights key predictions and insights
4. Provides actionable recommendations
5. Closes with a positive outlook

Format as a clear script with natural speech patterns."""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a financial news anchor creating a daily digest script."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        script = response.choices[0].message.content
        
        # Generate audio using OpenAI TTS
        try:
            print("Generating audio with OpenAI TTS...")
            print(f"Script length: {len(script)} characters")
            
            audio_response = client.audio.speech.create(
                model="tts-1",
                voice="alloy",  # Options: alloy, echo, fable, onyx, nova, shimmer
                input=script[:4000]  # Limit to 4000 characters for TTS
            )
            
            # Save audio to temporary file
            # OpenAI TTS returns binary content directly
            audio_path = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3').name
            print(f"Saving audio to: {audio_path}")
            
            # The response content is bytes that can be written directly
            # Try different ways to access the content
            audio_bytes = None
            if hasattr(audio_response, 'content'):
                audio_bytes = audio_response.content
            elif hasattr(audio_response, 'read'):
                audio_bytes = audio_response.read()
            else:
                # Try to get bytes directly
                audio_bytes = bytes(audio_response)
            
            if not audio_bytes:
                raise Exception("OpenAI TTS returned empty audio content")
            
            print(f"Received {len(audio_bytes)} bytes of audio data")
            
            with open(audio_path, 'wb') as audio_file:
                audio_file.write(audio_bytes)
            
            # Verify the file was created and has content
            if not os.path.exists(audio_path):
                raise Exception("Audio file was not created")
            
            file_size = os.path.getsize(audio_path)
            if file_size == 0:
                raise Exception("Audio file is empty")
            
            print(f"Audio file created successfully: {audio_path} ({file_size} bytes)")
            
            # Create a simple video with the audio
            # We'll use a static image or gradient background
            video_path = None
            try:
                # Check if ffmpeg is available
                subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
                
                # Create a simple video with audio (static image + audio)
                video_path = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4').name
                
                # Create a simple colored background video
                # Using ffmpeg to create a video with the audio
                cmd = [
                    'ffmpeg',
                    '-f', 'lavfi',
                    '-i', 'color=c=0x1a1a2e:s=1280x720:d=60',  # Background color matching app theme
                    '-i', audio_path,
                    '-c:v', 'libx264',
                    '-tune', 'stillimage',
                    '-c:a', 'aac',
                    '-shortest',
                    '-pix_fmt', 'yuv420p',
                    '-y',  # Overwrite output file
                    video_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                
                if result.returncode != 0:
                    print(f"FFmpeg error: {result.stderr}")
                    # Fallback: just return audio
                    video_path = None
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.CalledProcessError) as e:
                print(f"Video creation error: {e}")
                # Fallback: just return audio
                video_path = None
            
            # Store file paths temporarily (in production, upload to S3 or similar)
            audio_filename = os.path.basename(audio_path)
            temp_files[audio_filename] = audio_path
            print(f"Stored audio file in temp_files: {audio_filename} -> {audio_path}")
            
            if video_path and os.path.exists(video_path):
                video_filename = os.path.basename(video_path)
                temp_files[video_filename] = video_path
                print(f"Stored video file in temp_files: {video_filename} -> {video_path}")
            
            # Return audio file path or video if created
            if video_path and os.path.exists(video_path):
                return jsonify({
                    'status': 'success',
                    'script': script,
                    'audio_url': f'/api/video/audio/{os.path.basename(audio_path)}',
                    'video_url': f'/api/video/file/{os.path.basename(video_path)}',
                    'message': 'Podcast video generated successfully!',
                    'portfolio_summary': portfolio_summary,
                    'predictions_summary': predictions_summary
                }), 200
            else:
                # Return audio only
                return jsonify({
                    'status': 'success',
                    'script': script,
                    'audio_url': f'/api/video/audio/{os.path.basename(audio_path)}',
                    'video_url': None,
                    'message': 'Audio podcast generated successfully!',
                    'portfolio_summary': portfolio_summary,
                    'predictions_summary': predictions_summary
                }), 200
                
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error generating audio: {e}")
            print(f"Traceback: {error_details}")
            # Fallback: return script only
            return jsonify({
                'status': 'error',
                'script': script,
                'audio_url': None,
                'video_url': None,
                'message': f'Script generated. Audio generation failed: {str(e)}',
                'portfolio_summary': portfolio_summary,
                'predictions_summary': predictions_summary
            }), 200
        
    except Exception as e:
        print(f"Error generating daily digest: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to generate video: {str(e)}'
        }), 500

# Store temporary files (in production, use proper file storage)
temp_files = {}

@app.route('/api/video/audio/<filename>', methods=['GET'])
@cross_origin()
def get_audio_file(filename):
    """Serve generated audio file"""
    try:
        print(f"Request for audio file: {filename}")
        print(f"Available files in temp_files: {list(temp_files.keys())}")
        
        if filename in temp_files:
            file_path = temp_files[filename]
            print(f"Found file path: {file_path}")
            
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"Serving audio file: {file_path} ({file_size} bytes)")
                return send_file(
                    file_path,
                    mimetype='audio/mpeg',
                    as_attachment=False,
                    download_name='daily-digest-podcast.mp3'
                )
            else:
                print(f"File path does not exist: {file_path}")
                return jsonify({
                    'status': 'error',
                    'message': f'Audio file not found at path: {file_path}'
                }), 404
        else:
            print(f"Filename not in temp_files: {filename}")
            return jsonify({
                'status': 'error',
                'message': f'Audio file not found: {filename}'
            }), 404
    except Exception as e:
        import traceback
        print(f"Error serving audio file: {e}")
        print(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/video/file/<filename>', methods=['GET'])
@cross_origin()
def get_video_file(filename):
    """Serve generated video file"""
    try:
        if filename in temp_files and os.path.exists(temp_files[filename]):
            return send_file(
                temp_files[filename],
                mimetype='video/mp4',
                as_attachment=False,
                download_name='daily-digest-podcast.mp4'
            )
        return jsonify({
            'status': 'error',
            'message': 'Video file not found'
        }), 404
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/places/search', methods=['POST', 'OPTIONS'])
@cross_origin()
def search_places():
    """Search for a place using Places API (New) and return coordinates"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        location_query = data.get('location', '')
        
        if not location_query:
            return jsonify({'error': 'Location query is required'}), 400
        
        # Try multiple possible environment variable names
        google_api_key = os.getenv('GOOGLE_MAPS_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if not google_api_key:
            return jsonify({
                'error': 'Google Maps API key not configured',
                'message': 'Please set GOOGLE_MAPS_API_KEY in your .env file. Get your API key from https://console.cloud.google.com/google/maps-apis/credentials'
            }), 500
        
        # Use Places API (New) Text Search endpoint
        # Reference: https://developers.google.com/maps/documentation/places/web-service/text-search
        import requests
        
        url = 'https://places.googleapis.com/v1/places:searchText'
        headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': google_api_key,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress'
        }
        body = {
            'textQuery': location_query,
            'maxResultCount': 1
        }
        
        response = requests.post(url, headers=headers, json=body, timeout=10)
        
        if response.status_code != 200:
            error_data = response.json() if response.text else {}
            error_message = error_data.get('error', {}).get('message', f'Places API error: {response.status_code}')
            return jsonify({'error': error_message}), response.status_code
        
        data = response.json()
        
        if data.get('places') and len(data['places']) > 0:
            place = data['places'][0]
            place_location = place.get('location', {})
            
            if place_location.get('latitude') and place_location.get('longitude'):
                return jsonify({
                    'success': True,
                    'location': {
                        'lat': place_location['latitude'],
                        'lng': place_location['longitude']
                    },
                    'name': place.get('displayName', {}).get('text', location_query),
                    'address': place.get('formattedAddress', '')
                }), 200
            else:
                return jsonify({'error': 'Invalid location data from Places API'}), 500
        else:
            return jsonify({'error': f'No places found for "{location_query}"'}), 404
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Places API request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error searching places: {str(e)}'}), 500

@app.route('/api/articles/check-impact', methods=['POST', 'OPTIONS'])
@cross_origin()
def check_article_impact():
    """AI-powered check if an article impacts user's holdings"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        article = data.get('article', {})
        stocks = data.get('stocks', [])
        
        if not stocks or not article:
            return jsonify({
                'status': 'error',
                'message': 'Article and stocks are required'
            }), 400
        
        # Use OpenAI to check if article impacts holdings
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            # Fallback: simple keyword matching
            text = f"{article.get('title', '')} {article.get('summary', '')}".upper()
            impacts = any(symbol.upper() in text for symbol in stocks)
            return jsonify({
                'status': 'success',
                'impacts_holdings': impacts
            }), 200
        
        client = OpenAI(api_key=api_key)
        
        prompt = f"""Determine if this financial news article might impact the user's stock holdings.

Article Title: {article.get('title', '')}
Article Summary: {article.get('summary', '')}
Location: {article.get('location', '')}
Category: {article.get('category', '')}

User's Stock Holdings: {', '.join(stocks)}

Consider:
1. Direct mentions of stock symbols or company names
2. Sector/industry impacts
3. Geographic relevance (e.g., if article is about a region where companies operate)
4. Market-wide impacts that could affect the holdings

Respond with ONLY a JSON object:
{{
    "impacts_holdings": true/false,
    "reasoning": "brief explanation"
}}"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a financial analyst. Always return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=150
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return jsonify({
            'status': 'success',
            'impacts_holdings': result.get('impacts_holdings', False),
            'reasoning': result.get('reasoning', '')
        }), 200
        
    except Exception as e:
        print(f"Error checking article impact: {e}")
        # Fallback: simple keyword matching
        article_data = data.get('article', {})
        text = f"{article_data.get('title', '')} {article_data.get('summary', '')}".upper()
        impacts = any(symbol.upper() in text for symbol in stocks)
        return jsonify({
            'status': 'success',
            'impacts_holdings': impacts
        }), 200

@app.route('/api/zillow/search', methods=['POST', 'OPTIONS'])
@cross_origin()
def zillow_search():
    """
    Search for properties using Zillow API (via RapidAPI).

    Expected JSON input:
    {
        "query": "San Francisco, CA" or "94102" or "123 Main St"
    }

    Returns list of properties with prices and details.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body must contain JSON data'
            }), 400

        query = data.get('query', '').strip()

        if not query:
            return jsonify({
                'status': 'error',
                'message': 'Search query is required'
            }), 400

        import requests as http_requests

        # ===========================================
        # OPTION 1: RentCast API (FREE - 50 calls/month)
        # Sign up at: https://www.rentcast.io/api
        # ===========================================
        rentcast_key = os.getenv('RENTCAST_API_KEY')
        if rentcast_key:
            try:
                # RentCast property search
                url = "https://api.rentcast.io/v1/properties"
                headers = {
                    "Accept": "application/json",
                    "X-Api-Key": rentcast_key
                }
                params = {"address": query, "limit": 10}

                response = http_requests.get(url, headers=headers, params=params, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    properties = []
                    items = data if isinstance(data, list) else [data] if data else []

                    for prop in items[:10]:
                        if prop:
                            properties.append({
                                'zpid': str(prop.get('id', hash(prop.get('formattedAddress', '')))),
                                'address': prop.get('formattedAddress', prop.get('addressLine1', '')),
                                'price': prop.get('price', prop.get('estimatedValue', 0)),
                                'bedrooms': prop.get('bedrooms', 0),
                                'bathrooms': prop.get('bathrooms', 0),
                                'sqft': prop.get('squareFootage', 0),
                                'propertyType': prop.get('propertyType', 'Unknown'),
                                'imageUrl': None,
                                'zestimate': prop.get('estimatedValue'),
                                'rentZestimate': prop.get('rentEstimate'),
                                'latitude': prop.get('latitude'),
                                'longitude': prop.get('longitude')
                            })

                    if properties:
                        return jsonify({
                            'status': 'success',
                            'properties': properties,
                            'total': len(properties),
                            'source': 'rentcast'
                        }), 200

                print(f"RentCast API returned status {response.status_code}")
            except Exception as e:
                print(f"RentCast API error: {e}")

        # ===========================================
        # OPTION 2: Redfin Public Data (FREE - no key needed)
        # ===========================================
        try:
            # Redfin's public autocomplete/search endpoint
            redfin_url = "https://www.redfin.com/stingray/do/location-autocomplete"
            params = {"location": query, "v": "2"}
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

            response = http_requests.get(redfin_url, params=params, headers=headers, timeout=8)

            if response.status_code == 200:
                text = response.text
                # Redfin returns data with a prefix
                if text.startswith('{}&&'):
                    text = text[4:]

                redfin_data = json.loads(text)
                payload = redfin_data.get('payload', {})
                exact_match = payload.get('exactMatch', {})

                # If we got an exact property match
                if exact_match and exact_match.get('type') == 2:  # Type 2 = address
                    subtype = exact_match.get('subType', '')
                    if 'home' in subtype.lower() or exact_match.get('url', '').find('/home/') > -1:
                        properties = [{
                            'zpid': f"redfin-{exact_match.get('id', '')}",
                            'address': exact_match.get('name', query),
                            'price': 0,  # Redfin autocomplete doesn't include price
                            'bedrooms': 0,
                            'bathrooms': 0,
                            'sqft': 0,
                            'propertyType': 'Single Family',
                            'imageUrl': None,
                            'zestimate': None,
                            'redfin_url': f"https://www.redfin.com{exact_match.get('url', '')}"
                        }]

                        # We found a match but no pricing - fall through to get pricing from demo
                        # but keep the real address
                        print(f"Redfin found address: {exact_match.get('name')}")

        except Exception as e:
            print(f"Redfin lookup error: {e}")

        # ===========================================
        # OPTION 3: RapidAPI Zillow (if key provided)
        # ===========================================
        rapidapi_key = os.getenv('RAPIDAPI_KEY')
        if rapidapi_key:
            try:
                api_configs = [
                    {
                        "url": "https://zillow-com1.p.rapidapi.com/propertyExtendedSearch",
                        "host": "zillow-com1.p.rapidapi.com",
                        "params": {"location": query, "status_type": "ForSale"},
                        "results_key": "props"
                    },
                    {
                        "url": "https://real-time-zillow-data.p.rapidapi.com/search",
                        "host": "real-time-zillow-data.p.rapidapi.com",
                        "params": {"location": query, "status": "forSale"},
                        "results_key": "results"
                    },
                ]

                configured_host = os.getenv('ZILLOW_API_HOST', api_configs[0]['host'])
                api_config = next((c for c in api_configs if c['host'] == configured_host), api_configs[0])

                headers = {
                    "X-RapidAPI-Key": rapidapi_key,
                    "X-RapidAPI-Host": api_config['host']
                }

                response = http_requests.get(
                    api_config['url'],
                    headers=headers,
                    params=api_config['params'],
                    timeout=15
                )

                if response.status_code == 200:
                    zillow_data = response.json()
                    properties = []

                    results = zillow_data.get(api_config['results_key'], [])
                    if not results and isinstance(zillow_data, list):
                        results = zillow_data
                    if not results:
                        results = zillow_data.get('props', zillow_data.get('data', []))

                    results = results[:10] if isinstance(results, list) else []

                    for prop in results:
                        address = prop.get('address', prop.get('streetAddress', ''))
                        if isinstance(address, dict):
                            address = f"{address.get('streetAddress', '')} {address.get('city', '')}, {address.get('state', '')} {address.get('zipcode', '')}"

                        properties.append({
                            'zpid': str(prop.get('zpid', prop.get('id', ''))),
                            'address': address,
                            'price': prop.get('price', prop.get('listPrice', 0)),
                            'bedrooms': prop.get('bedrooms', prop.get('beds', 0)),
                            'bathrooms': prop.get('bathrooms', prop.get('baths', 0)),
                            'sqft': prop.get('livingArea', prop.get('sqft', prop.get('area', 0))),
                            'propertyType': prop.get('propertyType', prop.get('homeType', 'Unknown')),
                            'imageUrl': prop.get('imgSrc', prop.get('image', None)),
                            'zestimate': prop.get('zestimate', prop.get('zestimateValue', None)),
                            'rentZestimate': prop.get('rentZestimate', None),
                            'latitude': prop.get('latitude', prop.get('lat')),
                            'longitude': prop.get('longitude', prop.get('lng'))
                        })

                    if properties:
                        return jsonify({
                            'status': 'success',
                            'properties': properties,
                            'total': len(properties),
                            'source': 'rapidapi'
                        }), 200

                print(f"RapidAPI Zillow error: {response.status_code}")
            except Exception as e:
                print(f"RapidAPI error: {e}")

        # ===========================================
        # FALLBACK: Demo properties with realistic data
        # ===========================================
        demo_properties = generate_demo_properties(query)

        return jsonify({
            'status': 'success',
            'properties': demo_properties,
            'total': len(demo_properties),
            'demo': True
        }), 200

    except Exception as e:
        print(f"Error in Zillow search: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


def generate_demo_properties(query):
    """Generate demo properties based on search query with realistic pricing."""
    import random

    # Comprehensive location database with realistic 2024 pricing
    locations = {
        'san francisco': [
            ('123 Market St', 'San Francisco', 'CA', '94102', 1250000, 2, 2, 1200, 'Condo'),
            ('456 Mission St', 'San Francisco', 'CA', '94105', 1850000, 3, 2, 1650, 'Condo'),
            ('789 Valencia St', 'San Francisco', 'CA', '94110', 1450000, 3, 2.5, 1800, 'Single Family'),
            ('321 Hayes St', 'San Francisco', 'CA', '94102', 975000, 1, 1, 850, 'Condo'),
            ('555 Castro St', 'San Francisco', 'CA', '94114', 1650000, 3, 2, 1950, 'Single Family'),
        ],
        'new york': [
            ('100 Park Ave', 'New York', 'NY', '10017', 2500000, 3, 2.5, 2100, 'Condo'),
            ('250 W 57th St', 'New York', 'NY', '10019', 1850000, 2, 2, 1400, 'Condo'),
            ('78 Greene St', 'New York', 'NY', '10012', 3200000, 3, 3, 2800, 'Loft'),
            ('425 E 58th St', 'New York', 'NY', '10022', 1250000, 1, 1, 950, 'Condo'),
            ('890 5th Ave', 'New York', 'NY', '10021', 4500000, 4, 3.5, 3200, 'Condo'),
        ],
        'los angeles': [
            ('1234 Sunset Blvd', 'Los Angeles', 'CA', '90028', 1750000, 3, 3, 2200, 'Single Family'),
            ('567 Venice Blvd', 'Venice', 'CA', '90291', 1450000, 2, 2, 1600, 'Single Family'),
            ('890 Wilshire Blvd', 'Los Angeles', 'CA', '90017', 850000, 2, 2, 1100, 'Condo'),
            ('321 Melrose Ave', 'Los Angeles', 'CA', '90046', 2100000, 4, 3, 2800, 'Single Family'),
            ('456 Santa Monica Blvd', 'Santa Monica', 'CA', '90401', 1950000, 3, 2.5, 2000, 'Townhouse'),
        ],
        'seattle': [
            ('123 Pike St', 'Seattle', 'WA', '98101', 850000, 2, 2, 1100, 'Condo'),
            ('456 Queen Anne Ave', 'Seattle', 'WA', '98109', 1250000, 3, 2.5, 1800, 'Townhouse'),
            ('789 Capitol Hill', 'Seattle', 'WA', '98102', 975000, 2, 1.5, 1400, 'Condo'),
            ('321 Ballard Ave', 'Seattle', 'WA', '98107', 1150000, 3, 2, 1650, 'Single Family'),
            ('555 Fremont Ave', 'Seattle', 'WA', '98103', 1350000, 4, 2.5, 2200, 'Single Family'),
        ],
        'austin': [
            ('123 Congress Ave', 'Austin', 'TX', '78701', 650000, 2, 2, 1200, 'Condo'),
            ('456 S Lamar Blvd', 'Austin', 'TX', '78704', 875000, 3, 2, 1800, 'Single Family'),
            ('789 E 6th St', 'Austin', 'TX', '78702', 725000, 2, 2, 1400, 'Townhouse'),
            ('321 Barton Springs Rd', 'Austin', 'TX', '78704', 950000, 3, 2.5, 2000, 'Single Family'),
            ('555 Domain Dr', 'Austin', 'TX', '78758', 550000, 2, 2, 1100, 'Condo'),
        ],
        'miami': [
            ('123 Ocean Dr', 'Miami Beach', 'FL', '33139', 1450000, 2, 2, 1400, 'Condo'),
            ('456 Brickell Ave', 'Miami', 'FL', '33131', 950000, 2, 2, 1200, 'Condo'),
            ('789 Collins Ave', 'Miami Beach', 'FL', '33140', 1850000, 3, 3, 2000, 'Condo'),
            ('321 Coral Way', 'Coral Gables', 'FL', '33134', 1250000, 4, 3, 2400, 'Single Family'),
            ('555 Key Biscayne', 'Key Biscayne', 'FL', '33149', 2500000, 4, 3.5, 3000, 'Single Family'),
        ],
        'chicago': [
            ('123 Michigan Ave', 'Chicago', 'IL', '60601', 750000, 2, 2, 1300, 'Condo'),
            ('456 Lincoln Park', 'Chicago', 'IL', '60614', 1150000, 3, 2.5, 2000, 'Townhouse'),
            ('789 Wicker Park', 'Chicago', 'IL', '60622', 850000, 3, 2, 1700, 'Single Family'),
            ('321 Gold Coast', 'Chicago', 'IL', '60610', 1350000, 3, 2, 1800, 'Condo'),
            ('555 Lakeview', 'Chicago', 'IL', '60657', 625000, 2, 1.5, 1200, 'Condo'),
        ],
        'boston': [
            ('123 Beacon St', 'Boston', 'MA', '02108', 1650000, 2, 2, 1400, 'Condo'),
            ('456 Newbury St', 'Boston', 'MA', '02116', 2100000, 3, 2.5, 1800, 'Townhouse'),
            ('789 Cambridge St', 'Cambridge', 'MA', '02139', 1250000, 3, 2, 1600, 'Single Family'),
            ('321 Brookline Ave', 'Brookline', 'MA', '02445', 1450000, 4, 2.5, 2200, 'Single Family'),
            ('555 Somerville Ave', 'Somerville', 'MA', '02143', 875000, 2, 1.5, 1100, 'Condo'),
        ],
        'denver': [
            ('123 16th St', 'Denver', 'CO', '80202', 550000, 2, 2, 1100, 'Condo'),
            ('456 Cherry Creek', 'Denver', 'CO', '80206', 950000, 3, 2.5, 1800, 'Townhouse'),
            ('789 LoDo', 'Denver', 'CO', '80202', 725000, 2, 2, 1300, 'Loft'),
            ('321 Highland', 'Denver', 'CO', '80211', 875000, 3, 2, 1600, 'Single Family'),
            ('555 RiNo', 'Denver', 'CO', '80205', 650000, 2, 1.5, 1200, 'Townhouse'),
        ],
        'pittsburgh': [
            ('123 Forbes Ave', 'Pittsburgh', 'PA', '15213', 425000, 3, 2, 1600, 'Single Family'),
            ('456 Shadyside', 'Pittsburgh', 'PA', '15232', 550000, 3, 2.5, 1800, 'Townhouse'),
            ('789 Squirrel Hill', 'Pittsburgh', 'PA', '15217', 475000, 4, 2, 2000, 'Single Family'),
            ('321 Lawrenceville', 'Pittsburgh', 'PA', '15201', 385000, 2, 1.5, 1200, 'Townhouse'),
            ('555 Mt Washington', 'Pittsburgh', 'PA', '15211', 325000, 3, 1.5, 1400, 'Single Family'),
        ],
        'default': [
            ('123 Main St', 'Anytown', 'US', '12345', 450000, 3, 2, 1800, 'Single Family'),
            ('456 Oak Ave', 'Anytown', 'US', '12345', 325000, 2, 1.5, 1200, 'Townhouse'),
            ('789 Elm St', 'Anytown', 'US', '12345', 550000, 4, 2.5, 2200, 'Single Family'),
            ('321 Pine Rd', 'Anytown', 'US', '12345', 275000, 2, 1, 950, 'Condo'),
            ('555 Maple Dr', 'Anytown', 'US', '12345', 625000, 4, 3, 2600, 'Single Family'),
        ]
    }

    # Also match common ZIP codes
    zip_to_city = {
        '94': 'san francisco', '941': 'san francisco',
        '100': 'new york', '101': 'new york', '102': 'new york',
        '900': 'los angeles', '902': 'los angeles',
        '981': 'seattle',
        '787': 'austin',
        '331': 'miami', '333': 'miami',
        '606': 'chicago',
        '021': 'boston', '022': 'boston',
        '802': 'denver',
        '152': 'pittsburgh',
    }

    # Find matching location by city name or ZIP code
    query_lower = query.lower().strip()
    matched_location = 'default'

    # First try city name match
    for loc in locations.keys():
        if loc != 'default' and loc in query_lower:
            matched_location = loc
            break

    # If no city match, try ZIP code prefix
    if matched_location == 'default':
        # Extract numbers from query (potential ZIP)
        zip_digits = ''.join(c for c in query if c.isdigit())
        if zip_digits:
            for prefix, city in zip_to_city.items():
                if zip_digits.startswith(prefix):
                    matched_location = city
                    break

    properties = []
    base_props = locations[matched_location]

    for i, (street, city, state, zip_code, price, beds, baths, sqft, prop_type) in enumerate(base_props):
        # Add some randomness to prices
        price_variance = random.uniform(0.95, 1.05)
        adjusted_price = int(price * price_variance)

        properties.append({
            'zpid': f'demo-{matched_location}-{i}',
            'address': f'{street}, {city}, {state} {zip_code}',
            'price': adjusted_price,
            'bedrooms': beds,
            'bathrooms': baths,
            'sqft': sqft,
            'propertyType': prop_type,
            'imageUrl': None,
            'zestimate': int(adjusted_price * random.uniform(0.98, 1.03)),
            'rentZestimate': int(adjusted_price * 0.004),  # Rough rent estimate
            'latitude': None,
            'longitude': None
        })

    return properties


@app.route('/api/portfolio/planner', methods=['POST', 'OPTIONS'])
@cross_origin()
def portfolio_planner():
    """
    Portfolio Planner endpoint - analyzes news impact on temporary holdings
    and returns predicted portfolio value over time with news references.

    Expected JSON input:
    {
        "holdings": [
            {"symbol": "AAPL", "amount": 10000, "type": "stock"},
            {"symbol": "NYC-APT-001", "amount": 50000, "type": "real_estate"}
        ]
    }

    Returns predicted portfolio values and relevant news references.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body must contain JSON data'
            }), 400

        holdings = data.get('holdings', [])

        if not holdings or not isinstance(holdings, list):
            return jsonify({
                'status': 'error',
                'message': 'holdings must be a non-empty list'
            }), 400

        # Calculate total portfolio value
        total_value = sum(h.get('amount', 0) for h in holdings)

        if total_value <= 0:
            return jsonify({
                'status': 'error',
                'message': 'Total portfolio value must be positive'
            }), 400

        # Extract stock symbols for analysis
        stock_symbols = [h['symbol'] for h in holdings if h.get('type') == 'stock']

        # Get current stock prices if we have stocks
        stock_prices = {}
        if stock_symbols:
            try:
                import yfinance as yf
                for symbol in stock_symbols[:10]:  # Limit to 10 stocks
                    try:
                        ticker = yf.Ticker(symbol)
                        hist = ticker.history(period='5d')
                        if not hist.empty:
                            stock_prices[symbol] = float(hist['Close'].iloc[-1])
                    except:
                        pass
            except Exception as e:
                print(f"Error fetching stock prices: {e}")

        # Use OpenAI to analyze news impact on the portfolio
        api_key = os.getenv('OPENAI_API_KEY')
        news_references = []
        predicted_change_percent = 0

        if api_key:
            try:
                client = OpenAI(api_key=api_key)

                # Get recent articles from processor
                recent_articles = processor.get_popular_articles('all', limit=10)
                articles_text = "\n".join([
                    f"- {a.get('title', '')} ({a.get('source', 'Unknown')}) - {a.get('url', '')}"
                    for a in recent_articles[:10]
                ])

                holdings_text = "\n".join([
                    f"- {h.get('symbol', 'Unknown')}: ${h.get('amount', 0):,.0f} ({h.get('type', 'stock')})"
                    for h in holdings
                ])

                prompt = f"""Analyze how recent news might impact this investment portfolio over the next 30 days.

Portfolio Holdings:
{holdings_text}

Recent News Articles:
{articles_text}

Based on the news sentiment and market conditions, provide:
1. An estimated overall portfolio change percentage (be realistic, typically -5% to +5% for 30 days)
2. List the most relevant news articles that impact this portfolio

Return ONLY valid JSON:
{{
    "predicted_change_percent": 2.5,
    "news_impacts": [
        {{
            "title": "article title",
            "source": "source name",
            "url": "article url",
            "impact": "positive/negative/neutral",
            "relevance": "brief explanation of how it affects the portfolio"
        }}
    ],
    "analysis_summary": "brief overall analysis"
}}"""

                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a financial analyst. Return only valid JSON, no markdown."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.4,
                    max_tokens=800
                )

                result_text = response.choices[0].message.content.strip()
                # Remove markdown code blocks if present
                if result_text.startswith('```'):
                    result_text = result_text.split('```')[1]
                    if result_text.startswith('json'):
                        result_text = result_text[4:]

                result = json.loads(result_text)
                predicted_change_percent = result.get('predicted_change_percent', 0)

                # Build news references from AI response
                for news in result.get('news_impacts', [])[:5]:
                    news_references.append({
                        'title': news.get('title', ''),
                        'source': news.get('source', ''),
                        'url': news.get('url', '#'),
                        'impact': news.get('impact', 'neutral'),
                        'relevance': news.get('relevance', '')
                    })

            except Exception as e:
                print(f"Error with OpenAI analysis in portfolio planner: {e}")
                # Fallback to simple random prediction
                import random
                predicted_change_percent = random.uniform(-3, 5)
        else:
            # No API key - use random prediction
            import random
            predicted_change_percent = random.uniform(-3, 5)

        # Generate 30-day prediction timeline
        import random
        timeline = []
        current_value = total_value
        daily_change_rate = predicted_change_percent / 30 / 100

        for day in range(31):
            # Add some daily volatility
            daily_volatility = random.uniform(-0.005, 0.005)
            daily_multiplier = 1 + daily_change_rate + daily_volatility

            if day > 0:
                current_value = current_value * daily_multiplier

            # Ensure value doesn't go below 50% of initial
            current_value = max(current_value, total_value * 0.5)

            date = datetime.now() + timedelta(days=day)
            timeline.append({
                'day': day,
                'value': round(current_value, 2),
                'date': date.strftime('%m/%d')
            })

        final_value = timeline[-1]['value']
        total_change = final_value - total_value

        # If no news references from AI, add some default ones based on scraped articles
        if not news_references:
            recent_articles = processor.get_popular_articles('all', limit=5)
            for article in recent_articles[:3]:
                news_references.append({
                    'title': article.get('title', 'Market Update'),
                    'source': article.get('source', 'News'),
                    'url': article.get('url', '#'),
                    'impact': 'neutral',
                    'relevance': 'May affect overall market sentiment'
                })

        return jsonify({
            'status': 'success',
            'predictions': {
                'timeline': timeline,
                'initialValue': total_value,
                'predictedValue': round(final_value, 2),
                'change': round(total_change, 2),
                'changePercent': round(predicted_change_percent, 2)
            },
            'news_references': news_references,
            'holdings_analyzed': len(holdings)
        }), 200

    except Exception as e:
        print(f"Error in portfolio planner: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/knowledge-graph', methods=['POST', 'OPTIONS'])
@cross_origin()
def generate_knowledge_graph():
    """
    Generate a knowledge graph from an article URL.
    Analyzes the article and creates a graph showing events, impacts, and reasoning.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body must contain JSON data'
            }), 400
        
        article_url = data.get('article_url')
        portfolio_stocks = data.get('portfolio_stocks', [])
        
        if not article_url:
            return jsonify({
                'status': 'error',
                'message': 'article_url is required'
            }), 400
        
        # Scrape article content
        try:
            import requests
            from bs4 import BeautifulSoup
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(article_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title = soup.find('title')
            title_text = title.get_text().strip() if title else 'Article'
            
            # Extract main content
            article_text = ''
            for tag in soup.find_all(['p', 'article', 'div']):
                text = tag.get_text().strip()
                if len(text) > 50:  # Only include substantial paragraphs
                    article_text += text + ' '
            
            # Limit article text length
            article_text = article_text[:5000]
            
        except Exception as e:
            print(f"Error scraping article: {e}")
            # Use URL and basic info if scraping fails
            title_text = article_url
            article_text = f"Article from {article_url}"
        
        # Use OpenAI to analyze the article and generate knowledge graph data
        # Build prompt first so it's available for fallback
        stocks_str = ', '.join(portfolio_stocks) if portfolio_stocks else 'None'
        prompt = None
        
        if not portfolio_stocks:
            # If no stocks, still analyze but note it
            prompt = f"""Analyze this article and create a knowledge graph structure.

Article Title: {title_text}
Article Content: {article_text[:3000]}
User Portfolio Stocks: None (user has no stocks in portfolio)

Extract and structure:
1. Key events that happened (2-4 events)
2. General market implications
3. Reasoning for potential impacts

Return ONLY valid JSON in this exact format:
{{
    "article": {{
        "title": "article title",
        "summary": "brief summary"
    }},
    "events": ["event 1", "event 2", "event 3"],
    "impacts": [],
    "reasoning": ["reason 1", "reason 2"]
}}

CRITICAL: Your response MUST be complete, valid JSON. Do not truncate your response."""
        else:
            # Always generate impacts for each stock in portfolio
            prompt = f"""Analyze this article and create a knowledge graph structure. You MUST analyze how this article impacts EACH stock in the user's portfolio, even if the connection is indirect.

Article Title: {title_text}
Article Content: {article_text[:3000]}
User Portfolio Stocks: {', '.join(portfolio_stocks)}

IMPORTANT: You MUST provide an impact analysis for EACH stock in the portfolio ({', '.join(portfolio_stocks)}). Even if the article doesn't directly mention these stocks, analyze:
- Indirect impacts (sector effects, market sentiment, regulatory changes, economic implications)
- How the events in the article could affect each company
- Potential ripple effects through the market

For each stock, determine:
- Type: positive (if likely to benefit), negative (if likely to be hurt), or neutral (if minimal impact)
- Description: Specific explanation of how this article/event impacts the stock
- Reasoning: Why this impact occurs (even if indirect)

Extract and structure:
1. Key events that happened (2-4 events)
2. How these events impact EACH of the user's portfolio stocks (REQUIRED - one impact per stock)
3. Reasoning for why these impacts occur

Return ONLY valid JSON in this exact format:
{{
    "article": {{
        "title": "article title",
        "summary": "brief summary"
    }},
    "events": ["event 1", "event 2", "event 3"],
    "impacts": [
        {{
            "stock": "AAPL",
            "type": "positive/negative/neutral",
            "description": "specific explanation of how this impacts AAPL",
            "reasoning": "detailed reasoning for why this impact occurs, even if indirect"
        }},
        {{
            "stock": "GOOGL",
            "type": "positive/negative/neutral",
            "description": "specific explanation of how this impacts GOOGL",
            "reasoning": "detailed reasoning for why this impact occurs, even if indirect"
        }}
    ],
    "reasoning": ["reason 1", "reason 2"]
}}

CRITICAL: 
1. You MUST include an impact entry for EVERY stock in the portfolio: {', '.join(portfolio_stocks)}. Do not leave any stock out. If the connection is indirect, explain the indirect relationship clearly.
2. Your response MUST be complete, valid JSON. Do not truncate your response. Ensure all JSON brackets and braces are properly closed."""
        
        # Now try OpenAI API
        try:
            from openai import OpenAI
            import os
            
            openai_api_key = os.getenv('OPENAI_API_KEY')
            if not openai_api_key:
                raise Exception("OPENAI_API_KEY environment variable is not set. Please set it in your .env file.")
            
            client = OpenAI(api_key=openai_api_key)
            print(f"Using OpenAI API for knowledge graph generation")
            
            # Calculate appropriate max_tokens based on number of stocks
            # Base tokens: 1000 for article analysis + 500 per stock for detailed impact analysis
            num_stocks = len(portfolio_stocks) if portfolio_stocks else 0
            base_tokens = 2000
            stock_tokens = max(800 * num_stocks, 2000)  # At least 800 tokens per stock, minimum 2000
            max_tokens = min(base_tokens + stock_tokens, 8000)  # Cap at 8000 to avoid hitting limits
            
            print(f"Generating knowledge graph with max_tokens={max_tokens} for {num_stocks} stocks")
            
            # Retry logic for incomplete responses
            max_retries = 2
            result = None
            last_error = None
            
            for attempt in range(max_retries + 1):
                try:
                    response = client.chat.completions.create(
                        model="gpt-4",
                        messages=[
                            {"role": "system", "content": "You are a financial analyst. Always return valid JSON only, no markdown. You MUST analyze impacts for every stock in the user's portfolio, even if the connection is indirect. CRITICAL: Your response MUST be complete, valid JSON. Do not truncate your response."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.3,
                        max_tokens=max_tokens
                    )
                    
                    # Check response structure
                    if not response or not response.choices or len(response.choices) == 0:
                        raise Exception("Empty response from OpenAI API")
                    
                    result_text = response.choices[0].message.content.strip()
                    
                    if not result_text:
                        raise Exception("Empty content in OpenAI response")
                    
                    # Check if response was truncated
                    finish_reason = getattr(response.choices[0], 'finish_reason', None)
                    if finish_reason == 'length':
                        print(f"Warning: Response was truncated (finish_reason=length). Attempt {attempt + 1}/{max_retries + 1}")
                        if attempt < max_retries:
                            # Increase tokens and retry
                            max_tokens = min(max_tokens + 2000, 8000)
                            continue
                        else:
                            print(f"Warning: Response truncated on final attempt. Attempting to parse partial JSON...")
                    
                    # Remove markdown code blocks if present
                    if result_text.startswith('```'):
                        result_text = result_text.split('```')[1]
                        if result_text.startswith('json'):
                            result_text = result_text[4:]
                        result_text = result_text.strip()
                    
                    # Try to parse JSON
                    try:
                        result = json.loads(result_text)
                    except json.JSONDecodeError as json_err:
                        # Try to fix incomplete JSON
                        print(f"JSON parse error: {json_err}. Attempting to fix incomplete JSON...")
                        
                        # Try to extract valid JSON from incomplete response
                        # Look for the last complete object/array
                        if result_text.rstrip().endswith(','):
                            result_text = result_text.rstrip()[:-1]
                        
                        # Try to close unclosed brackets/braces
                        open_braces = result_text.count('{') - result_text.count('}')
                        open_brackets = result_text.count('[') - result_text.count(']')
                        
                        if open_braces > 0:
                            result_text += '}' * open_braces
                        if open_brackets > 0:
                            result_text += ']' * open_brackets
                        
                        # Try parsing again
                        try:
                            result = json.loads(result_text)
                        except json.JSONDecodeError:
                            # If still fails and we have retries left, retry with more tokens
                            if attempt < max_retries:
                                max_tokens = min(max_tokens + 2000, 8000)
                                last_error = f"JSON parsing failed: {json_err}"
                                continue
                            else:
                                raise Exception(f"Failed to parse JSON response after {max_retries + 1} attempts. Last error: {json_err}")
                    
                    # Validate that we have the required structure
                    if not isinstance(result, dict):
                        raise Exception("Response is not a JSON object")
                    
                    # Ensure all required fields exist
                    if 'article' not in result:
                        result['article'] = {'title': title_text, 'summary': ''}
                    if 'events' not in result:
                        result['events'] = []
                    if 'impacts' not in result:
                        result['impacts'] = []
                    if 'reasoning' not in result:
                        result['reasoning'] = []
                    
                    # Validate impacts if stocks were provided
                    if portfolio_stocks and len(result.get('impacts', [])) < len(portfolio_stocks):
                        print(f"Warning: Only {len(result.get('impacts', []))} impacts provided for {len(portfolio_stocks)} stocks")
                        # If we have retries left and impacts are missing, retry
                        if attempt < max_retries:
                            max_tokens = min(max_tokens + 2000, 8000)
                            last_error = f"Missing impacts for some stocks. Expected {len(portfolio_stocks)}, got {len(result.get('impacts', []))}"
                            continue
                    
                    # Success! Break out of retry loop
                    break
                    
                except Exception as e:
                    last_error = str(e)
                    import traceback
                    error_trace = traceback.format_exc()
                    print(f"Error on attempt {attempt + 1}/{max_retries + 1}: {e}")
                    print(f"Traceback: {error_trace}")
                    
                    if attempt < max_retries:
                        print(f"Retrying with more tokens (current: {max_tokens})...")
                        max_tokens = min(max_tokens + 2000, 8000)
                        continue
                    else:
                        # On final attempt, raise with full error details
                        raise Exception(f"Failed after {max_retries + 1} attempts. Last error: {last_error}")
            
            if result is None:
                raise Exception(f"Failed to generate valid response after {max_retries + 1} attempts: {last_error}")
            
            return jsonify({
                'status': 'success',
                'article': result.get('article', {'title': title_text, 'summary': ''}),
                'events': result.get('events', []),
                'impacts': result.get('impacts', []),
                'reasoning': result.get('reasoning', [])
            }), 200
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error with OpenAI analysis: {e}")
            print(f"Full traceback: {error_trace}")
            
            # Try OpenRouter as fallback if OpenAI fails
            try:
                from openrouter_client import OpenRouterClient
                openrouter_key = os.getenv('OPENROUTER_API_KEY')
                if openrouter_key and prompt:
                    print("Attempting to use OpenRouter as fallback...")
                    openrouter_client = OpenRouterClient(api_key=openrouter_key)
                    
                    # Recalculate tokens for OpenRouter
                    num_stocks = len(portfolio_stocks) if portfolio_stocks else 0
                    base_tokens = 2000
                    stock_tokens = max(800 * num_stocks, 2000)
                    max_tokens = min(base_tokens + stock_tokens, 8000)
                    
                    # Use the same prompt
                    response = openrouter_client.chat_completions_create(
                        model="deepseek/deepseek-r1-0528:free",
                        messages=[
                            {"role": "system", "content": "You are a financial analyst. Always return valid JSON only, no markdown. You MUST analyze impacts for every stock in the user's portfolio, even if the connection is indirect. CRITICAL: Your response MUST be complete, valid JSON. Do not truncate your response."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.3,
                        max_tokens=max_tokens
                    )
                    
                    result_text = response.choices[0].message.content.strip()
                    
                    # Remove markdown code blocks if present
                    if result_text.startswith('```'):
                        result_text = result_text.split('```')[1]
                        if result_text.startswith('json'):
                            result_text = result_text[4:]
                        result_text = result_text.strip()
                    
                    result = json.loads(result_text)
                    
                    # Ensure all required fields exist
                    if 'article' not in result:
                        result['article'] = {'title': title_text, 'summary': ''}
                    if 'events' not in result:
                        result['events'] = []
                    if 'impacts' not in result:
                        result['impacts'] = []
                    if 'reasoning' not in result:
                        result['reasoning'] = []
                    
                    print("Successfully generated knowledge graph using OpenRouter fallback")
                    return jsonify({
                        'status': 'success',
                        'article': result.get('article', {'title': title_text, 'summary': ''}),
                        'events': result.get('events', []),
                        'impacts': result.get('impacts', []),
                        'reasoning': result.get('reasoning', [])
                    }), 200
            except Exception as openrouter_error:
                print(f"OpenRouter fallback also failed: {openrouter_error}")
            
            # Return error so user knows what went wrong
            return jsonify({
                'status': 'error',
                'message': f'Failed to generate knowledge graph: {str(e)}. Please check that OPENAI_API_KEY or OPENROUTER_API_KEY is set and valid.',
                'error_details': str(e)
            }), 500
        
    except Exception as e:
        print(f"Error generating knowledge graph: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============== COMPANY DATA ENDPOINTS ==============

@app.route('/api/companies/top', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_top_companies():
    """Get top 20 global companies with their locations and stock data"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        companies = company_data_provider.get_top_companies()
        return jsonify({
            'status': 'success',
            'companies': companies,
            'count': len(companies)
        }), 200
    except Exception as e:
        print(f"Error fetching top companies: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/companies/<symbol>/chart', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_company_chart(symbol):
    """Get weekly stock price and revenue data for a company (1 year)"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        symbol = symbol.upper()
        chart_data = company_data_provider.get_company_chart_data(symbol)
        
        if 'error' in chart_data:
            return jsonify({
                'status': 'error',
                'message': chart_data['error']
            }), 404
        
        return jsonify({
            'status': 'success',
            'data': chart_data
        }), 200
    except Exception as e:
        print(f"Error fetching chart data for {symbol}: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/companies/lesser-known', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_lesser_known_companies():
    """Get lesser-known companies with stock prices"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        companies = company_data_provider.get_lesser_known_companies()
        return jsonify({
            'status': 'success',
            'companies': companies,
            'count': len(companies)
        }), 200
    except Exception as e:
        print(f"Error fetching lesser-known companies: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/companies/recommendations', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_investment_recommendations():
    """Get AI-powered investment recommendations for lesser-known companies"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        # Get portfolio stocks from query parameter (comma-separated symbols)
        portfolio_param = request.args.get('portfolio', '')
        portfolio_symbols = [s.strip().upper() for s in portfolio_param.split(',') if s.strip()]
        
        # First get the lesser-known companies data
        companies = company_data_provider.get_lesser_known_companies()
        
        # Get portfolio stocks data if provided
        portfolio_stocks = []
        if portfolio_symbols:
            portfolio_stocks = company_data_provider.get_portfolio_stocks_data(portfolio_symbols)
        
        # Then get AI recommendations
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            recommendations = loop.run_until_complete(
                company_data_provider.get_investment_recommendations(companies, portfolio_stocks)
            )
        finally:
            # Properly shutdown the event loop to handle pending async tasks
            try:
                # Cancel all pending tasks
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()
                # Give tasks a chance to clean up
                if pending:
                    loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            except Exception:
                pass
            finally:
                loop.close()
        
        return jsonify({
            'status': 'success',
            'recommendations': recommendations,
            'companiesAnalyzed': len(companies)
        }), 200
    except Exception as e:
        import traceback
        print(f"Error getting recommendations: {e}")
        print(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    # Use port 5004 to avoid conflict with macOS AirPlay Receiver on port 5000
    port = int(os.getenv('PORT', 5004))
    print(f"Starting backend server on http://localhost:{port}")
    print("CORS enabled for all origins")
    app.run(debug=True, port=port, host='0.0.0.0')
