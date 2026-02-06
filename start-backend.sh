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

# Upgrade pip first
echo "Upgrading pip..."
pip install --upgrade pip --quiet

# Check if Flask is installed, if not install all dependencies
echo "Checking dependencies..."
if ! python -c "import flask" 2>/dev/null; then
    echo "Installing dependencies from requirements.txt..."
    pip install -r requirements.txt --upgrade
    if [ $? -eq 0 ]; then
        touch venv/.installed
        echo "✓ Dependencies installed successfully"
    else
        echo "✗ Error installing dependencies. Please check requirements.txt"
        exit 1
    fi
else
    # Always upgrade key packages for Python 3.13 compatibility
    echo "Upgrading packages for Python 3.13 compatibility..."
    pip install --upgrade "feedparser>=6.0.11" "openai>=1.12.0" 2>/dev/null || {
        pip install --upgrade feedparser
        pip install --upgrade openai
    }
    echo "✓ Dependencies check complete"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Creating from example..."
    echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
    echo "Please edit backend/.env and add your OpenAI API key"
fi

# Run the Flask app
# Using port 5001 to avoid conflict with macOS AirPlay Receiver on port 5000
echo ""
echo "Starting backend server on http://localhost:5001"
echo "Note: Using port 5001 to avoid macOS AirPlay Receiver conflict"
echo ""
python app.py
