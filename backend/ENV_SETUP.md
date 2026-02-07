# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# OpenRouter API Key (REQUIRED)
# Get a free API key at: https://openrouter.ai/
# Sign up and create an API key, then paste it here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Google Maps API Key (OPTIONAL - for location services)
# Only needed if you want enhanced location detection
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Port for the backend server (OPTIONAL - defaults to 5004)
PORT=5004
```

## Getting Your OpenRouter API Key

1. Go to https://openrouter.ai/
2. Sign up for a free account
3. Navigate to your API keys section
4. Create a new API key
5. Copy the key and paste it in your `.env` file as `OPENROUTER_API_KEY`

## Free Models Used

The application uses free models available on OpenRouter (with `:free` suffix):
- **Primary**: `deepseek/deepseek-r1-0528:free` - Currently the only confirmed working free model
- **Note**: Most other free models (microsoft/phi-3-mini, google/gemini-2.0-flash-exp, etc.) return 404 errors
- **Note**: `openai/gpt-oss-120b:free` requires data policy configuration at https://openrouter.ai/settings/privacy

**Note**: Some models like `openai/gpt-oss-120b:free` require data policy configuration at https://openrouter.ai/settings/privacy. The app automatically tries alternative models if the primary one requires this configuration.

These models are completely free to use and don't require any payment. The `:free` suffix ensures you're using the free tier.

## Notes

- The `.env` file is already in `.gitignore` so it won't be committed to git
- Make sure to restart the backend server after updating the `.env` file
- If you don't set `OPENROUTER_API_KEY`, the app will show errors when trying to use AI features
