#!/bin/bash

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Creating from template..."
    echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
    echo "REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here" >> .env
    echo "Please edit frontend/.env and add your Google Maps API key"
fi

# Run the React app
echo "Starting frontend server on http://localhost:3000"
npm start
