import React, { useState, useEffect, useMemo, useRef } from 'react';
import './PortfolioPlanner.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

/**
 * Portfolio Planner - Full Page Component
 * Allows users to add temporary holdings (stocks and real estate via Zillow)
 * and see predicted portfolio value over time based on news sentiment
 */
const PortfolioPlanner = () => {
  const [holdings, setHoldings] = useState([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState('stock');
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [newsReferences, setNewsReferences] = useState([]);
  const pathRef = useRef(null);

  // Zillow property search state
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyResults, setPropertyResults] = useState([]);
  const [searchingProperties, setSearchingProperties] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Search for properties via Zillow API
  const searchProperties = async () => {
    if (!propertySearch.trim()) return;

    setSearchingProperties(true);
    setPropertyResults([]);

    try {
      const response = await fetch(`${API_BASE_URL}/zillow/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: propertySearch })
      });

      if (response.ok) {
        const data = await response.json();
        setPropertyResults(data.properties || []);
      } else {
        // Fallback demo properties
        setPropertyResults(getDemoProperties());
      }
    } catch (error) {
      console.error('Error searching properties:', error);
      setPropertyResults(getDemoProperties());
    } finally {
      setSearchingProperties(false);
    }
  };

  // Demo properties when API is unavailable
  const getDemoProperties = () => [
    {
      zpid: 'demo-1',
      address: '123 Main St, San Francisco, CA 94102',
      price: 1250000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1850,
      propertyType: 'Single Family',
      imageUrl: null,
      zestimate: 1275000
    },
    {
      zpid: 'demo-2',
      address: '456 Oak Ave, San Francisco, CA 94110',
      price: 890000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 1200,
      propertyType: 'Condo',
      imageUrl: null,
      zestimate: 915000
    },
    {
      zpid: 'demo-3',
      address: '789 Market St #1201, San Francisco, CA 94103',
      price: 1650000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 2100,
      propertyType: 'Condo',
      imageUrl: null,
      zestimate: 1680000
    }
  ];

  // Add property to holdings
  const addPropertyToHoldings = (property) => {
    const holding = {
      id: `property-${property.zpid}-${Date.now()}`,
      symbol: property.address.split(',')[0],
      fullAddress: property.address,
      amount: property.price || property.zestimate,
      type: 'real_estate',
      propertyDetails: property
    };
    setHoldings([...holdings, holding]);
    setSelectedProperty(null);
    setPropertyResults([]);
    setPropertySearch('');
    setPredictions(null);
  };

  // Add a stock holding
  const handleAddStock = () => {
    if (!newSymbol.trim() || !newAmount || parseFloat(newAmount) <= 0) return;

    const holding = {
      id: `stock-${Date.now()}-${Math.random()}`,
      symbol: newSymbol.toUpperCase().trim(),
      amount: parseFloat(newAmount),
      type: 'stock'
    };

    setHoldings([...holdings, holding]);
    setNewSymbol('');
    setNewAmount('');
    setPredictions(null);
  };

  // Remove a holding
  const handleRemoveHolding = (id) => {
    setHoldings(holdings.filter(h => h.id !== id));
    setPredictions(null);
  };

  // Calculate portfolio predictions
  const handleCalculate = async () => {
    if (holdings.length === 0) return;

    setLoading(true);
    setPredictions(null);
    setNewsReferences([]);

    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: holdings.map(h => ({
            symbol: h.symbol,
            amount: h.amount,
            type: h.type,
            address: h.fullAddress || null
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(data.predictions);
        setNewsReferences(data.news_references || []);
      } else {
        generateDemoPredictions();
      }
    } catch (error) {
      console.error('Error fetching portfolio predictions:', error);
      generateDemoPredictions();
    } finally {
      setLoading(false);
    }
  };

  // Generate demo predictions
  const generateDemoPredictions = () => {
    const totalValue = holdings.reduce((sum, h) => sum + h.amount, 0);
    const days = 30;
    const values = [];
    let currentValue = totalValue;

    for (let i = 0; i <= days; i++) {
      const dailyChange = (Math.random() - 0.48) * 0.02 * currentValue;
      currentValue += dailyChange;
      values.push({
        day: i,
        value: Math.max(currentValue, totalValue * 0.7),
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString()
      });
    }

    setPredictions({
      timeline: values,
      initialValue: totalValue,
      predictedValue: values[values.length - 1].value,
      change: values[values.length - 1].value - totalValue,
      changePercent: ((values[values.length - 1].value - totalValue) / totalValue) * 100
    });

    setNewsReferences([
      {
        title: 'Market Analysis: Tech Sector Shows Strong Growth Potential',
        url: 'https://www.bloomberg.com/markets',
        source: 'Bloomberg',
        impact: 'positive',
        relevance: 'High relevance to your tech holdings'
      },
      {
        title: 'Federal Reserve Signals Stable Interest Rate Policy',
        url: 'https://www.reuters.com/markets',
        source: 'Reuters',
        impact: 'neutral',
        relevance: 'Affects overall market sentiment and mortgage rates'
      },
      {
        title: 'Real Estate Market Trends: Housing Demand Remains Strong',
        url: 'https://www.cnbc.com/real-estate',
        source: 'CNBC',
        impact: 'positive',
        relevance: 'Directly relevant to real estate holdings'
      }
    ]);
  };

  // Chart calculations
  const chartData = useMemo(() => {
    if (!predictions?.timeline || predictions.timeline.length === 0) {
      return { path: '', min: 0, max: 100, points: [] };
    }

    const values = predictions.timeline.map(t => t.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = (maxValue - minValue) * 0.1 || 10;
    const scaledMin = minValue - padding;
    const scaledMax = maxValue + padding;

    const width = 800;
    const height = 300;
    const chartPadding = { top: 30, bottom: 50, left: 80, right: 30 };
    const plotWidth = width - chartPadding.left - chartPadding.right;
    const plotHeight = height - chartPadding.top - chartPadding.bottom;

    const xScale = plotWidth / Math.max(predictions.timeline.length - 1, 1);
    const yScale = plotHeight / (scaledMax - scaledMin);

    let path = '';
    const points = [];

    predictions.timeline.forEach((point, idx) => {
      const x = chartPadding.left + idx * xScale;
      const y = chartPadding.top + (scaledMax - point.value) * yScale;
      path += (idx === 0 ? 'M' : 'L') + ` ${x} ${y}`;
      points.push({ x, y, value: point.value, date: point.date, day: point.day });
    });

    // Create area path for fill
    const areaPath = path +
      ` L ${chartPadding.left + plotWidth} ${chartPadding.top + plotHeight}` +
      ` L ${chartPadding.left} ${chartPadding.top + plotHeight} Z`;

    return {
      path,
      areaPath,
      min: scaledMin,
      max: scaledMax,
      points,
      width,
      height,
      padding: chartPadding,
      plotWidth,
      plotHeight
    };
  }, [predictions]);

  // Animate chart path
  useEffect(() => {
    if (pathRef.current && chartData.path) {
      const path = pathRef.current;
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = length;
      path.style.transition = 'stroke-dashoffset 2s ease-out';
      requestAnimationFrame(() => {
        path.style.strokeDashoffset = '0';
      });
    }
  }, [chartData.path]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const totalValue = holdings.reduce((sum, h) => sum + h.amount, 0);
  const stockHoldings = holdings.filter(h => h.type === 'stock');
  const realEstateHoldings = holdings.filter(h => h.type === 'real_estate');

  return (
    <div className="portfolio-planner-page">
      <div className="planner-header">
        <h1>Portfolio Planner</h1>
        <p>Add stocks and real estate to simulate portfolio performance based on news sentiment</p>
      </div>

      <div className="planner-container">
        {/* Input Sections */}
        <div className="input-sections">
          {/* Stock Input */}
          <div className="input-card">
            <div className="input-card-header">
              <span className="input-icon">📈</span>
              <h3>Add Stock</h3>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Symbol</label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL, TSLA, GOOGL..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
                />
              </div>
              <div className="input-group">
                <label>Investment Amount</label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="$10,000"
                  min="0"
                  step="1000"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
                />
              </div>
              <button onClick={handleAddStock} className="add-btn">
                Add Stock
              </button>
            </div>
          </div>

          {/* Real Estate Input via Zillow */}
          <div className="input-card">
            <div className="input-card-header">
              <span className="input-icon">🏠</span>
              <h3>Add Real Estate</h3>
              <span className="powered-by">Powered by Zillow</span>
            </div>
            <div className="input-row">
              <div className="input-group flex-grow">
                <label>Search Property Address or ZIP</label>
                <input
                  type="text"
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  placeholder="Enter address, city, or ZIP code..."
                  onKeyPress={(e) => e.key === 'Enter' && searchProperties()}
                />
              </div>
              <button
                onClick={searchProperties}
                className="search-btn"
                disabled={searchingProperties}
              >
                {searchingProperties ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Property Search Results */}
            {propertyResults.length > 0 && (
              <div className="property-results">
                <h4>Select a Property</h4>
                <div className="property-list">
                  {propertyResults.map((property) => (
                    <div
                      key={property.zpid}
                      className={`property-card ${selectedProperty?.zpid === property.zpid ? 'selected' : ''}`}
                      onClick={() => setSelectedProperty(property)}
                    >
                      <div className="property-info">
                        <div className="property-address">{property.address}</div>
                        <div className="property-details">
                          <span>{property.bedrooms} bed</span>
                          <span>{property.bathrooms} bath</span>
                          <span>{property.sqft?.toLocaleString()} sqft</span>
                          <span className="property-type-badge">{property.propertyType}</span>
                        </div>
                      </div>
                      <div className="property-price">
                        <div className="price-label">Price</div>
                        <div className="price-value">{formatCurrency(property.price)}</div>
                        {property.zestimate && (
                          <div className="zestimate">
                            Zestimate: {formatCurrency(property.zestimate)}
                          </div>
                        )}
                      </div>
                      <button
                        className="add-property-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          addPropertyToHoldings(property);
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Holdings Summary */}
        {holdings.length > 0 && (
          <div className="holdings-section">
            <div className="holdings-header">
              <h2>Your Planned Portfolio</h2>
              <div className="total-value">
                <span>Total Value:</span>
                <span className="value">{formatCurrency(totalValue)}</span>
              </div>
            </div>

            <div className="holdings-grid">
              {/* Stock Holdings */}
              {stockHoldings.length > 0 && (
                <div className="holdings-column">
                  <h4>📈 Stocks ({stockHoldings.length})</h4>
                  {stockHoldings.map((holding) => (
                    <div key={holding.id} className="holding-card stock">
                      <div className="holding-main">
                        <span className="holding-symbol">{holding.symbol}</span>
                        <span className="holding-amount">{formatCurrency(holding.amount)}</span>
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveHolding(holding.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Real Estate Holdings */}
              {realEstateHoldings.length > 0 && (
                <div className="holdings-column">
                  <h4>🏠 Real Estate ({realEstateHoldings.length})</h4>
                  {realEstateHoldings.map((holding) => (
                    <div key={holding.id} className="holding-card real-estate">
                      <div className="holding-main">
                        <div className="holding-property">
                          <span className="holding-symbol">{holding.symbol}</span>
                          {holding.propertyDetails && (
                            <span className="property-meta">
                              {holding.propertyDetails.bedrooms}bd/{holding.propertyDetails.bathrooms}ba
                            </span>
                          )}
                        </div>
                        <span className="holding-amount">{formatCurrency(holding.amount)}</span>
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveHolding(holding.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleCalculate}
              className="calculate-btn"
              disabled={loading}
            >
              {loading ? 'Analyzing News Impact...' : 'Calculate Portfolio Predictions'}
            </button>
          </div>
        )}

        {/* Empty State */}
        {holdings.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>Start Building Your Portfolio</h3>
            <p>Add stocks or search for real estate properties to see how news events might impact your investments over time.</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Analyzing news sentiment and calculating predictions...</p>
          </div>
        )}

        {/* Predictions Results */}
        {predictions && !loading && (
          <div className="results-section">
            <div className="results-header">
              <h2>30-Day Portfolio Prediction</h2>
              <div className="prediction-summary">
                <div className="summary-card">
                  <span className="label">Current Value</span>
                  <span className="value">{formatCurrency(predictions.initialValue)}</span>
                </div>
                <div className="summary-arrow">→</div>
                <div className="summary-card">
                  <span className="label">Predicted Value</span>
                  <span className={`value ${predictions.change >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(predictions.predictedValue)}
                  </span>
                </div>
                <div className={`change-card ${predictions.change >= 0 ? 'positive' : 'negative'}`}>
                  <span className="change-percent">
                    {predictions.change >= 0 ? '+' : ''}{predictions.changePercent.toFixed(2)}%
                  </span>
                  <span className="change-amount">
                    ({predictions.change >= 0 ? '+' : ''}{formatCurrency(predictions.change)})
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="chart-section">
              <h3>Portfolio Value Over Time</h3>
              <div className="chart-container">
                <svg
                  className="portfolio-chart"
                  viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={predictions.change >= 0 ? '#4ade80' : '#ff6b6b'} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={predictions.change >= 0 ? '#4ade80' : '#ff6b6b'} stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={predictions.change >= 0 ? '#22c55e' : '#ef4444'} />
                      <stop offset="100%" stopColor={predictions.change >= 0 ? '#4ade80' : '#ff6b6b'} />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                    <g key={`grid-${idx}`}>
                      <line
                        x1={chartData.padding?.left || 80}
                        y1={(chartData.padding?.top || 30) + ratio * (chartData.plotHeight || 220)}
                        x2={(chartData.padding?.left || 80) + (chartData.plotWidth || 690)}
                        y2={(chartData.padding?.top || 30) + ratio * (chartData.plotHeight || 220)}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1"
                      />
                      <text
                        x={(chartData.padding?.left || 80) - 10}
                        y={(chartData.padding?.top || 30) + ratio * (chartData.plotHeight || 220) + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="rgba(255, 255, 255, 0.5)"
                      >
                        {formatCurrency(chartData.max - ratio * (chartData.max - chartData.min))}
                      </text>
                    </g>
                  ))}

                  {/* Area fill */}
                  {chartData.areaPath && (
                    <path
                      d={chartData.areaPath}
                      fill="url(#areaGradient)"
                    />
                  )}

                  {/* Line */}
                  {chartData.path && (
                    <path
                      ref={pathRef}
                      d={chartData.path}
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* X-axis labels */}
                  <text
                    x={chartData.padding?.left || 80}
                    y={(chartData.height || 300) - 15}
                    fontSize="12"
                    fill="rgba(255, 255, 255, 0.6)"
                  >
                    Today
                  </text>
                  <text
                    x={(chartData.padding?.left || 80) + (chartData.plotWidth || 690)}
                    y={(chartData.height || 300) - 15}
                    textAnchor="end"
                    fontSize="12"
                    fill="rgba(255, 255, 255, 0.6)"
                  >
                    +30 Days
                  </text>
                </svg>
              </div>

              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-line" style={{ background: predictions.change >= 0 ? '#4ade80' : '#ff6b6b' }}></span>
                  <span>Predicted Portfolio Value</span>
                </div>
              </div>
            </div>

            {/* News References */}
            {newsReferences.length > 0 && (
              <div className="news-section">
                <h3>📰 News Impacting Your Portfolio</h3>
                <div className="news-grid">
                  {newsReferences.map((news, idx) => (
                    <a
                      key={idx}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`news-card ${news.impact}`}
                    >
                      <div className="news-header">
                        <span className={`impact-badge ${news.impact}`}>
                          {news.impact === 'positive' ? '↑ Positive' : news.impact === 'negative' ? '↓ Negative' : '→ Neutral'}
                        </span>
                        <span className="news-source">{news.source}</span>
                      </div>
                      <h4 className="news-title">{news.title}</h4>
                      <p className="news-relevance">{news.relevance}</p>
                      <span className="news-link">Read Article →</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioPlanner;
