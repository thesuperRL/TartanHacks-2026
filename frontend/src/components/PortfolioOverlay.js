import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import StockPriceChart from './StockPriceChart';
import './PortfolioOverlay.css';

const PortfolioOverlay = ({ isWindow = false }) => {
  const { isAuthenticated, user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);
  const stocksListRef = useRef(null);
  const stockSymbolsRef = useRef([]);
  const [stockSymbolsString, setStockSymbolsString] = useState('');
  const animatedStocksRef = useRef(new Set());
  const [predictions, setPredictions] = useState({});
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [expandedStock, setExpandedStock] = useState(null);
  const predictionsFetchedRef = useRef(new Set()); // Track which symbol sets we've fetched

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

  // Animate stocks flying in from left when loading completes or new stocks added
  useEffect(() => {
    if (!loading && stocks.length > 0) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        const stockItems = stocksListRef.current?.querySelectorAll('.stock-item');
        if (stockItems) {
          stockItems.forEach((item, index) => {
            const symbol = stocks[index]?.symbol;
            if (symbol && !animatedStocksRef.current.has(symbol)) {
              animatedStocksRef.current.add(symbol);
              setTimeout(() => {
                item.classList.add('animate-in');
              }, hasAnimated ? 50 : index * 100); // Faster animation for new items
            }
          });
        }
        if (!hasAnimated) {
          setHasAnimated(true);
        }
      }, 0);
    }
  }, [loading, stocks, hasAnimated]);

  // Update symbols tracking when stocks change
  useEffect(() => {
    const symbols = stocks.map(s => s.symbol).filter(Boolean);
    stockSymbolsRef.current = symbols;
    const symbolsStr = symbols.sort().join(',');
    console.log('Updating stock symbols:', symbols, 'String:', symbolsStr);
    setStockSymbolsString(symbolsStr);
  }, [stocks.length, stocks.map(s => s.symbol).filter(Boolean).sort().join(',')]);

  // Fetch real-time stock prices from backend
  useEffect(() => {
    if (!isAuthenticated || stocks.length === 0) {
      console.log('Skipping price fetch - not authenticated or no stocks');
      return;
    }

    // Use the same API URL as App.js for consistency
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';
    let errorCount = 0;
    const MAX_ERROR_LOG = 3; // Log first few errors
    
    console.log('Portfolio: Setting up price fetcher. API URL:', API_BASE_URL, 'Stocks:', stocks.length);

    const fetchPrices = async () => {
      try {
        // Use ref to get current symbols without causing dependency issues
        const symbols = stockSymbolsRef.current;
        if (symbols.length === 0) {
          console.log('No symbols to fetch prices for');
          return;
        }
        console.log('Fetching prices for symbols:', symbols);
        
        const response = await fetch(`${API_BASE_URL}/stocks/prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbols }),
        });

        if (!response.ok) {
          if (errorCount < MAX_ERROR_LOG) {
            const errorText = await response.text().catch(() => '');
            console.error(`Failed to fetch stock prices: ${response.status} ${response.statusText}. Backend may not be running on ${API_BASE_URL}. Error: ${errorText}`);
            errorCount++;
          }
          return;
        }

        const data = await response.json();
        console.log('Price fetch response:', data);
        
        if (data.status === 'success' && data.stocks) {
          // Reset error count on success
          errorCount = 0;
          
          // Create a map of new prices for quick lookup
          const priceMap = {};
          data.stocks.forEach(stock => {
            if (stock.price !== null && stock.price !== undefined) {
              priceMap[stock.symbol] = {
                price: stock.price,
                change: stock.change || 0,
                name: stock.name || stock.symbol
              };
            }
          });

          console.log('Updating stocks with prices:', priceMap);

          // Update stocks with new prices, preserving existing data
          setStocks(prevStocks => {
            const updated = prevStocks.map(stock => {
              const updatedPrice = priceMap[stock.symbol];
              if (updatedPrice) {
                return {
                  ...stock,
                  price: updatedPrice.price,
                  change: updatedPrice.change,
                  name: updatedPrice.name || stock.name || stock.symbol
                };
              }
              return stock;
            });
            console.log('Updated stocks:', updated);
            return updated;
          });
        } else {
          console.warn('Unexpected price response format:', data);
        }
      } catch (error) {
        // Only log connection errors once to avoid spam
        if (errorCount < MAX_ERROR_LOG) {
          if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
            console.warn(`Cannot connect to backend at ${API_BASE_URL}. Make sure the backend server is running.`);
            console.warn('To start the backend, run: ./start-backend.sh');
          } else {
            console.error('Error fetching stock prices:', error);
          }
          errorCount++;
        }
      }
    };

    // Fetch immediately
    fetchPrices();
    
    // Then fetch every 10 seconds for real-time updates
    const interval = setInterval(fetchPrices, 10000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, stockSymbolsString, stocks.length]); // Re-run when symbols change or stocks are added/removed

  // Helper function to round numbers
  const round = (num, decimals = 2) => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  // Fetch predictions for portfolio stocks (only when symbols change, not when prices update)
  useEffect(() => {
    if (!isAuthenticated || stocks.length === 0) {
      console.log('Skipping predictions fetch - not authenticated or no stocks');
      return;
    }

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';
    const symbols = stockSymbolsRef.current;
    const symbolsKey = symbols.sort().join(','); // Create a stable key for the symbol set

    console.log('Checking predictions for symbols:', symbols, 'Key:', symbolsKey);
    console.log('Already fetched:', Array.from(predictionsFetchedRef.current));

    // Skip if we've already fetched predictions for this exact set of symbols
    if (predictionsFetchedRef.current.has(symbolsKey)) {
      console.log('Predictions already fetched for this symbol set, skipping');
      return;
    }
    
    console.log('Fetching predictions for symbols:', symbols);

    const fetchPredictions = async () => {
      try {
        if (symbols.length === 0) {
          console.log('No symbols to fetch predictions for');
          return;
        }
        
        console.log('Starting to fetch predictions for:', symbols);
        setPredictionsLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/portfolio/predictions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbols }),
        });

        console.log('Fetch response status:', response.status, response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('Failed to fetch predictions:', response.status, errorText);
          setPredictionsLoading(false);
          return;
        }

        const data = await response.json();
        
        console.log('Portfolio predictions response:', JSON.stringify(data, null, 2));
        
        if (data.status === 'success' && data.stocks) {
          // Mark this symbol set as fetched
          predictionsFetchedRef.current.add(symbolsKey);
          
          // Process predictions for each stock
          const predictionsMap = {};
          Object.keys(data.stocks).forEach(symbol => {
            const stockData = data.stocks[symbol];
            console.log(`Processing predictions for ${symbol}:`, stockData);
            
            // Check if we have predictions data
            if (stockData.predictions) {
              const predData = stockData.predictions;
              const predictedPrices = predData.predicted_prices || [];
              const historicalPrices = predData.historical_prices || [];
              
              if (predictedPrices.length > 0) {
                // Use the last historical price as baseline, or first predicted price, or current stock price
                const lastHistorical = historicalPrices.length > 0 ? historicalPrices[historicalPrices.length - 1] : null;
                const currentStockPrice = stocks.find(s => s.symbol === symbol)?.price || 0;
                const firstPredicted = predictedPrices[0];
                const lastPredicted = predictedPrices[predictedPrices.length - 1];
                
                // Determine baseline price: prefer last historical, then current stock price, then first predicted
                const baselinePrice = lastHistorical || (currentStockPrice > 0 ? currentStockPrice : firstPredicted);
                
                // Calculate predicted change from baseline to final predicted price
                let predictedChange = 0;
                if (baselinePrice > 0 && lastPredicted > 0) {
                  predictedChange = ((lastPredicted - baselinePrice) / baselinePrice) * 100;
                }
                
                predictionsMap[symbol] = {
                  predictedChange: round(predictedChange, 2),
                  predictedPrice: round(lastPredicted, 2),
                  explanation: predData.explanation || stockData.explanation || '',
                  predictedPrices: predictedPrices,
                  historicalPrices: historicalPrices, // Add historical prices for chart
                  newsScraped: stockData.news_scraped || false
                };
                
                console.log(`Added prediction for ${symbol}: baseline=${baselinePrice}, final=${lastPredicted}, change=${predictedChange}%`, predictionsMap[symbol]);
              } else {
                console.log(`No predicted prices for ${symbol}`);
              }
            } else if (stockData.predicted_prices && stockData.predicted_prices.length > 0) {
              // Fallback: check if predicted_prices is directly on stockData
              const predictedPrices = stockData.predicted_prices;
              const historicalPrices = stockData.historical_prices || [];
              const currentStockPrice = stocks.find(s => s.symbol === symbol)?.price || 0;
              const firstPredicted = predictedPrices[0];
              const lastPredicted = predictedPrices[predictedPrices.length - 1];
              
              // Determine baseline price: prefer last historical, then current stock price, then first predicted
              const lastHistorical = historicalPrices.length > 0 ? historicalPrices[historicalPrices.length - 1] : null;
              const baselinePrice = lastHistorical || (currentStockPrice > 0 ? currentStockPrice : firstPredicted);
              
              // Calculate predicted change from baseline to final predicted price
              let predictedChange = 0;
              if (baselinePrice > 0 && lastPredicted > 0) {
                predictedChange = ((lastPredicted - baselinePrice) / baselinePrice) * 100;
              }
              
              predictionsMap[symbol] = {
                predictedChange: round(predictedChange, 2),
                predictedPrice: round(lastPredicted, 2),
                explanation: stockData.explanation || '',
                predictedPrices: predictedPrices,
                historicalPrices: historicalPrices, // Add historical prices for chart
                newsScraped: stockData.news_scraped || false
              };
              
              console.log(`Added prediction for ${symbol} (fallback): baseline=${baselinePrice}, final=${lastPredicted}, change=${predictedChange}%`);
            } else {
              console.log(`No predictions data for ${symbol}:`, stockData);
            }
          });
          
          console.log('Final predictions map:', predictionsMap);
          console.log('Setting predictions state with', Object.keys(predictionsMap).length, 'stocks');
          
          // Mark as fetched only after successful processing
          predictionsFetchedRef.current.add(symbolsKey);
          
          setPredictions(predictionsMap);
        } else {
          console.warn('Unexpected response format:', data);
          console.warn('Response keys:', Object.keys(data));
          if (data.stocks) {
            console.warn('Stocks data:', Object.keys(data.stocks));
            Object.keys(data.stocks).forEach(symbol => {
              const stockData = data.stocks[symbol];
              console.warn(`Stock ${symbol}:`, {
                hasPredictions: !!stockData.predictions,
                hasPredictedPrices: !!stockData.predicted_prices,
                error: stockData.error,
                newsScraped: stockData.news_scraped
              });
            });
          }
          // Still mark as fetched even if no predictions, to avoid infinite retries
          predictionsFetchedRef.current.add(symbolsKey);
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
        console.error('Error stack:', error.stack);
      } finally {
        setPredictionsLoading(false);
      }
    };

    // Fetch predictions when symbols change (debounce to avoid too many requests)
    const timeoutId = setTimeout(fetchPredictions, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, stockSymbolsString]); // Only depend on stockSymbolsString, not stocks

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
      
      // Clear predictions cache so new predictions are fetched
      predictionsFetchedRef.current.clear();
      
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
    
    // Clear predictions cache so predictions are refetched for remaining stocks
    predictionsFetchedRef.current.clear();
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
        {/* Debug info - remove after debugging */}

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
            stocks.map((stock) => {
              const prediction = predictions[stock.symbol];
              const isExpanded = expandedStock === stock.symbol;
              
              // Debug logging
              if (stock.symbol === stocks[0]?.symbol) {
                console.log(`Rendering stock ${stock.symbol}:`, {
                  hasPrediction: !!prediction,
                  prediction,
                  allPredictions: predictions
                });
              }
              
              return (
              <div key={stock.symbol} className="stock-item">
                <div className="stock-item-main">
                  <div className="stock-info">
                    <div className="stock-symbol">{stock.symbol}</div>
                    <div className="stock-name">{stock.name}</div>
                    {prediction && (
                      <div 
                        className={`prediction-badge ${prediction.predictedChange >= 0 ? 'positive' : 'negative'}`}
                        onClick={() => setExpandedStock(isExpanded ? null : stock.symbol)}
                        style={{ cursor: 'pointer', marginTop: '6px' }}
                      >
                        📈 Predicted: {prediction.predictedChange >= 0 ? '+' : ''}{prediction.predictedChange}%
                      </div>
                    )}
                    {predictionsLoading && !prediction && (
                      <div className="prediction-loading">Analyzing news...</div>
                    )}
                    {!predictionsLoading && !prediction && Object.keys(predictions).length === 0 && stocks.length > 0 && (
                      <div className="prediction-loading" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                        No predictions available yet
                      </div>
                    )}
                  </div>
                  <div className="stock-price">
                    <div className="price">
                      {stock.price && stock.price > 0 
                        ? `$${stock.price.toFixed(2)}` 
                        : '--'}
                    </div>
                    {stock.price && stock.price > 0 && (
                      <div className={`change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}%
                      </div>
                    )}
                  </div>
                  <button 
                    className="remove-stock"
                    onClick={() => handleRemoveStock(stock.symbol)}
                  >
                    ×
                  </button>
                </div>
                {prediction && (
                  <div className="stock-prediction">
                    <div className={`prediction-details ${isExpanded ? 'expanded' : ''}`}>
                      {isExpanded && (
                        <>
                          <div className="prediction-price">
                            Predicted Price: ${prediction.predictedPrice}
                          </div>
                          {prediction.predictedPrices && prediction.predictedPrices.length > 0 && (
                          <div className="prediction-chart">
                            <StockPriceChart
                              symbol={stock.symbol}
                              historicalPrices={prediction.historicalPrices || []}
                              predictedPrices={prediction.predictedPrices || []}
                              explanation={prediction.explanation || ''}
                            />
                          </div>
                          )}
                          {prediction.explanation && (
                            <div className="prediction-explanation">
                              {prediction.explanation}
                            </div>
                          )}
                          {prediction.newsScraped && (
                            <div className="prediction-source">
                              ✓ Based on recent news analysis
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              );
            })
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
