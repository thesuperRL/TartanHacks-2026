from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
from news_scraper import NewsScraper
from news_processor import NewsProcessor
import os
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

# Simple in-memory user storage (in production, use a database)
users_db = {}
tokens_db = {}

def generate_token():
    return secrets.token_urlsafe(32)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

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

@app.route('/api/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def health_check():
    """Health check endpoint"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    return jsonify({'status': 'healthy', 'cors': 'enabled'})

if __name__ == '__main__':
    # Use port 5001 to avoid conflict with macOS AirPlay Receiver on port 5000
    port = int(os.getenv('PORT', 5001))
    print(f"Starting backend server on http://localhost:{port}")
    print("CORS enabled for all origins")
    app.run(debug=True, port=port, host='0.0.0.0')
