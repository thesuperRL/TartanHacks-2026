import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import LogoAnimation from './components/LogoAnimation';
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
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const prevAuthenticatedRef = useRef(null);
  const hasAnimatedStartup = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNews();
      fetchPopularNews();
    }
  }, [isAuthenticated]);

  // Startup animations (only after logo animation completes) - using CSS classes for performance
  useEffect(() => {
    if (!authLoading && logoAnimationComplete && !hasAnimatedStartup.current) {
      hasAnimatedStartup.current = true;
      
      // Add animation classes - CSS handles the rest (GPU-accelerated)
      const header = document.querySelector('.app-header');
      const content = document.querySelector('.app-content');
      
      // Start animations immediately for smooth transition
      if (header) {
        header.classList.add('animate-in');
      }
      
      if (content) {
        // Remove hidden class first, then animate in
        content.classList.remove('hidden');
        // Small delay to ensure smooth transition
        requestAnimationFrame(() => {
          setTimeout(() => {
            content.classList.add('animate-in');
          }, 10);
        });
      }

      // If authenticated, animate authenticated elements
      if (isAuthenticated) {
        setTimeout(() => {
          const buttons = document.querySelectorAll('.refresh-button, .user-info');
          buttons.forEach((btn, i) => {
            setTimeout(() => {
              btn.classList.add('animate-in');
            }, i * 30);
          });

          const sidebar = document.querySelector('.sidebar');
          const mapContainer = document.querySelector('.map-container');
          
          setTimeout(() => {
            if (sidebar) sidebar.classList.add('animate-in');
            if (mapContainer) mapContainer.classList.add('animate-in');
          }, 80);
        }, 100);
      }
    }
  }, [authLoading, isAuthenticated, logoAnimationComplete]);

  // Login animations - using CSS classes for performance
  useEffect(() => {
    if (prevAuthenticatedRef.current === false && isAuthenticated === true) {
      // User just logged in - use CSS classes for smooth animations
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          const header = document.querySelector('.app-header');
          const headerH1 = document.querySelector('.app-header h1');
          const content = document.querySelector('.app-content');
          
          // Make app-content visible first
          if (content) {
            content.classList.remove('hidden');
            content.classList.add('animate-in');
          }
          
          // Animate header
          if (header) {
            header.classList.add('animate-in');
          }
          if (headerH1) {
            headerH1.classList.add('animate-in');
          }

          // Animate buttons with slight delay
          setTimeout(() => {
            const buttons = document.querySelectorAll('.refresh-button, .user-info');
            buttons.forEach((btn, i) => {
              setTimeout(() => {
                btn.classList.add('animate-in');
              }, i * 30);
            });
          }, 50);

          // Animate sidebar and map - wait a bit for them to render
          setTimeout(() => {
            const sidebar = document.querySelector('.sidebar');
            const mapContainer = document.querySelector('.map-container');
            
            if (sidebar) sidebar.classList.add('animate-in');
            if (mapContainer) {
              setTimeout(() => {
                mapContainer.classList.add('animate-in');
              }, 50);
            }
          }, 150);
          
          // Remove blur with CSS transition
          if (content) {
            content.classList.remove('blurred');
          }
        }, 100);
      });
    }
    prevAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Logout animations - using CSS classes for performance
  useEffect(() => {
    if (prevAuthenticatedRef.current === true && isAuthenticated === false) {
      // User just logged out - use CSS classes
      const header = document.querySelector('.app-header h1');
      const buttons = document.querySelectorAll('.refresh-button, .user-info, .sidebar, .map-container');
      const content = document.querySelector('.app-content');
      
      if (header) header.classList.add('animate-out');
      
      buttons.forEach((btn, i) => {
        setTimeout(() => {
          btn.classList.add('animate-out');
        }, i * 30);
      });
      
      // Add blur with CSS transition
      if (content) {
        setTimeout(() => {
          content.classList.add('blurred');
        }, 100);
      }
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

  const handleLogoAnimationComplete = () => {
    setLogoAnimationComplete(true);
  };

  return (
    <div className="app">
      {!logoAnimationComplete && (
        <LogoAnimation onComplete={handleLogoAnimationComplete} />
      )}
      {!isAuthenticated && <AuthModal />}
      {isAuthenticated && (
        <SettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)}
          onStocksUpdate={handleStocksUpdate}
        />
      )}
      
      <div className={`app-content ${!isAuthenticated ? 'blurred' : ''} ${!logoAnimationComplete ? 'hidden' : ''}`}>
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
