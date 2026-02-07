import React, { useState, useEffect } from 'react';
import PopularArticlesList from './PopularArticlesList';
import PortfolioOverlay from './PortfolioOverlay';
import PredictionResults from './PredictionResults';
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
  onPredictionMinimize
}) => {
  const [headerHeight, setHeaderHeight] = useState(80);
  const [availableHeight, setAvailableHeight] = useState(window.innerHeight - 80);

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
      {/* Popular Articles Section */}
      <div className={`sidebar-section ${articlesMinimized ? 'minimized' : ''}`}>
        <div 
          className="sidebar-section-header"
          onClick={() => onArticlesMinimize(!articlesMinimized)}
        >
          <div className="section-title">
            <span className="section-icon">🔥</span>
            <span>Popular Articles</span>
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
        {!articlesMinimized && (
          <div className="sidebar-section-content">
            <PopularArticlesList 
              articles={popularArticles}
              onArticleClick={onArticleClick}
              selectedArticle={selectedArticle}
            />
          </div>
        )}
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
        {!portfolioMinimized && (
          <div className="sidebar-section-content">
            <PortfolioOverlay isWindow={true} />
          </div>
        )}
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
          {!predictionMinimized && (
            <div className="sidebar-section-content">
              <PredictionResults 
                predictions={predictions}
                loading={predictionsLoading}
                article={selectedArticle}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
