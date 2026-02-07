import React, { useState, useEffect } from 'react';
import MapViewer from './components/MapViewer';
import PopularArticlesList from './components/PopularArticlesList';
import PortfolioOverlay from './components/PortfolioOverlay';
import CategorySelector from './components/CategorySelector';
import DraggableWindow from './components/DraggableWindow';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Debug: Log the API URL being used
console.log('API Base URL:', API_BASE_URL);
console.log('Google Maps API Key:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'Set' : 'Not set');

function App() {
  const [articles, setArticles] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [financialMode, setFinancialMode] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [portfolioMinimized, setPortfolioMinimized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPortfolio, setShowPortfolio] = useState(false);

  useEffect(() => {
    fetchNews();
    fetchPopularNews();
  }, [selectedCategory]);

  const fetchNews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/news?category=${selectedCategory}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching news:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        console.error('Backend server may not be running. Please start it with: ./start-backend.sh');
      }
      setArticles([]);
    }
  };

  const fetchPopularNews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/news/popular?category=${selectedCategory}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPopularArticles(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching popular news:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        console.error('Backend server may not be running. Please start it with: ./start-backend.sh');
      }
      setPopularArticles([]);
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setFinancialMode(category === 'financial');
    if (category === 'financial') {
      setShowPortfolio(true);
    }
  };

  const handleArticleClick = (article) => {
    setSelectedArticle(article);
    // Unblur the article when clicked
    setPopularArticles(prev => 
      prev.map(a => a.id === article.id ? {...a, blurred: false} : a)
    );
  };

  const handleRefreshNews = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/news/refresh`, { method: 'POST' });
      await fetchNews();
      await fetchPopularNews();
    } catch (error) {
      console.error('Error refreshing news:', error);
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>🌍 Global News Explorer</h1>
        <CategorySelector 
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
        <button className="refresh-button" onClick={handleRefreshNews} disabled={loading}>
          {loading ? 'Refreshing' : '🔄 Refresh News'}
        </button>
      </div>

      <div className="app-content">
        <div className="map-container">
          <MapViewer 
            articles={articles}
            selectedArticle={selectedArticle}
            onArticleSelect={setSelectedArticle}
          />
        </div>

        {showSidebar && (
          <DraggableWindow
            title="🔥 Popular Articles"
            defaultPosition={{ x: 20, y: 80 }}
            defaultSize={{ width: 420, height: 600 }}
            minSize={{ width: 350, height: 300 }}
            onClose={() => setShowSidebar(false)}
            isMinimized={sidebarMinimized}
            onMinimize={setSidebarMinimized}
            className="articles-window"
          >
            <PopularArticlesList 
              articles={popularArticles}
              onArticleClick={handleArticleClick}
              selectedArticle={selectedArticle}
            />
          </DraggableWindow>
        )}

        {!showSidebar && (
          <button 
            className="window-toggle-button"
            onClick={() => setShowSidebar(true)}
            style={{ position: 'absolute', top: '80px', left: '20px', zIndex: 1000 }}
          >
            📰 Articles
          </button>
        )}

        {financialMode && showPortfolio && (
          <DraggableWindow
            title="💼 Your Portfolio"
            defaultPosition={{ x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 420) : 800, y: 80 }}
            defaultSize={{ width: 380, height: 500 }}
            minSize={{ width: 320, height: 300 }}
            onClose={() => setShowPortfolio(false)}
            isMinimized={portfolioMinimized}
            onMinimize={setPortfolioMinimized}
            className="portfolio-window"
          >
            <PortfolioOverlay isWindow={true} />
          </DraggableWindow>
        )}

        {financialMode && !showPortfolio && (
          <button 
            className="window-toggle-button"
            onClick={() => setShowPortfolio(true)}
            style={{ position: 'absolute', top: '80px', right: '20px', zIndex: 1000 }}
          >
            💼 Portfolio
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
