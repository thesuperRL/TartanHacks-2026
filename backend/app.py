from flask import Flask, jsonify, request, send_file
from flask_cors import CORS, cross_origin
from news_scraper import NewsScraper
from news_processor import NewsProcessor
from stock_prediction import StockPredictor
from portfolio_predictor import PortfolioPredictor
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
    articles = processor.get_articles_by_category(category)
    return jsonify(articles)

@app.route('/api/news/popular', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_popular_news():
    """Get most popular news articles (for the blurred list)"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    category = request.args.get('category', 'all')
    articles = processor.get_popular_articles(category, limit=20)
    return jsonify(articles)

@app.route('/api/news/refresh', methods=['POST', 'OPTIONS'])
@cross_origin()
def refresh_news():
    """Trigger a news refresh/scrape"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    try:
        articles = scraper.scrape_all_sources()
        processor.process_articles(articles)
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
            audio_response = client.audio.speech.create(
                model="tts-1",
                voice="alloy",  # Options: alloy, echo, fable, onyx, nova, shimmer
                input=script[:4000]  # Limit to 4000 characters for TTS
            )
            
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as audio_file:
                audio_file.write(audio_response.content)
                audio_path = audio_file.name
            
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
            temp_files[os.path.basename(audio_path)] = audio_path
            if video_path and os.path.exists(video_path):
                temp_files[os.path.basename(video_path)] = video_path
            
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
            print(f"Error generating audio: {e}")
            # Fallback: return script only
            return jsonify({
                'status': 'success',
                'script': script,
                'audio_url': None,
                'video_url': None,
                'message': 'Script generated. Audio generation failed.',
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
        if filename in temp_files and os.path.exists(temp_files[filename]):
            return send_file(
                temp_files[filename],
                mimetype='audio/mpeg',
                as_attachment=False,
                download_name='daily-digest-podcast.mp3'
            )
        return jsonify({
            'status': 'error',
            'message': 'Audio file not found'
        }), 404
    except Exception as e:
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
        try:
            from openai import OpenAI
            import os
            
            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            stocks_str = ', '.join(portfolio_stocks) if portfolio_stocks else 'None'
            
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
}}"""
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

CRITICAL: You MUST include an impact entry for EVERY stock in the portfolio: {', '.join(portfolio_stocks)}. Do not leave any stock out. If the connection is indirect, explain the indirect relationship clearly."""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a financial analyst. Always return valid JSON only, no markdown. You MUST analyze impacts for every stock in the user's portfolio, even if the connection is indirect."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000  # Increased to accommodate detailed impacts for each stock
            )
            
            result_text = response.choices[0].message.content.strip()
            # Remove markdown code blocks if present
            if result_text.startswith('```'):
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]
            
            result = json.loads(result_text)
            
            return jsonify({
                'status': 'success',
                'article': result.get('article', {'title': title_text, 'summary': ''}),
                'events': result.get('events', []),
                'impacts': result.get('impacts', []),
                'reasoning': result.get('reasoning', [])
            }), 200
            
        except Exception as e:
            print(f"Error with OpenAI analysis: {e}")
            # Fallback: generate basic structure
            return jsonify({
                'status': 'success',
                'article': {
                    'title': title_text,
                    'summary': article_text[:200] + '...' if len(article_text) > 200 else article_text
                },
                'events': ['Article analyzed', 'Content extracted'],
                'impacts': [],
                'reasoning': ['Article analysis completed']
            }), 200
        
    except Exception as e:
        print(f"Error generating knowledge graph: {e}")
        import traceback
        traceback.print_exc()
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
