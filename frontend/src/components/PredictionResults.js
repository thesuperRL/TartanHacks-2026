import React from 'react';
import StockPriceChart from './StockPriceChart';
import './PredictionResults.css';

/**
 * PredictionResults Component
 * Displays stock price predictions from the article impact analysis
 */
const PredictionResults = ({ predictions, loading, article }) => {
  if (!predictions && !loading) {
    return null;
  }

  // Show loading state
  if (loading && !predictions) {
    return (
      <div className="prediction-results">
        <div className="results-header">
          <h2>Analyzing article impact...</h2>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Show error if predictions have an error
  if (predictions?.error) {
    return (
      <div className="prediction-results">
        <div className="results-header">
          <h2>Stock Analysis</h2>
        </div>
        <div className="error-message">
          {predictions.error}
        </div>
      </div>
    );
  }

  // No data available
  if (!predictions || !predictions.data || !predictions.data.predictions) {
    return (
      <div className="prediction-results">
        <div className="results-header">
          <h2>Stock Analysis</h2>
        </div>
        <div className="error-message">
          No stock predictions available for this article.
        </div>
      </div>
    );
  }

  const { predictions: predictionData, relevant_assets_count } = predictions.data;
  const assets = Object.keys(predictionData);
  // Use the clicked article from predictions, fallback to the article prop
  const displayArticle = predictions.clickedArticle || article;

  return (
    <div className="prediction-results">
      <div className="results-header">
        <h2>Stock Impact Analysis</h2>
        <p className="subtitle">{relevant_assets_count} relevant asset{relevant_assets_count !== 1 ? 's' : ''} identified</p>
      </div>

      <div className="predictions-grid">
        {assets.map((symbol) => {
          const pred = predictionData[symbol];
          return (
            <div key={symbol} className="prediction-card">
              <StockPriceChart
                symbol={symbol}
                historicalPrices={pred.historical_prices || []}
                predictedPrices={pred.predicted_prices || []}
                explanation={pred.explanation || ''}
              />
            </div>
          );
        })}
      </div>

      {/* Article details intentionally omitted to keep chart area focused on the stock */}
    </div>
  );
};

export default PredictionResults;
