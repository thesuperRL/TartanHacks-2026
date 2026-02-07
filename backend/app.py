from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
from news_scraper import NewsScraper
from news_processor import NewsProcessor
from stock_prediction2 import StockPredictor
import os
import asyncio
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
