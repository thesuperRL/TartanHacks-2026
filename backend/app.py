from flask import Flask, jsonify, request
from flask_cors import CORS
from news_scraper import NewsScraper
from news_processor import NewsProcessor
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Configure CORS to allow requests from React dev server
# In development, allow all origins for easier testing
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins in development
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize components
scraper = NewsScraper()
processor = NewsProcessor()

@app.route('/api/news', methods=['GET'])
def get_news():
    """Get all news articles with locations"""
    category = request.args.get('category', 'all')  # 'financial', 'political', or 'all'
    articles = processor.get_articles_by_category(category)
    return jsonify(articles)

@app.route('/api/news/popular', methods=['GET'])
def get_popular_news():
    """Get most popular news articles (for the blurred list)"""
    category = request.args.get('category', 'all')
    articles = processor.get_popular_articles(category, limit=20)
    return jsonify(articles)

@app.route('/api/news/refresh', methods=['POST'])
def refresh_news():
    """Trigger a news refresh/scrape"""
    try:
        articles = scraper.scrape_all_sources()
        processor.process_articles(articles)
        return jsonify({'status': 'success', 'message': 'News refreshed successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
