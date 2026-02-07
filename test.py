import requests, json
url = "http://localhost:5001/api/predict/article-impact"
payload = {
  "assets": ["AAPL","MSFT","TSLA"],
  "article": {
    "title": "EV supplier news",
    "content": "Apple creates new EV supplier partnership with Foxconn, impacting Tesla and Microsoft. Apple has announced a new partnership with Foxconn to supply components for its upcoming electric vehicle. This move is expected to disrupt the EV market, potentially impacting Tesla's market share. Additionally, Microsoft's involvement in automotive software could also be affected as Apple expands its ecosystem into vehicles. Investors are closely watching how this partnership will influence the competitive landscape in the EV industry, with potential implications for stock prices of all three companies. The collaboration between Apple and Foxconn is seen as a strategic move to leverage Foxconn's manufacturing expertise while allowing Apple to maintain control over its product design and innovation. This could lead to increased competition in the EV market, especially if Apple's entry attracts a significant customer base. The news has already caused fluctuations in the stock prices of Tesla and Microsoft, as investors react to the potential shift in market dynamics. Analysts predict that this partnership could accelerate Apple's timeline for entering the EV market, which may further intensify competition with established players like Tesla. Overall, the announcement of Apple's new EV supplier partnership with Foxconn is expected to have significant implications for the stock prices of Apple, Tesla, and Microsoft as the market anticipates the impact of this collaboration on the EV industry.",
    "source": "MarketWatch"
  }
}
r = requests.post(url, json=payload, timeout=60)
print(r.status_code, r.json())