import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './PortfolioOverlay.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const PortfolioOverlay = ({ isWindow = false }) => {
  const { isAuthenticated } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Load stocks from backend
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadStocks = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/portfolio`, {
          headers: {
            'Authorization': token || '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.stocks && data.stocks.length > 0) {
            setStocks(data.stocks);
          } else {
            // Default stocks for new users
            const defaultStocks = [
              { symbol: 'AAPL', name: 'Apple Inc.', price: 0, change: 0 },
              { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 0, change: 0 },
              { symbol: 'MSFT', name: 'Microsoft Corp.', price: 0, change: 0 },
            ];
            setStocks(defaultStocks);
            await saveStocks(defaultStocks);
          }
        } else {
          console.error('Failed to load portfolio');
          // Fallback to default stocks
          setStocks([
            { symbol: 'AAPL', name: 'Apple Inc.', price: 0, change: 0 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 0, change: 0 },
            { symbol: 'MSFT', name: 'Microsoft Corp.', price: 0, change: 0 },
          ]);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
        // Fallback to default stocks
        setStocks([
          { symbol: 'AAPL', name: 'Apple Inc.', price: 0, change: 0 },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 0, change: 0 },
          { symbol: 'MSFT', name: 'Microsoft Corp.', price: 0, change: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadStocks();

    // Listen for stock updates from settings modal
    window.addEventListener('stocksUpdated', loadStocks);
    return () => window.removeEventListener('stocksUpdated', loadStocks);
  }, [isAuthenticated]);

  const saveStocks = async (stocksToSave) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || '',
        },
        body: JSON.stringify({ stocks: stocksToSave }),
      });
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  };

  // Save stocks to backend when they change (but not on initial load)
  useEffect(() => {
    if (stocks.length > 0 && !loading) {
      saveStocks(stocks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const newStocks = [
        ...stocks,
        {
          symbol: newStock.toUpperCase(),
          name: newStock.toUpperCase(),
          price: 0,
          change: 0
        }
      ];
      setStocks(newStocks);
      saveStocks(newStocks);
      setNewStock('');
    }
  };

  const handleRemoveStock = (symbol) => {
    const newStocks = stocks.filter(s => s.symbol !== symbol);
    setStocks(newStocks);
    saveStocks(newStocks);
  };

  if (!isWindow && !isOpen) {
    return (
      <button className="portfolio-toggle" onClick={() => setIsOpen(true)}>
        💼 Portfolio
      </button>
    );
  }

  return (
    <div className={`portfolio-overlay ${isWindow ? 'window-mode' : ''}`}>
      {!isWindow && (
        <div className="portfolio-header">
          <h3>💼 Your Portfolio</h3>
          <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
        </div>
      )}

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
