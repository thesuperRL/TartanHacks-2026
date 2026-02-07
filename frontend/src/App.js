import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { db } from './config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { generateDemoArticles } from './utils/generateDemoArticles';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import LogoAnimation from './components/LogoAnimation';
import PredictionResults from './components/PredictionResults';
import ModeSelector from './components/ModeSelector';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

// Debug: Log the API URL being used
console.log('API Base URL:', API_BASE_URL);
console.log('Mapbox Access Token:', process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ? 'Set' : 'Not set');

function App() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();
  // Generate default articles based on mode
  const getDefaultArticles = (mode) => {
    if (mode === 'political') {
      return [
        {
          id: 'article-1',
          title: 'Geopolitical Impact: International Summit Addresses Regional Tensions',
          summary: 'World leaders convene to address escalating tensions and coordinate diplomatic responses to regional conflicts.',
          category: 'political',
          location: 'Washington, DC',
          source: 'Reuters',
          url: 'https://www.reuters.com',
          coordinates: { lat: 38.9072, lng: -77.0369 },
          popularity_score: 0.9,
          blurred: false
        },
        {
          id: 'article-2',
          title: 'Political Analysis: Election Results Reshape Government Priorities',
          summary: 'Recent election outcomes signal significant shifts in policy direction and international relations strategy.',
          category: 'political',
          location: 'London',
          source: 'BBC',
          url: 'https://www.bbc.com',
          coordinates: { lat: 51.5074, lng: -0.1278 },
          popularity_score: 0.85,
          blurred: false
        },
        {
          id: 'article-3',
          title: 'Strategic Implications: Military Alliance Strengthens Defense Posture',
          summary: 'Defense cooperation agreements are being strengthened as regional security concerns intensify.',
          category: 'political',
          location: 'Brussels',
          source: 'CNN',
          url: 'https://www.cnn.com',
          coordinates: { lat: 50.8503, lng: 4.3517 },
          popularity_score: 0.8,
          blurred: false
        },
        {
          id: 'article-4',
          title: 'Diplomatic Developments: Trade Negotiations Reach Critical Phase',
          summary: 'High-stakes negotiations between major powers enter a decisive phase with significant implications for global trade.',
          category: 'political',
          location: 'Geneva',
          source: 'The Guardian',
          url: 'https://www.theguardian.com',
          coordinates: { lat: 46.2044, lng: 6.1432 },
          popularity_score: 0.75,
          blurred: false
        },
        {
          id: 'article-5',
          title: 'International Relations: Border Disputes Escalate in Conflict Zone',
          summary: 'Territorial disputes intensify as diplomatic efforts to resolve tensions face mounting challenges.',
          category: 'political',
          location: 'Jerusalem',
          source: 'Al Jazeera',
          url: 'https://www.aljazeera.com',
          coordinates: { lat: 31.7683, lng: 35.2137 },
          popularity_score: 0.7,
          blurred: false
        }
      ];
    } else {
      return [
        {
          id: 'article-1',
          title: 'Market Impact: Federal Reserve Signals Potential Rate Cuts in Q2',
          summary: 'The Federal Reserve hints at monetary policy shifts that could impact bond yields and stock valuations across multiple sectors.',
          category: 'financial',
          location: 'Washington, DC',
          source: 'Bloomberg',
          url: 'https://www.bloomberg.com',
          coordinates: { lat: 38.9072, lng: -77.0369 },
          popularity_score: 0.9,
          blurred: false
        },
        {
          id: 'article-2',
          title: 'Investment Outlook: Tech Stocks Rally on Strong Earnings Reports',
          summary: 'Major technology companies exceed analyst expectations, driving significant gains in NASDAQ and attracting institutional investors.',
          category: 'financial',
          location: 'San Francisco',
          source: 'Reuters',
          url: 'https://www.reuters.com',
          coordinates: { lat: 37.7749, lng: -122.4194 },
          popularity_score: 0.85,
          blurred: false
        },
        {
          id: 'article-3',
          title: 'Financial Analysis: Oil Prices Surge Amid Supply Chain Disruptions',
          summary: 'Global energy markets experience volatility as geopolitical tensions affect crude oil supply chains and refinery operations.',
          category: 'financial',
          location: 'New York',
          source: 'Financial Times',
          url: 'https://www.ft.com',
          coordinates: { lat: 40.7128, lng: -74.0060 },
          popularity_score: 0.8,
          blurred: false
        },
        {
          id: 'article-4',
          title: 'Trading Implications: Cryptocurrency Markets See Increased Institutional Adoption',
          summary: 'Major banks and hedge funds announce cryptocurrency trading desks, signaling mainstream acceptance of digital assets.',
          category: 'financial',
          location: 'London',
          source: 'CNBC',
          url: 'https://www.cnbc.com',
          coordinates: { lat: 51.5074, lng: -0.1278 },
          popularity_score: 0.75,
          blurred: false
        },
        {
          id: 'article-5',
          title: 'Economic Impact: Inflation Data Shows Cooling Trend in Consumer Prices',
          summary: 'Latest CPI figures suggest the Federal Reserve\'s monetary policy is achieving its inflation targets, affecting bond markets.',
          category: 'financial',
          location: 'Washington, DC',
          source: 'MarketWatch',
          url: 'https://www.marketwatch.com',
          coordinates: { lat: 38.9072, lng: -77.0369 },
          popularity_score: 0.7,
          blurred: false
        }
      ];
    }
  };

  const [articles, setArticles] = useState([]);
  const [mode, setMode] = useState('economic'); // 'economic' or 'political'
  const [demoArticles, setDemoArticles] = useState(() => generateDemoArticles('economic'));
  const [popularArticles, setPopularArticles] = useState(() => getDefaultArticles('economic'));
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [portfolioMinimized, setPortfolioMinimized] = useState(false);
  const [predictionMinimized, setPredictionMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [userStocks, setUserStocks] = useState(['TSLA']);
  const [portfolio, setPortfolio] = useState([]);
  const [stocks, setStocks] = useState([]);
  const prevAuthenticatedRef = useRef(null);
  const hasAnimatedStartup = useRef(false);

  // Load portfolio data
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;

    const portfolioRef = doc(db, 'portfolios', user.uid);
    const unsubscribe = onSnapshot(
      portfolioRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const portfolioStocks = data.stocks || [];
          setPortfolio(portfolioStocks);
          setStocks(portfolioStocks);
        }
      },
      (error) => {
        console.error('Error loading portfolio:', error);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user?.uid]);

  // Update demo articles and default articles when mode changes
  useEffect(() => {
    setDemoArticles(generateDemoArticles(mode));
    setPopularArticles(getDefaultArticles(mode));
  }, [mode]);

  useEffect(() => {
    // Always initialize with demo articles for the map
    // The MapViewer will use demo articles if articles array is empty
    if (isAuthenticated) {
      // Clear existing articles when mode changes
      setArticles([]);
      // Fetch new articles for the current mode
      fetchNews();
      fetchPopularNews();
    }
  }, [isAuthenticated, mode]);

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
        // Use double requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            content.classList.add('animate-in');
          });
        });
      }

      // If authenticated, animate authenticated elements
      if (isAuthenticated) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const buttons = document.querySelectorAll('.refresh-button, .user-info');
            buttons.forEach((btn, i) => {
              requestAnimationFrame(() => {
                setTimeout(() => {
                  btn.classList.add('animate-in');
                }, i * 20);
              });
            });

            const sidebar = document.querySelector('.sidebar');
            const mapContainer = document.querySelector('.map-container');
            
            requestAnimationFrame(() => {
              setTimeout(() => {
                if (sidebar) sidebar.classList.add('animate-in');
                if (mapContainer) mapContainer.classList.add('animate-in');
              }, 50);
            });
          });
        });
      }
    }
  }, [authLoading, isAuthenticated, logoAnimationComplete]);

  // Login animations - using CSS classes for performance
  useEffect(() => {
    if (prevAuthenticatedRef.current === false && isAuthenticated === true) {
      // User just logged in - use CSS classes for smooth animations
      // Use double requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
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
          requestAnimationFrame(() => {
            setTimeout(() => {
              const buttons = document.querySelectorAll('.refresh-button, .user-info');
              buttons.forEach((btn, i) => {
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    btn.classList.add('animate-in');
                  }, i * 20);
                });
              });
            }, 30);
          });

          // Animate sidebar and map
          requestAnimationFrame(() => {
            setTimeout(() => {
              const sidebar = document.querySelector('.sidebar');
              const mapContainer = document.querySelector('.map-container');
              
              if (sidebar) sidebar.classList.add('animate-in');
              if (mapContainer) {
                requestAnimationFrame(() => {
                  mapContainer.classList.add('animate-in');
                });
              }
            }, 50);
          });
          
          // Remove blur with CSS transition
          if (content) {
            content.classList.remove('blurred');
          }
        });
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
      const response = await fetch(`${API_BASE_URL}/news?category=all&mode=${mode}`);
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
      const response = await fetch(`${API_BASE_URL}/news/popular?category=all&mode=${mode}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Replace articles instead of merging
      const apiArticles = Array.isArray(data) ? data : [];
      if (apiArticles.length > 0) {
        setPopularArticles(apiArticles);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching popular news:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        console.error('Backend server may not be running. Please start it with: ./start-backend.sh');
      }
      // On error, use demo articles as fallback
      setLoading(false);
    }
  };

  const generateFakeArticle = () => {
    // Only use finance-oriented articles
    const financeArticles = [
      { title: "Apple Inc. Reports Revolutionary AI Chip Architecture", field: "TECH", source: "Bloomberg", stocks: ["AAPL"], summary: "Apple's new custom silicon shows unprecedented performance gains. Analysts predict market expansion." },
      { title: "Google Cloud Services Secure Major Enterprise Contracts", field: "TECH", source: "Reuters", stocks: ["GOOGL"], summary: "Google announces landmark partnerships with Fortune 500 companies. Cloud division expected to drive revenue growth." },
      { title: "Microsoft Azure Growth Accelerates in Q1 Earnings", field: "TECH", source: "Financial Times", stocks: ["MSFT"], summary: "Microsoft reports strong Azure adoption rates and increased enterprise spending." },
      { title: "Apple-Google Antitrust Settlement Reshapes Tech Industry", field: "TECH", source: "CNBC", stocks: ["AAPL", "GOOGL"], summary: "Major regulatory settlement could unlock new market opportunities for both tech giants." },
      { title: "Microsoft-Google AI Competition Heats Up Markets", field: "TECH", source: "TechCrunch", stocks: ["MSFT", "GOOGL"], summary: "Competitive pressures in AI space drive both companies to increase R&D spending significantly." },
      { title: "Apple Q2 Revenue Beats Expectations Across All Segments", field: "EARNINGS", source: "MarketWatch", stocks: ["AAPL"], summary: "Strong iPhone sales and services revenue exceed analyst projections. Guidance raised for upcoming quarters." },
      { title: "Google Launches Revolutionary Quantum Computing Initiative", field: "TECH", source: "Wired", stocks: ["GOOGL"], summary: "Breakthrough in quantum computing brings practical applications closer to reality." },
      { title: "Microsoft Acquires Leading Cybersecurity Firm for $20B", field: "M&A", source: "Bloomberg", stocks: ["MSFT"], summary: "Strategic acquisition strengthens Microsoft's enterprise security portfolio." }
    ];

    const locations = ["New York", "San Francisco", "Seattle", "Mountain View", "Cupertino", "London", "Tokyo"];
    const financeSummaries = [
      "Market analysts predict significant price movements following this development.",
      "Trading volume has increased substantially as investors react to the news.",
      "Financial institutions are adjusting their portfolios based on this information.",
      "Investment firms are revising their price targets following this announcement.",
      "Stock markets are showing increased volatility in response to this development.",
      "Monotone convergence principles have been successfully applied to derivative pricing."
    ];

    // Always use finance articles
    const articleData = financeArticles[Math.floor(Math.random() * financeArticles.length)];

    const location = locations[Math.floor(Math.random() * locations.length)];
    const summary = articleData.summary || financeSummaries[Math.floor(Math.random() * financeSummaries.length)];

    return {
      id: `fake-${Date.now()}-${Math.random()}`,
      title: articleData.title,
      summary: summary,
      category: articleData.field,
      location: location,
      source: articleData.source,
      url: "https://example.com/article",
      stocks: articleData.stocks || [],
      content: summary,
      blurred: false
    };
  };

  const handleArticleClick = async (article) => {
    setSelectedArticle(article);
    // Clear previous predictions and start loading
    setPredictions(null);
    setPredictionsLoading(true);

    // Call backend to get stock predictions
    try {
      const response = await fetch(`${API_BASE_URL}/predict/article-impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: article.stocks && article.stocks.length > 0 ? article.stocks : userStocks,
          article: {
            title: article.title,
            content: article.summary,
            source: article.source
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Attach the article that was clicked to the predictions
        setPredictions({ ...data, clickedArticle: article });
      } else {
        console.error('Failed to get predictions');
        setPredictions({ error: 'Failed to fetch predictions', clickedArticle: article });
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions({ error: 'Error connecting to server', clickedArticle: article });
    } finally {
      setPredictionsLoading(false);
    }
  };

  const handleRefreshNews = async () => {
    setLoading(true);
    try {
      // Clear existing articles first
      setArticles([]);
      setPopularArticles(getDefaultArticles(mode));
      
      // Also try to fetch real news if backend is available
      try {
        await fetch(`${API_BASE_URL}/news/refresh`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: mode })
        });
        await fetchNews();
        
        // Fetch popular news and replace existing articles
        try {
          const response = await fetch(`${API_BASE_URL}/news/popular?category=all&mode=${mode}`);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              setPopularArticles(data);
            }
          }
        } catch (fetchErr) {
          console.log('Backend news fetch failed, using default articles');
        }
      } catch (err) {
        console.log('Backend news unavailable, using default articles');
      }
    } catch (error) {
      console.error('Error refreshing news:', error);
    } finally {
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
              <ModeSelector selectedMode={mode} onModeChange={setMode} />
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
                popularArticles={[...popularArticles, ...demoArticles]}
                onArticleClick={handleArticleClick}
                selectedArticle={selectedArticle}
                portfolioMinimized={portfolioMinimized}
                onPortfolioMinimize={setPortfolioMinimized}
                articlesMinimized={sidebarMinimized}
                onArticlesMinimize={setSidebarMinimized}
                predictions={predictions}
                predictionsLoading={predictionsLoading}
                predictionMinimized={predictionMinimized}
                onPredictionMinimize={setPredictionMinimized}
                portfolio={portfolio}
                stocks={stocks}
              />
              <div className="map-container">
                <MapViewer 
                  articles={articles}
                  selectedArticle={selectedArticle}
                  onArticleSelect={setSelectedArticle}
                  portfolio={portfolio}
                  stocks={stocks}
                  mode={mode}
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
