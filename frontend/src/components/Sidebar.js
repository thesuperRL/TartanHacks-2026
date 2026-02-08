import React, { useState, useEffect } from 'react';
import ArticlesList from './ArticlesList';
import ImportantArticlesList from './ImportantArticlesList';
import PortfolioOverlay from './PortfolioOverlay';
import PredictionResults from './PredictionResults';
import DailyDigestVideo from './DailyDigestVideo';
import LesserKnownCompanies from './LesserKnownCompanies';
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
  stocks,
  activePanel = 'news', // 'news' or 'companies'
  onAddStock,
  onRemoveStock,
  mode = 'economic' // 'economic' or 'political'
}) => {
  const [headerHeight, setHeaderHeight] = useState(80);
  const [availableHeight, setAvailableHeight] = useState(window.innerHeight - 80);
  const [importantArticlesMinimized, setImportantArticlesMinimized] = useState(false);
  const [dailyDigestMinimized, setDailyDigestMinimized] = useState(false);
  const [lesserKnownMinimized, setLesserKnownMinimized] = useState(false); // Start expanded for companies view

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

  // Render Economic mode sidebar content (Important Articles, Daily Digest, Portfolio)
  const renderEconomicSidebar = () => (
    <>
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

      {/* Daily Digest Video Section */}
      <div className={`sidebar-section ${dailyDigestMinimized ? 'minimized' : ''}`}>
        <div
          className="sidebar-section-header"
          onClick={() => setDailyDigestMinimized(!dailyDigestMinimized)}
        >
          <div className="section-title">
            <span className="section-icon">📹</span>
            <span>Daily Digest</span>
          </div>
          <button
            className="section-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setDailyDigestMinimized(!dailyDigestMinimized);
            }}
            title={dailyDigestMinimized ? 'Expand' : 'Minimize'}
          >
            {dailyDigestMinimized ? '□' : '−'}
          </button>
        </div>
        <div className={`sidebar-section-content ${dailyDigestMinimized ? 'minimized' : ''}`}>
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

      {/* Predictions Section - Only in economic mode */}
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
    </>
  );

  // Render Political mode sidebar content (only general Articles)
  const renderPoliticalSidebar = () => (
    <>
      {/* Articles Section - Full height for political mode */}
      <div className="sidebar-section political-articles">
        <div 
          className="sidebar-section-header"
          onClick={() => onArticlesMinimize(!articlesMinimized)}
        >
          <div className="section-title">
            <span className="section-icon">🏛️</span>
            <span>Political Articles</span>
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
    </>
  );

  // Render News sidebar based on mode
  const renderNewsSidebar = () => {
    if (mode === 'political') {
      return renderPoliticalSidebar();
    }
    return renderEconomicSidebar();
  };

  // Render Companies sidebar content
  const renderCompaniesSidebar = () => (
    <>
      {/* Emerging Opportunities Section - Full width for companies view */}
      <div className={`sidebar-section ${lesserKnownMinimized ? 'minimized' : ''}`}>
        <div 
          className="sidebar-section-header"
          onClick={() => setLesserKnownMinimized(!lesserKnownMinimized)}
        >
          <div className="section-title">
            <span className="section-icon">🔍</span>
            <span>Emerging Opportunities</span>
          </div>
          <button 
            className="section-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setLesserKnownMinimized(!lesserKnownMinimized);
            }}
            title={lesserKnownMinimized ? 'Expand' : 'Minimize'}
          >
            {lesserKnownMinimized ? '□' : '−'}
          </button>
        </div>
        <div className={`sidebar-section-content ${lesserKnownMinimized ? 'minimized' : ''}`}>
          <LesserKnownCompanies 
            isVisible={activePanel === 'companies' && !lesserKnownMinimized}
            portfolio={portfolio}
            onAddStock={onAddStock}
            onRemoveStock={onRemoveStock}
          />
        </div>
      </div>

      {/* Portfolio Section - Always show in companies view */}
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
    </>
  );

  return (
    <div className="sidebar" style={{ top: `${headerHeight}px`, height: `${availableHeight}px` }}>
      {activePanel === 'news' ? renderNewsSidebar() : renderCompaniesSidebar()}
    </div>
  );
};

export default Sidebar;
