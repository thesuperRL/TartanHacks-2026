from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
from news_scraper import NewsScraper
from news_processor import NewsProcessor
import os
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

if __name__ == '__main__':
    # Use port 5001 to avoid conflict with macOS AirPlay Receiver on port 5000
    port = int(os.getenv('PORT', 5001))
    print(f"Starting backend server on http://localhost:{port}")
    print("CORS enabled for all origins")
    app.run(debug=True, port=port, host='0.0.0.0')
