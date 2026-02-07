import React, { useState, useEffect } from 'react';
import './CompanyHoverChart.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

const CompanyHoverChart = ({ symbol, name, onClose, isPinned = false }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('price');

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching chart data for ${symbol} from: ${API_BASE_URL}/companies/${symbol}/chart`);
        
        const response = await fetch(`${API_BASE_URL}/companies/${symbol}/chart`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Chart data received:', data);
        
        if (data.status === 'success') {
          setChartData(data.data);
        } else {
          setError(data.message || 'Failed to fetch data');
        }
      } catch (err) {
        const errorMsg = err.message.includes('Failed to fetch') 
          ? 'Backend server not running on port 5004'
          : `Connection error: ${err.message}`;
        setError(errorMsg);
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchChartData();
    }
  }, [symbol]);

  const renderPriceChart = () => {
    if (!chartData?.weeklyPrices || chartData.weeklyPrices.length === 0) {
      return <div className="no-data">No price data available</div>;
    }

    const prices = chartData.weeklyPrices.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const width = 400;
    const height = 180;
    const padding = { top: 20, right: 40, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Generate path for the line chart
    const points = chartData.weeklyPrices.map((d, i) => {
      const x = padding.left + (i / (chartData.weeklyPrices.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.price - minPrice) / priceRange) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    const pathD = `M ${points.replace(/ /g, ' L ')}`;
    
    // Create gradient area
    const areaPoints = chartData.weeklyPrices.map((d, i) => {
      const x = padding.left + (i / (chartData.weeklyPrices.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.price - minPrice) / priceRange) * chartHeight;
      return `${x},${y}`;
    });
    
    const areaPath = `M ${padding.left},${padding.top + chartHeight} L ${areaPoints.join(' L ')} L ${padding.left + chartWidth},${padding.top + chartHeight} Z`;

    const currentPrice = prices[prices.length - 1];
    const startPrice = prices[0];
    const changePercent = ((currentPrice - startPrice) / startPrice * 100).toFixed(2);
    const isPositive = changePercent >= 0;

    return (
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-title">Stock Price (1 Year)</div>
          <div className={`chart-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{changePercent}%
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="price-chart-svg">
          <defs>
            <linearGradient id={`priceGradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={padding.top + ratio * chartHeight}
                x2={padding.left + chartWidth}
                y2={padding.top + ratio * chartHeight}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 8}
                y={padding.top + ratio * chartHeight + 4}
                fill="rgba(255,255,255,0.5)"
                fontSize="10"
                textAnchor="end"
              >
                ${(maxPrice - ratio * priceRange).toFixed(0)}
              </text>
            </g>
          ))}
          
          {/* Area fill */}
          <path d={areaPath} fill={`url(#priceGradient-${symbol})`} />
          
          {/* Price line */}
          <path
            d={pathD}
            fill="none"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Current price dot */}
          <circle
            cx={padding.left + chartWidth}
            cy={padding.top + chartHeight - ((currentPrice - minPrice) / priceRange) * chartHeight}
            r="5"
            fill={isPositive ? '#10b981' : '#ef4444'}
            stroke="white"
            strokeWidth="2"
          />
        </svg>
        <div className="chart-stats">
          <div className="stat">
            <span className="stat-label">Current</span>
            <span className="stat-value">${currentPrice.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">52W High</span>
            <span className="stat-value">${chartData.yearHigh?.toFixed(2) || 'N/A'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">52W Low</span>
            <span className="stat-value">${chartData.yearLow?.toFixed(2) || 'N/A'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderRevenueChart = () => {
    if (!chartData?.quarterlyRevenue || chartData.quarterlyRevenue.length === 0) {
      return <div className="no-data">No revenue data available</div>;
    }

    const revenues = chartData.quarterlyRevenue.map(d => d.revenue);
    const maxRevenue = Math.max(...revenues);
    
    const width = 400;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 40, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = (chartWidth / chartData.quarterlyRevenue.length) * 0.7;
    const gap = (chartWidth / chartData.quarterlyRevenue.length) * 0.3;

    return (
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-title">Quarterly Revenue</div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="revenue-chart-svg">
          <defs>
            <linearGradient id={`revenueGradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          {chartData.quarterlyRevenue.map((d, i) => {
            const barHeight = (d.revenue / maxRevenue) * chartHeight;
            const x = padding.left + i * (barWidth + gap) + gap / 2;
            const y = padding.top + chartHeight - barHeight;
            
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={`url(#revenueGradient-${symbol})`}
                  rx="4"
                />
                <text
                  x={x + barWidth / 2}
                  y={height - 8}
                  fill="rgba(255,255,255,0.6)"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {d.date?.substring(0, 7) || d.quarter}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  fill="rgba(255,255,255,0.8)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {d.revenueFormatted}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className={`company-hover-chart ${isPinned ? 'pinned' : ''}`}>
      <div className="chart-popup-header">
        <div className="company-info">
          <h3>{symbol}</h3>
          <p>{name}</p>
          <div className="badges-row">
            {chartData?.sector && <span className="sector-badge">{chartData.sector}</span>}
            {isPinned && <span className="pinned-badge">Click X to close</span>}
          </div>
        </div>
        <button className="close-btn" onClick={onClose} title="Close">×</button>
      </div>
      
      {loading ? (
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Loading chart data...</p>
        </div>
      ) : error ? (
        <div className="chart-error">
          <p>⚠️ {error}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="chart-tabs">
            <button 
              className={`tab-btn ${activeTab === 'price' ? 'active' : ''}`}
              onClick={() => setActiveTab('price')}
            >
              📈 Price
            </button>
            <button 
              className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
              onClick={() => setActiveTab('revenue')}
            >
              💰 Revenue
            </button>
          </div>
          
          <div className="chart-content">
            {activeTab === 'price' ? renderPriceChart() : renderRevenueChart()}
          </div>
        </>
      )}
    </div>
  );
};

export default CompanyHoverChart;
