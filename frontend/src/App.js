import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import LogoAnimation from './components/LogoAnimation';
import PredictionResults from './components/PredictionResults';
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
  const [predictionMinimized, setPredictionMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [userStocks, setUserStocks] = useState(['TSLA']);
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

  const generateFakeArticle = () => {
    const mathArticles = [
      { title: "Cauchy Sequences in Topological Spaces: A Breakthrough in Non-Euclidean Convergence", field: "ANALYSIS", source: "Math Quarterly Digest" },
      { title: "Lebesgue Measure Theory Disrupts Classical Mathematical Markets", field: "MATH THEORY", source: "Journal of Pure Math" },
      { title: "Uniform Continuity and Lipschitz Functions: New Applications in Quantitative Trading", field: "ANALYSIS", source: "Math Quarterly Digest" },
      { title: "Monotone Convergence Theorem Proves Predictive for Stock Volatility", field: "MATH THEORY", source: "Computational Math Review" },
      { title: "Riemann Integrals Meet Financial Derivatives: Surprising Connections", field: "ANALYSIS", source: "Applied Mathematics Today" },
      { title: "Borel σ-Algebra Enables Revolutionary Risk Assessment Methodology", field: "MATH THEORY", source: "Journal of Pure Math" },
      { title: "Boundedness and Compactness Principles Shape New Portfolio Theory", field: "ANALYSIS", source: "Math Quarterly Digest" },
      { title: "Infimum and Supremum Concepts Redefine Price Floor Analysis", field: "MATH THEORY", source: "Computational Math Review" }
    ];

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
    const mathSummaries = [
      "Researchers discover that Lebesgue measurable spaces can predict market behavior with surprising accuracy.",
      "A new theorem about uniform continuity has revolutionized how we think about price stability.",
      "Using Cauchy sequences and convergence theory, mathematicians have developed a novel portfolio approach.",
      "The application of Borel σ-algebra to financial risk assessment has yielded unexpected results.",
      "Lipschitz continuous functions prove to be better predictors of market trends than previously thought.",
      "Monotone convergence principles have been successfully applied to derivative pricing."
    ];

    const useFinance = Math.random() < 0.6;
    let articleData;

    if (useFinance) {
      articleData = financeArticles[Math.floor(Math.random() * financeArticles.length)];
    } else {
      const mathArticle = mathArticles[Math.floor(Math.random() * mathArticles.length)];
      articleData = { ...mathArticle, stocks: [] };
    }

    const location = locations[Math.floor(Math.random() * locations.length)];
    const summary = articleData.summary || mathSummaries[Math.floor(Math.random() * mathSummaries.length)];

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
      // Add fake articles (mix of math and finance)
      const newArticles = [
        generateFakeArticle(),
        generateFakeArticle()
      ];
      setPopularArticles(prev => [...newArticles, ...prev.slice(0, 3)]);
      
      // Also try to fetch real news if backend is available
      try {
        await fetch(`${API_BASE_URL}/news/refresh`, { method: 'POST' });
        await fetchNews();
        await fetchPopularNews();
      } catch (err) {
        console.log('Backend news unavailable, using generated articles');
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
                predictions={predictions}
                predictionsLoading={predictionsLoading}
                predictionMinimized={predictionMinimized}
                onPredictionMinimize={setPredictionMinimized}
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
