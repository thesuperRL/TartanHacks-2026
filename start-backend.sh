#!/bin/bash

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Creating from example..."
    echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
    echo "Please edit backend/.env and add your OpenAI API key"
fi

# Run the Flask app
echo "Starting backend server on http://localhost:5000"
python app.py
