import React, { useState, useEffect } from 'react';
import MapViewer from './components/MapViewer';
import PopularArticlesList from './components/PopularArticlesList';
import PortfolioOverlay from './components/PortfolioOverlay';
import CategorySelector from './components/CategorySelector';
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
          {loading ? 'Refreshing...' : '🔄 Refresh News'}
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

        <div className="sidebar">
          <PopularArticlesList 
            articles={popularArticles}
            onArticleClick={handleArticleClick}
            selectedArticle={selectedArticle}
          />
        </div>

        {financialMode && (
          <PortfolioOverlay />
        )}
      </div>
    </div>
  );
}

export default App;
