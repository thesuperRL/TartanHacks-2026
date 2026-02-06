import React, { useState, useEffect } from 'react';
import './PortfolioOverlay.css';

const PortfolioOverlay = () => {
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  // Load stocks from localStorage
  useEffect(() => {
    const savedStocks = localStorage.getItem('watchedStocks');
    if (savedStocks) {
      setStocks(JSON.parse(savedStocks));
    } else {
      // Default stocks
      setStocks([
        { symbol: 'AAPL', name: 'Apple Inc.', price: 0, change: 0 },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 0, change: 0 },
        { symbol: 'MSFT', name: 'Microsoft Corp.', price: 0, change: 0 },
      ]);
    }
  }, []);

  // Save stocks to localStorage
  useEffect(() => {
    if (stocks.length > 0) {
      localStorage.setItem('watchedStocks', JSON.stringify(stocks));
    }
  }, [stocks]);

  // Mock stock price updates (in production, use a real API)
  useEffect(() => {
    const updatePrices = () => {
      setStocks(prevStocks => 
        prevStocks.map(stock => ({
          ...stock,
          price: stock.price || (Math.random() * 500 + 50).toFixed(2),
          change: (Math.random() * 10 - 5).toFixed(2)
        }))
      );
    };

    updatePrices();
    const interval = setInterval(updatePrices, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddStock = () => {
    if (newStock.trim() && !stocks.find(s => s.symbol === newStock.toUpperCase())) {
      setStocks([
        ...stocks,
        {
          symbol: newStock.toUpperCase(),
          name: newStock.toUpperCase(),
          price: 0,
          change: 0
        }
      ]);
      setNewStock('');
    }
  };

  const handleRemoveStock = (symbol) => {
    setStocks(stocks.filter(s => s.symbol !== symbol));
  };

  if (!isOpen) {
    return (
      <button className="portfolio-toggle" onClick={() => setIsOpen(true)}>
        💼 Portfolio
      </button>
    );
  }

  return (
    <div className="portfolio-overlay">
      <div className="portfolio-header">
        <h3>💼 Your Portfolio</h3>
        <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
      </div>

      <div className="portfolio-content">
        <div className="add-stock">
          <input
            type="text"
            placeholder="Add stock symbol (e.g., TSLA)"
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
          />
          <button onClick={handleAddStock}>Add</button>
        </div>

        <div className="stocks-list">
          {stocks.map((stock) => (
            <div key={stock.symbol} className="stock-item">
              <div className="stock-info">
                <div className="stock-symbol">{stock.symbol}</div>
                <div className="stock-name">{stock.name}</div>
              </div>
              <div className="stock-price">
                <div className="price">${stock.price || '--'}</div>
                <div className={`change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                  {stock.change >= 0 ? '+' : ''}{stock.change}%
                </div>
              </div>
              <button 
                className="remove-stock"
                onClick={() => handleRemoveStock(stock.symbol)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {stocks.length === 0 && (
          <div className="empty-portfolio">
            <p>No stocks in your portfolio. Add some to track!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioOverlay;
