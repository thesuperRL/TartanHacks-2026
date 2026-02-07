import React, { useState, useEffect } from 'react';
import ArticlesList from './ArticlesList';
import ImportantArticlesList from './ImportantArticlesList';
import PortfolioOverlay from './PortfolioOverlay';
import PredictionResults from './PredictionResults';
import DailyDigestVideo from './DailyDigestVideo';
import './Sidebar.css';

const Sidebar = ({
  popularArticles,
  onArticleClick,
  selectedArticle,
  portfolioMinimized,
  onPortfolioMinimize,
  articlesMinimized,
  onArticlesMinimize,
  predictions,
  predictionsLoading,
  predictionMinimized,
  onPredictionMinimize,
  portfolio,
  stocks
}) => {
  const [headerHeight, setHeaderHeight] = useState(80);
  const [availableHeight, setAvailableHeight] = useState(window.innerHeight - 80);
  const [importantArticlesMinimized, setImportantArticlesMinimized] = useState(false);

  useEffect(() => {
    // Calculate header height dynamically
    const updateDimensions = () => {
      const header = document.querySelector('.app-header');
      if (header) {
        const height = header.offsetHeight;
        setHeaderHeight(height);
        setAvailableHeight(window.innerHeight - height);
      } else {
        setAvailableHeight(window.innerHeight - 80);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="sidebar" style={{ top: `${headerHeight}px`, height: `${availableHeight}px` }}>
      {/* Important Articles Section */}
      <div className={`sidebar-section ${importantArticlesMinimized ? 'minimized' : ''}`}>
        <div
          className="sidebar-section-header"
          onClick={() => setImportantArticlesMinimized(!importantArticlesMinimized)}
        >
          <div className="section-title">
            <span className="section-icon">⚠️</span>
            <span>Important Articles</span>
          </div>
          <button
            className="section-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setImportantArticlesMinimized(!importantArticlesMinimized);
            }}
            title={importantArticlesMinimized ? 'Expand' : 'Minimize'}
          >
            {importantArticlesMinimized ? '□' : '−'}
          </button>
        </div>
        <div className={`sidebar-section-content ${importantArticlesMinimized ? 'minimized' : ''}`}>
          <ImportantArticlesList
            articles={popularArticles}
            stocks={stocks}
            portfolio={portfolio}
            onArticleClick={onArticleClick}
            selectedArticle={selectedArticle}
          />
        </div>
      </div>

      {/* Articles Section */}
      <div className={`sidebar-section ${articlesMinimized ? 'minimized' : ''}`}>
        <div
          className="sidebar-section-header"
          onClick={() => onArticlesMinimize(!articlesMinimized)}
        >
          <div className="section-title">
            <span className="section-icon">📰</span>
            <span>Articles</span>
          </div>
          <button
            className="section-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onArticlesMinimize(!articlesMinimized);
            }}
            title={articlesMinimized ? 'Expand' : 'Minimize'}
          >
            {articlesMinimized ? '□' : '−'}
          </button>
        </div>
        <div className={`sidebar-section-content ${articlesMinimized ? 'minimized' : ''}`}>
          <ArticlesList
            articles={popularArticles}
            onArticleClick={onArticleClick}
            selectedArticle={selectedArticle}
          />
        </div>
      </div>

      {/* Daily Digest Video Section */}
      <div className={`sidebar-section ${false ? 'minimized' : ''}`}>
        <div className="sidebar-section-header">
          <div className="section-title">
            <span className="section-icon">📹</span>
            <span>Daily Digest</span>
          </div>
        </div>
        <div className="sidebar-section-content">
          <DailyDigestVideo
            portfolio={portfolio}
            stocks={stocks}
            predictions={predictions}
          />
        </div>
      </div>

      {/* Portfolio Section */}
      <div className={`sidebar-section ${portfolioMinimized ? 'minimized' : ''}`}>
        <div
          className="sidebar-section-header"
          onClick={() => onPortfolioMinimize(!portfolioMinimized)}
        >
          <div className="section-title">
            <span className="section-icon">💼</span>
            <span>Your Portfolio</span>
          </div>
          <button
            className="section-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onPortfolioMinimize(!portfolioMinimized);
            }}
            title={portfolioMinimized ? 'Expand' : 'Minimize'}
          >
            {portfolioMinimized ? '□' : '−'}
          </button>
        </div>
        <div className={`sidebar-section-content ${portfolioMinimized ? 'minimized' : ''}`}>
          <PortfolioOverlay isWindow={true} />
        </div>
      </div>

      {/* Predictions Section */}
      {(predictions || predictionsLoading) && (
        <div className={`sidebar-section ${predictionMinimized ? 'minimized' : ''}`}>
          <div
            className="sidebar-section-header"
            onClick={() => onPredictionMinimize(!predictionMinimized)}
          >
            <div className="section-title">
              <span className="section-icon">📊</span>
              <span>Stock Predictions</span>
            </div>
            <button
              className="section-toggle"
              onClick={(e) => {
                e.stopPropagation();
                onPredictionMinimize(!predictionMinimized);
              }}
              title={predictionMinimized ? 'Expand' : 'Minimize'}
            >
              {predictionMinimized ? '□' : '−'}
            </button>
          </div>
          <div className={`sidebar-section-content ${predictionMinimized ? 'minimized' : ''}`}>
            <PredictionResults
              predictions={predictions}
              loading={predictionsLoading}
              article={selectedArticle}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
