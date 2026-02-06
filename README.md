# Global News Explorer

An interactive news viewer that allows users to explore news articles from around the world through an immersive map interface with street view integration.

## Features

### Frontend
- **Interactive Map Viewer**: Google Maps integration with street view support
- **News Pins**: Visual markers on the map showing article locations
- **Popular Articles List**: Blurred article titles that reveal when clicked
- **Portfolio Overlay**: Stock tracking interface for financial mode
- **Category Filtering**: Switch between Financial, Political, or All news

### Backend
- **News Scraper**: Aggregates articles from diverse news sources
- **AI-Powered Location Detection**: Uses OpenAI to identify article locations
- **Topic Categorization**: Automatically categorizes articles as financial or political
- **RESTful API**: Clean API endpoints for frontend consumption

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- Google Maps API key
- OpenAI API key (optional, but recommended for location detection)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

5. Run the backend server:
```bash
python app.py
```

The backend will run on `http://localhost:5001` (using 5001 to avoid macOS AirPlay Receiver conflict on port 5000)

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file in frontend directory
cat > .env << EOF
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
EOF
# Edit .env and add your Google Maps API key
```

   - Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
   - Enable "Maps JavaScript API" and optionally "Street View Static API"
   - Replace `your_google_maps_api_key_here` with your actual key

5. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Refresh News**: Click the "Refresh News" button to scrape latest articles
2. **Explore Map**: Click on pins to see article details
3. **Street View**: Double-click on the map to enter street view mode
4. **View Articles**: Click on blurred articles in the sidebar to reveal them
5. **Financial Mode**: Switch to Financial category to see portfolio overlay
6. **Add Stocks**: In financial mode, add stocks to your watchlist

## API Endpoints

- `GET /api/news?category={category}` - Get all news articles
- `GET /api/news/popular?category={category}` - Get popular articles
- `POST /api/news/refresh` - Trigger news refresh
- `GET /api/health` - Health check

## Project Structure

```
TartanHacks-2026/
├── backend/
│   ├── app.py                 # Flask application
│   ├── news_scraper.py        # News scraping logic
│   ├── news_processor.py      # AI processing and location detection
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main app component
│   │   ├── components/        # React components
│   │   └── ...
│   ├── public/
│   └── package.json
└── README.md
```

## Technologies Used

### Backend
- Flask (Python web framework)
- OpenAI API (for location detection and categorization)
- BeautifulSoup & Newspaper3k (web scraping)
- Geopy (geocoding)

### Frontend
- React
- Google Maps API
- Axios (HTTP client)

## Notes

- The news scraper respects rate limits and includes delays between requests
- Location detection works best with OpenAI API key, but has fallback methods
- Stock prices in portfolio are currently mocked (replace with real API in production)
- **API Keys**: Both Google Maps and OpenAI API keys should be stored in `.env` files (never commit these to git)
  - Backend: `backend/.env` with `OPENAI_API_KEY`
  - Frontend: `frontend/.env` with `REACT_APP_GOOGLE_MAPS_API_KEY` and `REACT_APP_API_URL`

## License

MIT
