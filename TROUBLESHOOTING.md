# Troubleshooting Guide

## Common Issues and Solutions

### 1. CORS Errors
**Error**: `Access to fetch at 'http://localhost:5001/api/...' has been blocked by CORS policy`

**Solution**: 
- Make sure the backend server is running on port 5001
- Note: We use port 5001 instead of 5000 to avoid macOS AirPlay Receiver conflicts
- Start the backend with: `./start-backend.sh` or `cd backend && python app.py`
- The CORS configuration should allow requests from `http://localhost:3000`

### 2. Mapbox Access Token Error
**Error**: `Mapbox access token not configured` or `Mapbox GL JS failed to load`

**Solution**:
1. Get a free Mapbox access token from [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Create a free account if you don't have one (free tier includes 50,000 map loads per month)
3. Create or edit `frontend/.env` file and add:
   ```
   REACT_APP_MAPBOX_ACCESS_TOKEN=your_actual_access_token_here
   ```
4. Restart the frontend server (React needs to be restarted for .env changes to take effect)

### 3. Map Not Loading
**Error**: Map container shows error message or blank screen

**Solution**: 
- Verify your Mapbox access token is correct in `frontend/.env`
- Check browser console for specific error messages
- Make sure the token has not expired or been revoked
- Ensure you have internet connection (Mapbox loads tiles from their CDN)

### 4. Backend Not Running
**Error**: `Failed to fetch` or connection errors

**Solution**:
1. Check if the backend is running: `curl http://localhost:5001/api/health`
2. If not running, start it: `./start-backend.sh`
3. Make sure you're in the project root directory
4. Check that port 5001 is not already in use
5. **macOS users**: Port 5000 is often used by AirPlay Receiver. We use 5001 to avoid this conflict.

### 5. No Articles Showing
**Solution**:
1. Click the "🔄 Refresh News" button to scrape articles
2. Wait for the scraping to complete (this may take a few minutes)
3. Articles will appear on the map once processed

### 6. OpenAI API Key Not Set
**Warning**: `OPENAI_API_KEY not set. Location detection will be limited.`

**Solution**:
1. Create `backend/.env` file
2. Add: `OPENAI_API_KEY=your_actual_key_here`
3. Restart the backend server

Note: The app will work without OpenAI, but location detection will be less accurate.

## Quick Start Checklist

- [ ] Backend dependencies installed (`pip install -r backend/requirements.txt`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Backend server running (`./start-backend.sh`)
- [ ] Frontend server running (`./start-frontend.sh`)
- [ ] Mapbox access token added to `frontend/.env` as `REACT_APP_MAPBOX_ACCESS_TOKEN`
- [ ] (Optional) OpenAI API key added to `backend/.env` as `OPENAI_API_KEY`

## Testing the Setup

1. **Test Backend**: Open `http://localhost:5001/api/health` in your browser. Should return `{"status":"healthy"}`

2. **Test Frontend**: Open `http://localhost:3000`. Should see the map interface.

3. **Test API Connection**: Open browser console (F12) and check for any CORS or fetch errors.

## Still Having Issues?

1. Check that both servers are running in separate terminal windows
2. Verify ports 3000 and 5001 are not blocked by firewall
3. Check browser console for detailed error messages
4. Make sure you're using a modern browser (Chrome, Firefox, Safari, Edge)
