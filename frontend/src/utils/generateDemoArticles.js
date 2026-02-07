// Generate demo articles for global locations and California counties

const globalCities = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston', country: 'USA', lat: 29.7604, lng: -95.3698 },
  { name: 'Miami', country: 'USA', lat: 25.7617, lng: -80.1918 },
  { name: 'Boston', country: 'USA', lat: 42.3601, lng: -71.0589 },
  { name: 'Seattle', country: 'USA', lat: 47.6062, lng: -122.3321 },
  { name: 'Washington, DC', country: 'USA', lat: 38.9072, lng: -77.0369 },
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
];

const californiaCounties = [
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'San Diego', lat: 32.7157, lng: -117.1611 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'San Jose', lat: 37.3382, lng: -121.8863 },
  { name: 'Sacramento', lat: 38.5816, lng: -121.4944 },
  { name: 'Fresno', lat: 36.7378, lng: -119.7871 },
  { name: 'Oakland', lat: 37.8044, lng: -122.2712 },
  { name: 'Long Beach', lat: 33.7701, lng: -118.1937 },
  { name: 'Bakersfield', lat: 35.3733, lng: -119.0187 },
  { name: 'Anaheim', lat: 33.8366, lng: -117.9143 },
  { name: 'Santa Ana', lat: 33.7455, lng: -117.8677 },
  { name: 'Riverside', lat: 33.9533, lng: -117.3962 },
  { name: 'Stockton', lat: 37.9577, lng: -121.2908 },
  { name: 'Irvine', lat: 33.6846, lng: -117.8265 },
  { name: 'Chula Vista', lat: 32.6401, lng: -117.0842 },
  { name: 'Fremont', lat: 37.5485, lng: -121.9886 },
  { name: 'San Bernardino', lat: 34.1083, lng: -117.2898 },
  { name: 'Modesto', lat: 37.6391, lng: -120.9969 },
  { name: 'Fontana', lat: 34.0922, lng: -117.4350 },
  { name: 'Oxnard', lat: 34.1975, lng: -119.1771 },
  { name: 'Moreno Valley', lat: 33.9425, lng: -117.2297 },
  { name: 'Huntington Beach', lat: 33.6595, lng: -117.9988 },
  { name: 'Glendale', lat: 34.1425, lng: -118.2551 },
  { name: 'Santa Clarita', lat: 34.3917, lng: -118.5426 },
  { name: 'Garden Grove', lat: 33.7739, lng: -117.9414 },
  { name: 'Oceanside', lat: 33.1959, lng: -117.3795 },
  { name: 'Rancho Cucamonga', lat: 34.1064, lng: -117.5931 },
  { name: 'Santa Rosa', lat: 38.4404, lng: -122.7141 },
  { name: 'Ontario', lat: 34.0633, lng: -117.6509 },
  { name: 'Lancaster', lat: 34.6868, lng: -118.1542 },
  { name: 'Elk Grove', lat: 38.4088, lng: -121.3716 },
  { name: 'Corona', lat: 33.8753, lng: -117.5664 },
  { name: 'Palmdale', lat: 34.5794, lng: -118.1165 },
  { name: 'Salinas', lat: 36.6777, lng: -121.6555 },
  { name: 'Pomona', lat: 34.0551, lng: -117.7526 },
  { name: 'Hayward', lat: 37.6688, lng: -122.0808 },
  { name: 'Escondido', lat: 33.1192, lng: -117.0864 },
  { name: 'Torrance', lat: 33.8358, lng: -118.3406 },
  { name: 'Sunnyvale', lat: 37.3688, lng: -122.0363 },
  { name: 'Orange', lat: 33.7879, lng: -117.8531 },
  { name: 'Fullerton', lat: 33.8704, lng: -117.9242 },
  { name: 'Pasadena', lat: 34.1478, lng: -118.1445 },
  { name: 'Thousand Oaks', lat: 34.1706, lng: -118.8376 },
  { name: 'Visalia', lat: 36.3302, lng: -119.2921 },
  { name: 'Simi Valley', lat: 34.2694, lng: -118.7815 },
  { name: 'Concord', lat: 37.9780, lng: -122.0311 },
  { name: 'Roseville', lat: 38.7521, lng: -121.2880 },
  { name: 'Vallejo', lat: 38.1041, lng: -122.2566 },
  { name: 'Victorville', lat: 34.5361, lng: -117.2928 },
  { name: 'Fairfield', lat: 38.2494, lng: -122.0400 },
  { name: 'Santa Clara', lat: 37.3541, lng: -121.9552 },
  { name: 'Berkeley', lat: 37.8715, lng: -122.2730 },
  { name: 'Richmond', lat: 37.9358, lng: -122.3477 },
  { name: 'Antioch', lat: 38.0049, lng: -121.8058 },
  { name: 'Daly City', lat: 37.6879, lng: -122.4702 },
  { name: 'South Gate', lat: 33.9547, lng: -118.2120 },
  { name: 'Inglewood', lat: 33.9617, lng: -118.3531 },
  { name: 'San Mateo', lat: 37.5630, lng: -122.3255 },
  { name: 'Ventura', lat: 34.2746, lng: -119.2290 },
  { name: 'West Covina', lat: 34.0686, lng: -117.9390 },
  { name: 'Norwalk', lat: 33.9022, lng: -118.0817 },
  { name: 'Carlsbad', lat: 33.1581, lng: -117.3506 },
  { name: 'Burbank', lat: 34.1808, lng: -118.3090 },
  { name: 'Rialto', lat: 34.1064, lng: -117.3703 },
  { name: 'El Monte', lat: 34.0686, lng: -118.0276 },
  { name: 'Downey', lat: 33.9401, lng: -118.1332 },
  { name: 'Compton', lat: 33.8958, lng: -118.2201 },
  { name: 'Costa Mesa', lat: 33.6411, lng: -117.9187 },
  { name: 'Murrieta', lat: 33.5539, lng: -117.2139 },
  { name: 'Clovis', lat: 36.8252, lng: -119.7029 },
  { name: 'Temecula', lat: 33.4936, lng: -117.1484 },
  { name: 'Santa Monica', lat: 34.0195, lng: -118.4912 },
  { name: 'Westminster', lat: 33.7592, lng: -117.9858 },
  { name: 'Redding', lat: 40.5865, lng: -122.3917 },
  { name: 'Santa Barbara', lat: 34.4208, lng: -119.6982 },
  { name: 'El Cajon', lat: 32.7948, lng: -116.9625 },
  { name: 'San Leandro', lat: 37.7249, lng: -122.1561 },
  { name: 'Livermore', lat: 37.6819, lng: -121.7680 },
  { name: 'Napa', lat: 38.2975, lng: -122.2869 },
  { name: 'Redwood City', lat: 37.4852, lng: -122.2364 },
  { name: 'Chico', lat: 39.7285, lng: -121.8375 },
  { name: 'Whittier', lat: 33.9785, lng: -118.0327 },
  { name: 'Hawthorne', lat: 33.9164, lng: -118.3526 },
  { name: 'Citrus Heights', lat: 38.7071, lng: -121.2811 },
  { name: 'Tracy', lat: 37.7397, lng: -121.4252 },
  { name: 'Alhambra', lat: 34.0953, lng: -118.1270 },
  { name: 'San Marcos', lat: 33.1434, lng: -117.1661 },
  { name: 'Lakewood', lat: 33.8466, lng: -118.1430 },
  { name: 'Buena Park', lat: 33.8704, lng: -117.9981 },
  { name: 'Menlo Park', lat: 37.4538, lng: -122.1821 },
  { name: 'Hemet', lat: 33.7475, lng: -116.9710 },
  { name: 'Lake Forest', lat: 33.6469, lng: -117.6892 },
  { name: 'Merced', lat: 37.3022, lng: -120.4830 },
  { name: 'Mountain View', lat: 37.3861, lng: -122.0839 },
  { name: 'Bellflower', lat: 33.8817, lng: -118.1170 },
  { name: 'Upland', lat: 34.0975, lng: -117.6484 },
  { name: 'Tulare', lat: 36.2077, lng: -119.3473 },
  { name: 'Turlock', lat: 37.4947, lng: -120.8466 },
  { name: 'Perris', lat: 33.7825, lng: -117.2287 },
  { name: 'Manteca', lat: 37.7974, lng: -121.2161 },
  { name: 'Milpitas', lat: 37.4283, lng: -121.9066 },
  { name: 'Redondo Beach', lat: 33.8492, lng: -118.3884 },
  { name: 'Yuba City', lat: 39.1404, lng: -121.6169 },
  { name: 'Madera', lat: 36.9613, lng: -120.0607 },
  { name: 'Palo Alto', lat: 37.4419, lng: -122.1430 },
  { name: 'Hanford', lat: 36.3275, lng: -119.6457 },
  { name: 'Camarillo', lat: 34.2164, lng: -119.0376 },
  { name: 'Lodi', lat: 38.1302, lng: -121.2724 },
  { name: 'Pico Rivera', lat: 33.9831, lng: -118.0967 },
  { name: 'Watsonville', lat: 36.9102, lng: -121.7569 },
  { name: 'Pittsburg', lat: 38.0279, lng: -121.8847 },
  { name: 'South San Francisco', lat: 37.6547, lng: -122.4077 },
  { name: 'Union City', lat: 37.5958, lng: -122.0191 },
  { name: 'La Habra', lat: 33.9319, lng: -117.9461 },
  { name: 'Montebello', lat: 34.0095, lng: -118.1053 },
  { name: 'Hesperia', lat: 34.4264, lng: -117.3009 },
  { name: 'Lynwood', lat: 33.9303, lng: -118.2115 },
  { name: 'Monterey Park', lat: 34.0625, lng: -118.1228 },
  { name: 'San Rafael', lat: 37.9735, lng: -122.5311 },
  { name: 'Cupertino', lat: 37.3230, lng: -122.0322 },
  { name: 'Folsom', lat: 38.6779, lng: -121.1761 },
  { name: 'San Luis Obispo', lat: 35.2828, lng: -120.6596 },
  { name: 'Petaluma', lat: 38.2324, lng: -122.6367 },
  { name: 'Baldwin Park', lat: 34.0853, lng: -117.9609 },
  { name: 'Chino', lat: 34.0128, lng: -117.6889 },
  { name: 'Encinitas', lat: 33.0370, lng: -117.2920 },
  { name: 'National City', lat: 32.6781, lng: -117.0992 },
  { name: 'La Mesa', lat: 32.7678, lng: -117.0231 },
  { name: 'Arcadia', lat: 34.1397, lng: -118.0353 },
  { name: 'Rockville', lat: 38.5816, lng: -121.4944 },
  { name: 'Tustin', lat: 33.7459, lng: -117.8262 },
  { name: 'Santee', lat: 32.8384, lng: -116.9739 },
  { name: 'La Mirada', lat: 33.9172, lng: -118.0120 },
  { name: 'San Bruno', lat: 37.6305, lng: -122.4111 },
  { name: 'Paramount', lat: 33.8895, lng: -118.1598 },
  { name: 'Yorba Linda', lat: 33.8886, lng: -117.8131 },
  { name: 'Carson', lat: 33.8317, lng: -118.2817 },
  { name: 'San Dimas', lat: 34.1067, lng: -117.8067 },
  { name: 'Lompoc', lat: 34.6392, lng: -120.4579 },
  { name: 'Brea', lat: 33.9164, lng: -117.9003 },
  { name: 'Pacifica', lat: 37.6138, lng: -122.4869 },
  { name: 'Seal Beach', lat: 33.7414, lng: -118.1048 },
  { name: 'Los Banos', lat: 37.0583, lng: -120.8499 },
  { name: 'Martinez', lat: 38.0194, lng: -122.1341 },
  { name: 'Calexico', lat: 32.6789, lng: -115.4989 },
  { name: 'Hollister', lat: 36.8525, lng: -121.4016 },
  { name: 'Porterville', lat: 36.0652, lng: -119.0168 },
  { name: 'Atascadero', lat: 35.4894, lng: -120.6707 },
  { name: 'Placentia', lat: 33.8722, lng: -117.8703 },
  { name: 'Ceres', lat: 37.5949, lng: -120.9577 },
  { name: 'Cypress', lat: 33.8169, lng: -118.0373 },
  { name: 'Selma', lat: 36.5708, lng: -119.6121 },
  { name: 'La Verne', lat: 34.1008, lng: -117.7678 },
  { name: 'Dinuba', lat: 36.5433, lng: -119.3871 },
  { name: 'Los Gatos', lat: 37.2266, lng: -121.9746 },
  { name: 'Patterson', lat: 37.4716, lng: -121.1297 },
  { name: 'Willows', lat: 39.5243, lng: -122.1936 },
  { name: 'Colton', lat: 34.0739, lng: -117.3137 },
  { name: 'Coalinga', lat: 36.1397, lng: -120.3602 },
  { name: 'Gridley', lat: 39.3638, lng: -121.6936 },
  { name: 'Los Altos', lat: 37.3852, lng: -122.1141 },
  { name: 'Sanger', lat: 36.7080, lng: -119.5560 },
  { name: 'Reedley', lat: 36.5964, lng: -119.4504 },
  { name: 'Avenal', lat: 36.0041, lng: -120.1290 },
  { name: 'Corcoran', lat: 36.0980, lng: -119.5604 },
  { name: 'Firebaugh', lat: 36.8588, lng: -120.4560 },
  { name: 'Fowler', lat: 36.6305, lng: -119.6785 },
  { name: 'Huron', lat: 36.2027, lng: -120.1029 },
  { name: 'Kerman', lat: 36.7375, lng: -120.0599 },
  { name: 'Kingsburg', lat: 36.5138, lng: -119.5540 },
  { name: 'Lindsay', lat: 36.2030, lng: -119.0882 },
  { name: 'Mendota', lat: 36.7536, lng: -120.3816 },
  { name: 'Orange Cove', lat: 36.6244, lng: -119.3137 },
  { name: 'Parlier', lat: 36.6116, lng: -119.5271 },
  { name: 'Pinedale', lat: 36.8402, lng: -119.7982 },
  { name: 'San Joaquin', lat: 36.6066, lng: -120.1890 },
  { name: 'Selma', lat: 36.5708, lng: -119.6121 },
  { name: 'Shafter', lat: 35.5005, lng: -119.2718 },
  { name: 'Wasco', lat: 35.5941, lng: -119.3410 },
];

const financeTitles = [
  'Market Impact: Federal Reserve Signals Potential Rate Cuts',
  'Investment Outlook: Tech Stocks Rally on Strong Earnings',
  'Financial Analysis: Oil Prices Surge Amid Supply Disruptions',
  'Trading Implications: Cryptocurrency Markets See Adoption',
  'Economic Impact: Inflation Data Shows Cooling Trend',
  'Market Trends: Housing Prices Stabilize in Major Cities',
  'Financial Markets: Bond Yields Rise on Economic Data',
  'Investment Analysis: Emerging Markets Show Growth',
  'Trading Outlook: Commodity Prices Volatile This Week',
  'Market Impact: Central Banks Coordinate Policy Changes',
  'Financial News: Banking Sector Reports Strong Quarter',
  'Investment Trends: Renewable Energy Stocks Surge',
  'Market Analysis: Currency Markets React to Trade News',
  'Financial Update: Retail Sector Shows Mixed Results',
  'Trading News: Futures Markets Indicate Positive Sentiment',
  'Market Report: Manufacturing Data Exceeds Expectations',
  'Financial Outlook: Healthcare Stocks Gain Momentum',
  'Investment News: Real Estate Markets Show Resilience',
  'Market Trends: Consumer Spending Data Released',
  'Financial Analysis: Tech Sector Innovation Drives Growth',
  'Trading Update: Agricultural Commodities See Price Shifts',
  'Market Impact: Energy Sector Faces Regulatory Changes',
  'Financial News: Insurance Industry Adapts to Climate',
  'Investment Outlook: Infrastructure Spending Increases',
  'Market Analysis: Transportation Stocks Perform Well',
  'Financial Trends: E-commerce Continues Expansion',
  'Trading News: International Markets Show Volatility',
  'Market Report: Employment Data Surprises Analysts',
  'Financial Update: Telecommunications Sector Growth',
  'Investment Trends: Green Bonds Gain Popularity',
];

const financeSummaries = [
  'Market analysts predict significant price movements following this development.',
  'Trading volume has increased substantially as investors react to the news.',
  'Financial institutions are adjusting their portfolios based on this information.',
  'Investment firms are revising their price targets following this announcement.',
  'Stock markets are showing increased volatility in response to this development.',
  'Central banks are monitoring the situation closely for policy implications.',
  'Hedge funds are repositioning assets in light of new market data.',
  'Institutional investors are taking advantage of current market conditions.',
  'Economic indicators suggest positive trends in the coming quarters.',
  'Market sentiment has shifted following the latest financial reports.',
];

const sources = ['Bloomberg', 'Reuters', 'Financial Times', 'CNBC', 'MarketWatch', 'Wall Street Journal', 'Forbes', 'Yahoo Finance'];

// Generate random offset within a small radius (for clustering)
function randomOffset(maxOffset = 0.1) {
  return (Math.random() - 0.5) * maxOffset;
}

export function generateDemoArticles() {
  const articles = [];
  let articleId = 1;

  // Generate global articles (1-2 per major city, visible at zoom 0-3)
  globalCities.forEach(city => {
    const numArticles = Math.floor(Math.random() * 2) + 1; // 1-2 articles per city
    for (let i = 0; i < numArticles; i++) {
      const title = financeTitles[Math.floor(Math.random() * financeTitles.length)];
      const summary = financeSummaries[Math.floor(Math.random() * financeSummaries.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      articles.push({
        id: `global-${articleId++}`,
        title: `${title} in ${city.name}`,
        summary: `${summary} This development in ${city.name}, ${city.country} is being closely watched by global markets.`,
        category: 'financial',
        location: `${city.name}, ${city.country}`,
        source: source,
        url: `https://example.com/article-${articleId}`,
        coordinates: {
          lat: city.lat + randomOffset(0.05),
          lng: city.lng + randomOffset(0.05)
        },
        popularity_score: 0.5 + Math.random() * 0.4,
        blurred: false,
        minZoom: 0, // Visible at all zoom levels
        maxZoom: 2.5, // Start showing at zoom 2.5
      });
    }
  });

  // Generate California county articles (3 per county, visible at zoom 4+)
  let californiaArticleIndex = 0;
  californiaCounties.forEach(county => {
    for (let i = 0; i < 3; i++) {
      const title = financeTitles[Math.floor(Math.random() * financeTitles.length)];
      const summary = financeSummaries[Math.floor(Math.random() * financeSummaries.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      // Distribute articles across a much wider zoom range (4.0 to 8.0) for very gradual appearance
      // Use a global index to ensure smooth distribution across all California articles
      const totalCAArticles = californiaCounties.length * 3;
      const appearanceProgress = californiaArticleIndex / totalCAArticles; // 0 to 1
      
      // Spread appearance across zoom 4.0 to 8.0 (4 zoom levels)
      const minZoom = 4.0 + appearanceProgress * 3.5; // 4.0 to 7.5
      const appearanceRange = 0.3; // Each article takes 0.3 zoom levels to fully appear
      const maxZoom = minZoom + appearanceRange;
      
      articles.push({
        id: `ca-${articleId++}`,
        title: `${title} in ${county.name} County`,
        summary: `${summary} Local markets in ${county.name} County, California are responding to regional economic developments.`,
        category: 'financial',
        location: `${county.name} County, California`,
        source: source,
        url: `https://example.com/article-${articleId}`,
        coordinates: {
          lat: county.lat + randomOffset(0.2), // Spread articles around the county
          lng: county.lng + randomOffset(0.2)
        },
        popularity_score: 0.3 + Math.random() * 0.3,
        blurred: false,
        minZoom: minZoom,
        maxZoom: maxZoom,
      });
      
      californiaArticleIndex++;
    }
  });

  return articles;
}
