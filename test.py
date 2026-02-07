import requests
import json
import time
import matplotlib.pyplot as plt

url = "http://localhost:5003/api/predict/article-impact"
payload = {
  "assets": ["AAPL","MSFT","TSLA"],
  "article": {
    "title": "EV supplier news",
    "content": "Apple creates new EV supplier partnership with Foxconn, impacting Tesla and Microsoft. Apple has announced a new partnership with Foxconn to supply components for its upcoming electric vehicle. This move is expected to disrupt the EV market, potentially impacting Tesla's market share. Additionally, Microsoft's involvement in automotive software could also be affected as Apple expands its ecosystem into vehicles. Investors are closely watching how this partnership will influence the competitive landscape in the EV industry, with potential implications for stock prices of all three companies. The collaboration between Apple and Foxconn is seen as a strategic move to leverage Foxconn's manufacturing expertise while allowing Apple to maintain control over its product design and innovation. This could lead to increased competition in the EV market, especially if Apple's entry attracts a significant customer base. The news has already caused fluctuations in the stock prices of Tesla and Microsoft, as investors react to the potential shift in market dynamics. Analysts predict that this partnership could accelerate Apple's timeline for entering the EV market, which may further intensify competition with established players like Tesla. Overall, the announcement of Apple's new EV supplier partnership with Foxconn is expected to have significant implications for the stock prices of Apple, Tesla, and Microsoft as the market anticipates the impact of this collaboration on the EV industry.",
    "source": "MarketWatch"
  }
}

# Try to contact backend with retries if connection refused
max_retries = 5
for attempt in range(1, max_retries + 1):
    try:
        r = requests.post(url, json=payload, timeout=30)
        break
    except requests.exceptions.ConnectionError as e:
        print(f"Connection attempt {attempt}/{max_retries} failed: {e}")
        if attempt == max_retries:
            raise
        time.sleep(1 * (2 ** (attempt - 1)))

print(f"Status: {r.status_code}")
data = r.json()
print(f"Response: {json.dumps(data, indent=2)}")

# Plot the predictions if successful
if data.get('status') == 'success':
    predictions = data.get('data', {}).get('predictions', {})
    
    if predictions:
        # Create a figure with subplots for each asset
        num_assets = len(predictions)
        fig, axes = plt.subplots(num_assets, 1, figsize=(12, 4 * num_assets))
        
        # Handle single asset case (no subplots array)
        if num_assets == 1:
            axes = [axes]
        
        for idx, (symbol, pred_data) in enumerate(predictions.items()):
            ax = axes[idx]
            
            historical = pred_data.get('historical_prices', [])
            predicted = pred_data.get('predicted_prices', [])
            explanation = pred_data.get('explanation', 'N/A')
            
            # Create x-axis indices
            hist_x = list(range(len(historical)))
            # Predictions continue from the end of historical data
            pred_x = list(range(len(historical) - 1, len(historical) + len(predicted)))
            
            # Plot historical prices
            ax.plot(hist_x, historical, 'b-o', label='Historical (1 year)', linewidth=2, markersize=3)
            
            # Plot predicted prices as a continuous line connecting the last historical point and predictions
            if len(predicted) > 0 and len(historical) > 0:
                pred_y = [historical[-1]] + list(predicted)
                # pred_x already starts at the last historical index
                ax.plot(pred_x, pred_y, 'r-o', label='Predicted (8 weeks)', linewidth=2, markersize=3)
            else:
                # Fallback for empty data
                ax.plot(pred_x, [historical[-1]] + list(predicted), 'r-o', label='Predicted (8 weeks)', linewidth=2, markersize=3)
            
            # Formatting
            ax.set_title(f'{symbol} - Price Prediction\n{explanation}', fontsize=12, fontweight='bold')
            ax.set_xlabel('Week', fontsize=10)
            ax.set_ylabel('Price ($)', fontsize=10)
            ax.legend(loc='best')
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('predictions.png', dpi=100, bbox_inches='tight')
        print("\nPlot saved to 'predictions.png'")
        plt.show()
    else:
        print("No predictions returned")
else:
    print(f"Error: {data.get('message', 'Unknown error')}")