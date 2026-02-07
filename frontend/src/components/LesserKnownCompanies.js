import React, { useState, useEffect, useRef } from 'react';
import './LesserKnownCompanies.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

const LesserKnownCompanies = ({ isVisible = true, portfolio = [], onAddStock, onRemoveStock }) => {
  // Get portfolio symbols for quick lookup
  const portfolioSymbols = portfolio.map(s => s.symbol?.toUpperCase() || s.toUpperCase());
  const [companies, setCompanies] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('stocks'); // 'stocks' or 'recommendations'
  const hasFetched = useRef(false);

  // Fetch companies when component becomes visible
  useEffect(() => {
    if (isVisible && !hasFetched.current && companies.length === 0) {
      hasFetched.current = true;
      fetchCompanies();
    }
  }, [isVisible, companies.length]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching lesser-known companies from:', `${API_BASE_URL}/companies/lesser-known`);
      
      const response = await fetch(`${API_BASE_URL}/companies/lesser-known`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received companies data:', data);
      
      if (data.status === 'success') {
        setCompanies(data.companies || []);
      } else {
        setError(data.message || 'Failed to fetch companies');
      }
    } catch (err) {
      const errorMsg = err.message.includes('Failed to fetch') 
        ? 'Backend server not running. Please start it on port 5004.'
        : `Failed to connect: ${err.message}`;
      setError(errorMsg);
      console.error('Error fetching lesser-known companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    // Always refetch to get updated recommendations based on current portfolio
    try {
      setRecommendationsLoading(true);
      
      // Pass portfolio symbols to API for sell recommendations
      const portfolioParam = portfolioSymbols.length > 0 
        ? `?portfolio=${portfolioSymbols.join(',')}` 
        : '';
      
      const response = await fetch(`${API_BASE_URL}/companies/recommendations${portfolioParam}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setRecommendations(data.recommendations);
        setActiveView('recommendations');
      } else {
        console.error('Failed to fetch recommendations:', data.message);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const renderStockCard = (company) => {
    const isPositive = company.dayChange >= 0;
    const monthPositive = company.monthChange >= 0;

    return (
      <div key={company.symbol} className="stock-card">
        <div className="stock-card-left">
          <div className="stock-card-header">
            <div className="stock-symbol">{company.symbol}</div>
            <div className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '+' : ''}{company.dayChange?.toFixed(2) || '0.00'}%
            </div>
          </div>
          <div className="stock-name">{company.name}</div>
          <div className="stock-meta">
            <span className="stock-sector">{company.sector}</span>
            <span className={`month-change ${monthPositive ? 'positive' : 'negative'}`}>
              {monthPositive ? '↑' : '↓'} {Math.abs(company.monthChange || 0).toFixed(1)}% (1M)
            </span>
          </div>
        </div>
        <div className="stock-card-right">
          <div className="stock-price">${company.currentPrice?.toFixed(2) || 'N/A'}</div>
          <div className="stock-range">52W: ${company.fiftyTwoWeekLow?.toFixed(2) || 'N/A'} - ${company.fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}</div>
        </div>
      </div>
    );
  };

  const renderRecommendationBadge = (type) => {
    const badges = {
      'Strong Buy': { class: 'strong-buy', icon: '🚀' },
      'Buy': { class: 'buy', icon: '📈' },
      'Hold': { class: 'hold', icon: '⏸️' },
      'Sell': { class: 'sell', icon: '📉' }
    };
    const badge = badges[type] || badges['Hold'];
    return (
      <span className={`recommendation-badge ${badge.class}`}>
        {badge.icon} {type}
      </span>
    );
  };

  const renderTopPick = (pick, index) => (
    <div key={pick.symbol} className="top-pick-card">
      <div className="pick-rank">#{index + 1}</div>
      <div className="pick-content">
        <div className="pick-header">
          <span className="pick-symbol">{pick.symbol}</span>
          {renderRecommendationBadge(pick.recommendation)}
        </div>
        <div className="pick-name">{pick.name}</div>
        <div className="pick-prices">
          <div className="price-item">
            <span className="price-label">Entry Point</span>
            <span className="price-value">${pick.entryPoint?.toFixed(2)}</span>
          </div>
          <div className="price-arrow">→</div>
          <div className="price-item">
            <span className="price-label">Target</span>
            <span className="price-value target">${pick.targetPrice?.toFixed(2)}</span>
          </div>
          <div className="potential-return">
            <span className="return-label">Potential</span>
            <span className="return-value">{pick.potentialReturn}</span>
          </div>
        </div>
        <div className="pick-rationale">{pick.rationale}</div>
      </div>
    </div>
  );

  const renderRecommendations = () => {
    if (!recommendations) return null;

    return (
      <div className="recommendations-container">
        {/* Top Picks */}
        {recommendations.topPicks && recommendations.topPicks.length > 0 && (
          <div className="section top-picks-section">
            <h3 className="section-title">🎯 Top Picks</h3>
            <div className="top-picks-list">
              {recommendations.topPicks.map((pick, i) => renderTopPick(pick, i))}
            </div>
          </div>
        )}

        {/* Market Insights */}
        {recommendations.marketInsights && (
          <div className="section insights-section">
            <h3 className="section-title">💡 Market Insights</h3>
            <p className="market-insights">{recommendations.marketInsights}</p>
          </div>
        )}

        {/* Sector Trends */}
        {recommendations.sectorTrends && recommendations.sectorTrends.length > 0 && (
          <div className="section trends-section">
            <h3 className="section-title">📊 Sector Trends</h3>
            <div className="sector-trends">
              {recommendations.sectorTrends.map((trend, i) => (
                <div key={i} className={`trend-card ${trend.trend?.toLowerCase()}`}>
                  <div className="trend-sector">{trend.sector}</div>
                  <div className="trend-indicator">{trend.trend}</div>
                  <div className="trend-reason">{trend.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Recommendations */}
        <div className="section all-recommendations">
          <h3 className="section-title">📋 All Recommendations</h3>
          <div className="recommendation-groups">
            {recommendations.recommendations?.strongBuy?.length > 0 && (
              <div className="recommendation-group strong-buy">
                <div className="group-header">
                  <span className="group-icon">🚀</span>
                  <span className="group-title">Strong Buy</span>
                  <span className="group-count">{recommendations.recommendations.strongBuy.length}</span>
                </div>
                <div className="group-items">
                  {recommendations.recommendations.strongBuy.map((item, i) => {
                    const isInPortfolio = portfolioSymbols.includes(item.symbol?.toUpperCase());
                    return (
                      <div key={i} className="rec-item">
                        <span className="rec-symbol">{item.symbol}</span>
                        <span className="rec-rationale">{item.rationale}</span>
                        {onAddStock && !isInPortfolio && (
                          <button 
                            className="rec-action-btn add-btn"
                            onClick={() => onAddStock(item.symbol)}
                            title="Add to portfolio"
                          >
                            + Add
                          </button>
                        )}
                        {isInPortfolio && (
                          <span className="in-portfolio-badge">In Portfolio</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {recommendations.recommendations?.buy?.length > 0 && (
              <div className="recommendation-group buy">
                <div className="group-header">
                  <span className="group-icon">📈</span>
                  <span className="group-title">Buy</span>
                  <span className="group-count">{recommendations.recommendations.buy.length}</span>
                </div>
                <div className="group-items">
                  {recommendations.recommendations.buy.map((item, i) => {
                    const isInPortfolio = portfolioSymbols.includes(item.symbol?.toUpperCase());
                    return (
                      <div key={i} className="rec-item">
                        <span className="rec-symbol">{item.symbol}</span>
                        <span className="rec-rationale">{item.rationale}</span>
                        {onAddStock && !isInPortfolio && (
                          <button 
                            className="rec-action-btn add-btn"
                            onClick={() => onAddStock(item.symbol)}
                            title="Add to portfolio"
                          >
                            + Add
                          </button>
                        )}
                        {isInPortfolio && (
                          <span className="in-portfolio-badge">In Portfolio</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {recommendations.recommendations?.hold?.length > 0 && (
              <div className="recommendation-group hold">
                <div className="group-header">
                  <span className="group-icon">⏸️</span>
                  <span className="group-title">Hold</span>
                  <span className="group-count">{recommendations.recommendations.hold.length}</span>
                </div>
                <div className="group-items">
                  {recommendations.recommendations.hold.map((item, i) => (
                    <div key={i} className="rec-item">
                      <span className="rec-symbol">{item.symbol}</span>
                      <span className="rec-rationale">{item.rationale}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sell section - only show stocks that are in the user's portfolio */}
            {(() => {
              const sellItems = recommendations.recommendations?.sell?.filter(
                item => portfolioSymbols.includes(item.symbol?.toUpperCase())
              ) || [];
              return sellItems.length > 0 && (
                <div className="recommendation-group sell">
                  <div className="group-header">
                    <span className="group-icon">📉</span>
                    <span className="group-title">Sell</span>
                    <span className="group-count">{sellItems.length}</span>
                  </div>
                  <div className="group-items">
                    {sellItems.map((item, i) => (
                      <div key={i} className="rec-item">
                        <span className="rec-symbol">{item.symbol}</span>
                        <span className="rec-rationale">{item.rationale}</span>
                        {onRemoveStock && (
                          <button 
                            className="rec-action-btn remove-btn"
                            onClick={() => onRemoveStock(item.symbol)}
                            title="Remove from portfolio"
                          >
                            − Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Last Updated */}
        {recommendations.lastUpdated && (
          <div className="last-updated">
            Last updated: {recommendations.lastUpdated}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="lesser-known-companies">
      <div className="lkc-tabs">
        <button 
          className={`lkc-tab ${activeView === 'stocks' ? 'active' : ''}`}
          onClick={() => setActiveView('stocks')}
        >
          💹 Stock Prices
        </button>
        <button 
          className={`lkc-tab ${activeView === 'recommendations' ? 'active' : ''}`}
          onClick={fetchRecommendations}
          disabled={recommendationsLoading}
        >
          {recommendationsLoading ? (
            <>
              <span className="btn-spinner"></span>
              Loading...
            </>
          ) : (
            <>🤖 AI Recommendations</>
          )}
        </button>
      </div>

      {loading || (!hasFetched.current && companies.length === 0) ? (
        <div className="lkc-loading">
          <div className="loading-spinner"></div>
          <p>Loading companies...</p>
        </div>
      ) : error ? (
        <div className="lkc-error">
          <p>⚠️ {error}</p>
          <button onClick={() => { hasFetched.current = false; fetchCompanies(); }} className="retry-btn">Retry</button>
        </div>
      ) : (
        <div className="lkc-content">
          {activeView === 'stocks' ? (
            <div className="stocks-grid">
              {companies.map(company => renderStockCard(company))}
            </div>
          ) : (
            renderRecommendations()
          )}
        </div>
      )}
    </div>
  );
};

export default LesserKnownCompanies;
