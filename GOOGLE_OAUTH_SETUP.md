# Google OAuth Setup Guide

This guide will help you set up Google OAuth for the authentication system.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Survey")
5. Click "Create"

## Step 2: Enable Google Identity Services API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Identity Services API"
3. Click on it and click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" (unless you have a Google Workspace)
   - Fill in the required fields:
     - App name: "Survey"
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Add scopes: `email`, `profile`, `openid`
   - Click "Save and Continue"
   - Add test users (your email) if in testing mode
   - Click "Save and Continue"
   - Review and go back to dashboard

4. Back in Credentials, click "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Name it (e.g., "Survey Web Client")
7. **IMPORTANT**: Add these Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - (For production, add your domain)
8. **IMPORTANT**: Add these Authorized redirect URIs:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - (For production, add your domain)
9. Click "Create"
10. **Copy the Client ID** (you'll need this)

## Step 4: Add Client ID to Your Project

1. Open `frontend/.env` file
2. Add or update this line:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
   ```
3. Replace `your_client_id_here` with the Client ID you copied
4. Save the file
5. **Restart your frontend server** (React needs to restart to pick up .env changes)

## Step 5: Test

1. Make sure your frontend server is running on `http://localhost:3000`
2. Click "Continue with Google" button
3. You should see the Google sign-in popup
4. Sign in with your Google account
5. You should be logged in!

## Troubleshooting

### Error: "no registered origin"
- Make sure you added `http://localhost:3000` to Authorized JavaScript origins
- Make sure you restarted the frontend server after adding the Client ID

### Error: "invalid_client"
- Double-check that the Client ID in `.env` is correct
- Make sure there are no extra spaces or quotes
- Make sure you restarted the frontend server

### Error: "redirect_uri_mismatch"
- Make sure you added `http://localhost:3000` to Authorized redirect URIs
- Check that the URL in your browser matches exactly (no trailing slash)

### Button doesn't appear
- Check browser console for errors
- Make sure `REACT_APP_GOOGLE_CLIENT_ID` is set in `.env`
- Make sure you restarted the frontend server

## Production Setup

For production, you'll need to:
1. Add your production domain to Authorized JavaScript origins
2. Add your production domain to Authorized redirect URIs
3. Update the OAuth consent screen to be published (not just in testing)
4. Update `.env` with production Client ID (or use environment variables)

## Notes

- The Client ID is safe to expose in frontend code (it's public)
- Never share your Client Secret (we don't use it for this flow)
- For local development, `http://localhost:3000` must be in authorized origins
