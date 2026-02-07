from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
from news_scraper import NewsScraper
from news_processor import NewsProcessor
from stock_prediction2 import StockPredictor
import os
import asyncio
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from dotenv import load_dotenv

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
            predictions = asyncio.run(stock_predictor.predict_article_impact(assets, article))
        except RuntimeError:
            # If event loop is already running, use a different approach
            loop = asyncio.get_event_loop()
            predictions = loop.run_until_complete(stock_predictor.predict_article_impact(assets, article))
        
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


if __name__ == '__main__':
    # Use port 5001 to avoid conflict with macOS AirPlay Receiver on port 5000
    port = int(os.getenv('PORT', 5001))
    print(f"Starting backend server on http://localhost:{port}")
    print("CORS enabled for all origins")
    app.run(debug=True, port=port, host='0.0.0.0')
