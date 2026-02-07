import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import './PortfolioOverlay.css';

const PortfolioOverlay = ({ isWindow = false }) => {
  const { isAuthenticated, user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);
  const stocksListRef = useRef(null);

  // Load stocks from Firestore
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;

    const portfolioRef = doc(db, 'portfolios', user.uid);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      portfolioRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setStocks(data.stocks || []);
        } else {
          // No portfolio exists, create default one
          const defaultStocks = [
            { symbol: 'AAPL', name: 'Apple Inc.', price: 0, change: 0 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 0, change: 0 },
            { symbol: 'MSFT', name: 'Microsoft Corp.', price: 0, change: 0 },
          ];
          setStocks(defaultStocks);
          await setDoc(portfolioRef, { stocks: defaultStocks });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error loading portfolio:', error);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [isAuthenticated, user?.uid]);

  const saveStocks = async (stocksToSave) => {
    if (!user?.uid) return;
    
    try {
      const portfolioRef = doc(db, 'portfolios', user.uid);
      await setDoc(portfolioRef, { stocks: stocksToSave }, { merge: true });
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  };

  // Animate stocks flying in from left when loading completes
  useEffect(() => {
    if (!loading && stocks.length > 0 && !hasAnimated) {
      setHasAnimated(true);
      const stockItems = stocksListRef.current?.querySelectorAll('.stock-item');
      if (stockItems) {
        stockItems.forEach((item, index) => {
          setTimeout(() => {
            item.classList.add('animate-in');
          }, index * 100);
        });
      }
    }
  }, [loading, stocks, hasAnimated]);

  // Mock stock price updates (in production, use a real API)
  // Note: Price updates don't trigger Firestore saves to avoid unnecessary writes
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
      
      // Animate the new stock in
      setTimeout(() => {
        const stockItems = stocksListRef.current?.querySelectorAll('.stock-item:not(.animate-in)');
        if (stockItems && stockItems.length > 0) {
          const lastItem = stockItems[stockItems.length - 1];
          lastItem.classList.add('animate-in');
        }
      }, 50);
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

        <div className="stocks-list" ref={stocksListRef}>
          {loading ? (
            // Loading placeholders
            [1, 2, 3].map((i) => (
              <div key={`skeleton-${i}`} className="stock-item stock-skeleton">
                <div className="stock-info">
                  <div className="stock-symbol skeleton-line" style={{ width: '60px', height: '20px' }}></div>
                  <div className="stock-name skeleton-line" style={{ width: '120px', height: '14px', marginTop: '8px' }}></div>
                </div>
                <div className="stock-price">
                  <div className="price skeleton-line" style={{ width: '80px', height: '20px', marginBottom: '8px' }}></div>
                  <div className="change skeleton-line" style={{ width: '60px', height: '16px' }}></div>
                </div>
                <div className="remove-stock skeleton-line" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
              </div>
            ))
          ) : (
            stocks.map((stock) => (
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
            ))
          )}
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
