import React, { useMemo } from 'react';
import './StockPriceChart.css';

/**
 * Minimalist stock price chart component
 * Displays historical prices in blue and predicted prices in red
 * 
 * @param {Object} props
 * @param {Array<number>} props.historicalPrices - Historical price data
 * @param {Array<number>} props.predictedPrices - Predicted price data
 * @param {string} props.symbol - Stock symbol (e.g., 'AAPL')
 * @param {string} props.explanation - Brief explanation of the prediction
 */
const StockPriceChart = ({ 
  historicalPrices = [], 
  predictedPrices = [], 
  symbol = 'STOCK',
  explanation = ''
}) => {
  const { paths, min, max, xScale, yScale } = useMemo(() => {
    const allPrices = [...historicalPrices, ...predictedPrices].filter(p => p !== null && p !== undefined && !isNaN(p));
    
    if (allPrices.length === 0) {
      return { paths: { historical: '', predicted: '' }, min: 0, max: 100, xScale: 1, yScale: 1 };
    }

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const pricePadding = (maxPrice - minPrice) * 0.1 || 10;
    const scaledMin = minPrice - pricePadding;
    const scaledMax = maxPrice + pricePadding;

    // SVG dimensions
    const width = 400;
    const height = 200;
    const padding = { top: 20, bottom: 40, left: 40, right: 20 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Scale functions
    const xS = plotWidth / Math.max(historicalPrices.length + predictedPrices.length - 1, 1);
    const yS = plotHeight / (scaledMax - scaledMin);

    // Generate path for historical prices
    let historicalPath = '';
    historicalPrices.forEach((price, idx) => {
      if (price === null || price === undefined || isNaN(price)) return;
      const x = padding.left + idx * xS;
      const y = padding.top + (scaledMax - price) * yS;
      historicalPath += (idx === 0 ? 'M' : 'L') + ` ${x} ${y}`;
    });

    // Generate path for predicted prices (offset to start from last historical)
    let predictedPath = '';
    const startIdx = historicalPrices.length - 1;
    predictedPrices.forEach((price, idx) => {
      if (price === null || price === undefined || isNaN(price)) return;
      const x = padding.left + (startIdx + idx) * xS;
      const y = padding.top + (scaledMax - price) * yS;
      predictedPath += (idx === 0 ? 'M' : 'L') + ` ${x} ${y}`;
    });

    return {
      paths: { historical: historicalPath, predicted: predictedPath },
      min: scaledMin,
      max: scaledMax,
      xScale: xS,
      yScale: yS,
      plotDimensions: { width, height, padding, plotWidth, plotHeight }
    };
  }, [historicalPrices, predictedPrices]);

  const width = 400;
  const height = 200;
  const padding = { top: 20, bottom: 40, left: 40, right: 20 };

  // Format price for display
  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const currentPrice = historicalPrices[historicalPrices.length - 1] || 0;
  const predictedFinal = predictedPrices[predictedPrices.length - 1] || currentPrice;
  const change = predictedFinal - currentPrice;
  const changePercent = currentPrice !== 0 ? (change / currentPrice) * 100 : 0;

  return (
    <div className="stock-price-chart">
      <div className="chart-header">
        <div className="chart-title">
          <span className="symbol">{symbol}</span>
          <span className={`change ${change >= 0 ? 'positive' : 'negative'}`}>
            {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        </div>
        <div className="current-price">{formatPrice(currentPrice)}</div>
      </div>

      <svg
        className="chart-svg"
        width={width}
        height={height}
        viewBox={`-10 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMid meet"
      >
        {/* Grid lines */}
        <defs>
          <linearGradient id="historyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#4a9eff', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#4a9eff', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id="predictGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#ff6b6b', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#ff6b6b', stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
          <line
            key={`grid-${idx}`}
            x1={padding.left}
            y1={padding.top + ratio * (height - padding.top - padding.bottom)}
            x2={width - padding.right}
            y2={padding.top + ratio * (height - padding.top - padding.bottom)}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Historical prices path with fill */}
        {paths.historical && (
          <>
            <path
              d={paths.historical}
              stroke="#4a9eff"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Predicted prices path */}
        {paths.predicted && (
          <path
            d={paths.predicted}
            stroke="#ff6b6b"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="none"
          />
        )}

        {/* Axis labels */}
        <text x={padding.left - 5} y={padding.top + 5} textAnchor="end" fontSize="11" fill="rgba(255, 255, 255, 0.5)">
          {formatPrice(max)}
        </text>
        <text x={padding.left - 5} y={height - padding.bottom + 5} textAnchor="end" fontSize="11" fill="rgba(255, 255, 255, 0.5)">
          {formatPrice(min)}
        </text>
      </svg>

      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#4a9eff' }}></span>
          <span className="legend-label">Historical</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ff6b6b' }}></span>
          <span className="legend-label">Predicted</span>
        </div>
      </div>

      {explanation && (
        <div className="chart-explanation">
          {explanation}
        </div>
      )}
    </div>
  );
};

export default StockPriceChart;
