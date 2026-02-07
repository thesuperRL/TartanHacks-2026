import React, { useState, useEffect } from 'react';
import './CompaniesPanel.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

const CompaniesPanel = ({ onCompanySelect, selectedCompany }) => {
  const [topCompanies, setTopCompanies] = useState([]);
  const [emergingCompanies, setEmergingCompanies] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('top');
  const [hoveredCompany, setHoveredCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState({});

  useEffect(() => {
    fetchTopCompanies();
  }, []);

  const fetchTopCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/top`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setTopCompanies(data.companies || []);
        } else {
          setError(data.message || 'Failed to load companies');
        }
      } else {
        setError('Failed to connect to server');
      }
    } catch (err) {
      console.error('Error fetching top companies:', err);
      setError('Network error. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmergingCompanies = async () => {
    if (emergingCompanies.length > 0) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/emerging`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setEmergingCompanies(data.companies || []);
        }
      }
    } catch (err) {
      console.error('Error fetching emerging companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    if (recommendations) return;
    setRecommendationsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/recommendations`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setRecommendations(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const fetchCompanyDetails = async (symbol) => {
    if (companyDetails[symbol]) return;
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setCompanyDetails(prev => ({
            ...prev,
            [symbol]: data.company
          }));
        }
      }
    } catch (err) {
      console.error(`Error fetching details for ${symbol}:`, err);
    }
  };

  const handleCompanyHover = (company) => {
    setHoveredCompany(company);
    if (company) {
      fetchCompanyDetails(company.symbol);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'emerging' && emergingCompanies.length === 0) {
      fetchEmergingCompanies();
    }
    if (tab === 'recommendations' && !recommendations) {
      fetchRecommendations();
    }
  };

  const companies = activeTab === 'top' ? topCompanies : emergingCompanies;
  const hoveredDetails = hoveredCompany ? companyDetails[hoveredCompany.symbol] : null;

  const formatNumber = (num) => {
    if (!num) return '—';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="companies-panel">
      <div className="companies-header">
        <h3>Companies</h3>
        <div className="companies-tabs">
          <button
            className={`tab ${activeTab === 'top' ? 'active' : ''}`}
            onClick={() => handleTabChange('top')}
          >
            Top 20
          </button>
          <button
            className={`tab ${activeTab === 'emerging' ? 'active' : ''}`}
            onClick={() => handleTabChange('emerging')}
          >
            Emerging
          </button>
          <button
            className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => handleTabChange('recommendations')}
          >
            Picks
          </button>
        </div>
      </div>

      {error && (
        <div className="companies-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchTopCompanies}>Retry</button>
        </div>
      )}

      {loading && !error ? (
        <div className="companies-loading">
          <div className="loading-spinner" />
          <p>Loading companies...</p>
        </div>
      ) : activeTab === 'recommendations' ? (
        <div className="recommendations-container">
          {recommendationsLoading ? (
            <div className="companies-loading">
              <div className="loading-spinner" />
              <p>Generating recommendations...</p>
            </div>
          ) : recommendations ? (
            <>
              <div className="market-outlook">
                <span className="outlook-label">Market Outlook:</span>
                <span className="outlook-text">{recommendations.market_outlook}</span>
              </div>
              <div className="recommendations-list">
                {recommendations.recommendations?.map((rec) => (
                  <div key={rec.symbol} className={`recommendation-card ${rec.recommendation.toLowerCase()}`}>
                    <div className="rec-header">
                      <div className="rec-symbol-info">
                        <span className="rec-symbol">{rec.symbol}</span>
                        <span className="rec-price">${rec.current_price?.toFixed(2) || '—'}</span>
                      </div>
                      <span className={`rec-badge ${rec.recommendation.toLowerCase()}`}>
                        {rec.recommendation}
                      </span>
                    </div>
                    <div className="rec-name">{rec.name}</div>
                    <div className="rec-reasoning">{rec.reasoning}</div>
                    <div className="rec-meta">
                      <span className={`risk ${rec.risk_level.toLowerCase()}`}>
                        {rec.risk_level} Risk
                      </span>
                      <span className="confidence">
                        Confidence: {rec.confidence}/10
                      </span>
                    </div>
                    <div className="rec-audience">{rec.target_audience}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="companies-empty">
              <p>Click to generate recommendations</p>
            </div>
          )}
        </div>
      ) : (
        <div className="companies-list-container">
          <div className="companies-list">
            {companies.map((company) => (
              <div
                key={company.symbol}
                className={`company-item ${selectedCompany?.symbol === company.symbol ? 'selected' : ''} ${hoveredCompany?.symbol === company.symbol ? 'hovered' : ''}`}
                onClick={() => onCompanySelect?.(company)}
                onMouseEnter={() => handleCompanyHover(company)}
                onMouseLeave={() => setHoveredCompany(null)}
              >
                <div className="company-main">
                  <span className="company-symbol">{company.symbol}</span>
                  <span className="company-name">{company.name}</span>
                  {company.city && (
                    <span className="company-location">{company.city}, {company.country}</span>
                  )}
                </div>
                <div className="company-price">
                  <span className="price">
                    {company.current_price ? `$${company.current_price.toFixed(2)}` : '—'}
                  </span>
                  <span className={`change ${(company.change_percent || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {company.change_percent >= 0 ? '+' : ''}{company.change_percent?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hoveredCompany && hoveredDetails && (
            <div className="company-preview">
              <div className="preview-header">
                <span className="preview-symbol">{hoveredCompany.symbol}</span>
                <span className="preview-name">{hoveredCompany.name}</span>
              </div>
              
              {hoveredDetails.stock_data?.weekly_prices?.length > 0 && (
                <div className="mini-chart">
                  <svg viewBox="0 0 200 60" preserveAspectRatio="none">
                    {(() => {
                      const prices = hoveredDetails.stock_data.weekly_prices.map(w => w.price);
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      const range = max - min || 1;
                      const points = prices.map((p, i) => {
                        const x = (i / (prices.length - 1)) * 200;
                        const y = 55 - ((p - min) / range) * 50;
                        return `${x},${y}`;
                      }).join(' ');
                      const isPositive = prices[prices.length - 1] >= prices[0];
                      return (
                        <polyline
                          fill="none"
                          stroke={isPositive ? '#4ade80' : '#ff6b6b'}
                          strokeWidth="2"
                          points={points}
                        />
                      );
                    })()}
                  </svg>
                  <div className="chart-label">1 Year Performance</div>
                </div>
              )}

              {hoveredDetails.info && (
                <div className="preview-info">
                  {hoveredDetails.info.market_cap && (
                    <div className="info-row">
                      <span>Market Cap</span>
                      <span>{formatNumber(hoveredDetails.info.market_cap)}</span>
                    </div>
                  )}
                  {hoveredDetails.info.revenue && (
                    <div className="info-row">
                      <span>Revenue</span>
                      <span>{formatNumber(hoveredDetails.info.revenue)}</span>
                    </div>
                  )}
                  {hoveredDetails.info.pe_ratio && (
                    <div className="info-row">
                      <span>P/E Ratio</span>
                      <span>{hoveredDetails.info.pe_ratio.toFixed(1)}</span>
                    </div>
                  )}
                  {hoveredDetails.info.sector && (
                    <div className="info-row">
                      <span>Sector</span>
                      <span>{hoveredDetails.info.sector}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompaniesPanel;
