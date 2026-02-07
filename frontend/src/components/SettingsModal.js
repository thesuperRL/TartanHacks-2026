import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './SettingsModal.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const SettingsModal = ({ isOpen, onClose, onStocksUpdate }) => {
  const { isAuthenticated } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [popularStocks] = useState([
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble Co.' },
  ]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

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
          setStocks(data.stocks || []);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStocks();
  }, [isOpen, isAuthenticated]);

  const saveStocks = async (stocksToSave) => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || '',
        },
        body: JSON.stringify({ stocks: stocksToSave }),
      });

      if (response.ok) {
        setSaveStatus('saved');
        // Trigger update event for PortfolioOverlay
        window.dispatchEvent(new Event('stocksUpdated'));
        if (onStocksUpdate) {
          onStocksUpdate(stocksToSave);
        }
        // Clear status message after 2 seconds
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        setSaveStatus('error');
        console.error('Failed to save portfolio');
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving portfolio:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStock = async (stockSymbol, stockName) => {
    const symbol = stockSymbol.toUpperCase().trim();
    if (symbol && !stocks.find(s => s.symbol === symbol)) {
      const newStocks = [
        ...stocks,
        {
          symbol: symbol,
          name: stockName || symbol,
          price: 0,
          change: 0
        }
      ];
      setStocks(newStocks);
      // Save immediately and wait for completion
      await saveStocks(newStocks);
      setNewStock('');
    }
  };

  const handleRemoveStock = async (symbol) => {
    const newStocks = stocks.filter(s => s.symbol !== symbol);
    setStocks(newStocks);
    // Save immediately and wait for completion
    await saveStocks(newStocks);
  };

  const filteredPopularStocks = popularStocks.filter(stock => {
    const query = searchQuery.toLowerCase();
    return stock.symbol.toLowerCase().includes(query) || 
           stock.name.toLowerCase().includes(query);
  });

  const availableStocks = filteredPopularStocks.filter(
    stock => !stocks.find(s => s.symbol === stock.symbol)
  );

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <div>
            <h2>⚙️ Portfolio Settings</h2>
            {saveStatus === 'saved' && (
              <span className="save-status saved">✓ Saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="save-status error">✗ Save failed</span>
            )}
            {saving && (
              <span className="save-status saving">Saving...</span>
            )}
          </div>
          <button className="settings-close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-modal-content">
          <div className="settings-section">
            <h3>Your Portfolio Stocks</h3>
            <div className="current-stocks">
              {stocks.length === 0 ? (
                <p className="empty-message">No stocks in your portfolio. Add some below!</p>
              ) : (
                stocks.map((stock) => (
                  <div key={stock.symbol} className="stock-chip">
                    <span className="stock-chip-symbol">{stock.symbol}</span>
                    <span className="stock-chip-name">{stock.name}</span>
                    <button
                      className="stock-chip-remove"
                      onClick={() => handleRemoveStock(stock.symbol)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="settings-section">
            <h3>Add Stock by Symbol</h3>
            <div className="add-stock-manual">
              <input
                type="text"
                placeholder="Enter stock symbol (e.g., TSLA)"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddStock(newStock)}
                maxLength={10}
              />
              <button onClick={() => handleAddStock(newStock)} disabled={!newStock.trim()}>
                Add
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3>Popular Stocks</h3>
            <div className="search-stocks">
              <input
                type="text"
                placeholder="Search popular stocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="popular-stocks-grid">
              {availableStocks.length === 0 ? (
                <p className="empty-message">No more popular stocks to add</p>
              ) : (
                availableStocks.map((stock) => (
                  <button
                    key={stock.symbol}
                    className="popular-stock-button"
                    onClick={() => handleAddStock(stock.symbol, stock.name)}
                  >
                    <div className="popular-stock-symbol">{stock.symbol}</div>
                    <div className="popular-stock-name">{stock.name}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
