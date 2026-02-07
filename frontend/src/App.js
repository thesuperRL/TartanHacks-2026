import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Debug: Log the API URL being used
console.log('API Base URL:', API_BASE_URL);
console.log('Mapbox Access Token:', process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ? 'Set' : 'Not set');

function App() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();
  const [articles, setArticles] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [portfolioMinimized, setPortfolioMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNews();
      fetchPopularNews();
    }
  }, [isAuthenticated]);

  const fetchNews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/news?category=all`);
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
      const response = await fetch(`${API_BASE_URL}/news/popular?category=all`);
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

  if (authLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner-large"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const handleStocksUpdate = (newStocks) => {
    // Firestore listeners handle updates automatically
    // This is kept for compatibility but may not be needed
    window.dispatchEvent(new Event('stocksUpdated'));
  };

  return (
    <div className="app">
      {!isAuthenticated && <AuthModal />}
      {isAuthenticated && (
        <SettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)}
          onStocksUpdate={handleStocksUpdate}
        />
      )}
      
      <div className={`app-content ${!isAuthenticated ? 'blurred' : ''}`}>
        <div className="app-header">
          <h1>🌍 Global News Explorer</h1>
          {isAuthenticated && (
            <>
              <button className="refresh-button" onClick={handleRefreshNews} disabled={loading}>
                {loading ? 'Refreshing' : '🔄 Refresh News'}
              </button>
              <div className="user-info">
                <button 
                  className="user-name-button" 
                  onClick={() => setShowSettings(true)}
                  title="Open settings"
                >
                  👤 {user?.name || user?.email}
                </button>
                <button className="logout-button" onClick={logout} title="Logout">
                  Logout
                </button>
              </div>
            </>
          )}
        </div>

        <div className="app-content-inner">
          {isAuthenticated && (
            <>
              <Sidebar
                popularArticles={popularArticles}
                onArticleClick={handleArticleClick}
                selectedArticle={selectedArticle}
                portfolioMinimized={portfolioMinimized}
                onPortfolioMinimize={setPortfolioMinimized}
                articlesMinimized={sidebarMinimized}
                onArticlesMinimize={setSidebarMinimized}
              />
              <div className="map-container">
                <MapViewer 
                  articles={articles}
                  selectedArticle={selectedArticle}
                  onArticleSelect={setSelectedArticle}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
