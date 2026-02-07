// Check if an article might impact user's portfolio holdings
// Uses heuristics and can be enhanced with AI

export function checkArticleImpact(article, stocks, portfolio) {
  if (!stocks || stocks.length === 0) {
    return { impacts: false, reason: null };
  }

  // Get stock symbols from portfolio
  const stockSymbols = stocks.map(s => s.symbol?.toUpperCase() || '').filter(Boolean);
  if (stockSymbols.length === 0) {
    return { impacts: false, reason: null };
  }

  // Check article title and summary for stock mentions
  const title = (article.title || '').toUpperCase();
  const summary = (article.summary || '').toUpperCase();
  const location = (article.location || '').toUpperCase();
  const text = `${title} ${summary} ${location}`;

  // Direct stock symbol mentions
  for (const symbol of stockSymbols) {
    if (text.includes(symbol)) {
      return { 
        impacts: true, 
        reason: `Directly mentions ${symbol}, which is in your portfolio.` 
      };
    }
  }

  // Check for company name mentions (common mappings)
  const companyMappings = {
    'AAPL': { keywords: ['APPLE', 'IPHONE', 'IPAD', 'MAC', 'IOS'], name: 'Apple Inc.' },
    'GOOGL': { keywords: ['GOOGLE', 'ALPHABET', 'ANDROID', 'YOUTUBE', 'SEARCH'], name: 'Alphabet Inc.' },
    'MSFT': { keywords: ['MICROSOFT', 'WINDOWS', 'AZURE', 'XBOX', 'OFFICE'], name: 'Microsoft Corp.' },
    'AMZN': { keywords: ['AMAZON', 'AWS', 'PRIME', 'ALEXA'], name: 'Amazon.com Inc.' },
    'TSLA': { keywords: ['TESLA', 'ELECTRIC VEHICLE', 'EV', 'MUSK'], name: 'Tesla Inc.' },
    'META': { keywords: ['FACEBOOK', 'META', 'INSTAGRAM', 'WHATSAPP', 'VR'], name: 'Meta Platforms Inc.' },
    'NVDA': { keywords: ['NVIDIA', 'GPU', 'AI CHIP', 'GRAPHICS'], name: 'NVIDIA Corp.' },
    'JPM': { keywords: ['JPMORGAN', 'CHASE', 'BANK'], name: 'JPMorgan Chase & Co.' },
    'V': { keywords: ['VISA', 'PAYMENT', 'CREDIT CARD'], name: 'Visa Inc.' },
    'JNJ': { keywords: ['JOHNSON', 'JOHNSON & JOHNSON', 'PHARMACEUTICAL'], name: 'Johnson & Johnson' },
    'WMT': { keywords: ['WALMART', 'RETAIL'], name: 'Walmart Inc.' },
    'PG': { keywords: ['PROCTER', 'GAMBLE', 'CONSUMER GOODS'], name: 'Procter & Gamble Co.' },
  };

  for (const symbol of stockSymbols) {
    const mapping = companyMappings[symbol];
    if (mapping) {
      for (const keyword of mapping.keywords) {
        if (text.includes(keyword)) {
          return { 
            impacts: true, 
            reason: `Mentions ${mapping.name} (${symbol}), which is in your portfolio.` 
          };
        }
      }
    }
  }

  // Check for sector/industry mentions that might affect holdings
  const techStocks = stockSymbols.filter(s => ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA'].includes(s));
  const financialStocks = stockSymbols.filter(s => ['JPM', 'V'].includes(s));

  // If article is financial and user has tech stocks, it might be relevant
  if (article.category === 'financial') {
    if (techStocks.length > 0 && (text.includes('TECH') || text.includes('NASDAQ'))) {
      return { 
        impacts: true, 
        reason: `Tech sector news may impact your holdings: ${techStocks.join(', ')}.` 
      };
    }
    if (financialStocks.length > 0 && (text.includes('BANK') || text.includes('FINANCIAL') || text.includes('FEDERAL RESERVE'))) {
      return { 
        impacts: true, 
        reason: `Financial sector news may impact your holdings: ${financialStocks.join(', ')}.` 
      };
    }
  }

  return { impacts: false, reason: null };
}

// Async AI-powered check (can be called for more accurate results)
export async function checkArticleImpactAI(article, stocks, portfolio) {
  if (!stocks || stocks.length === 0) {
    return false;
  }

  const stockSymbols = stocks.map(s => s.symbol?.toUpperCase() || '').filter(Boolean);
  if (stockSymbols.length === 0) {
    return false;
  }

  try {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';
    const response = await fetch(`${API_BASE_URL}/articles/check-impact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article: {
          title: article.title,
          summary: article.summary,
          location: article.location,
          category: article.category
        },
        stocks: stockSymbols
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        impacts: data.impacts_holdings || false,
        reason: data.reasoning || null
      };
    }
  } catch (error) {
    console.error('Error checking article impact:', error);
  }

  // Fallback to heuristic check
  return checkArticleImpact(article, stocks, portfolio);
}
