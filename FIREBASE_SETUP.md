# Firebase Setup Guide

This guide will help you set up Firebase for authentication and data storage.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter a project name (e.g., "Global News Explorer")
4. Follow the setup wizard:
   - Disable Google Analytics (optional, for simplicity)
   - Click "Create project"
5. Wait for project creation to complete

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Click on it, enable it, and save
   - **Google**: Click on it, enable it, and save
     - You'll need to provide a support email
     - The OAuth consent screen will be configured automatically

## Step 3: Create Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to you)
5. Click "Enable"

### Set up Firestore Security Rules

1. Go to "Firestore Database" → "Rules"
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Portfolios collection - users can only read/write their own portfolio
    match /portfolios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app
5. Register your app:
   - App nickname: "News Explorer Web"
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"
6. **Copy the Firebase configuration object** - it looks like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

## Step 5: Add Configuration to Your Project

1. Open `frontend/.env` file
2. Add these environment variables (replace with your actual values):
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key_here
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
   ```
3. Save the file
4. **Restart your frontend server** (React needs to restart to pick up .env changes)

## Step 6: Install Firebase Dependencies

The Firebase SDK is already added to `package.json`. Just run:

```bash
cd frontend
npm install
```

## Step 7: Test

1. Start your frontend server
2. Try signing up with email/password
3. Try signing in with Google
4. Add some stocks to your portfolio
5. Check Firebase Console → Firestore Database to see your data

## Data Structure

Your Firestore database will have this structure:

```
portfolios/
  └── {userId}/
      └── stocks: [
          { symbol: "AAPL", name: "Apple Inc.", price: 0, change: 0 },
          ...
        ]
```

## Security Notes

- The Firestore security rules ensure users can only access their own portfolios
- Authentication is handled by Firebase (secure and scalable)
- All data is stored in Firebase (no local JSON files needed)

## Troubleshooting

### Error: "Firebase: Error (auth/configuration-not-found)" or "CONFIGURATION_NOT_FOUND"
This error means Firebase can't find your project configuration. Check the following:

1. **Verify all environment variables are set correctly:**
   - Open `frontend/.env` and make sure all 6 Firebase config values are present
   - Make sure there are no typos or extra spaces
   - Values should NOT include placeholder text like "your_", "123456789", etc.

2. **Verify the API key matches your project:**
   - Go to Firebase Console → Project Settings
   - Scroll to "Your apps" section
   - Click on your web app
   - Compare the `apiKey` in the config with `REACT_APP_FIREBASE_API_KEY` in your `.env`
   - They must match exactly

3. **Check API key restrictions (if any):**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Find your API key (the one starting with `AIza...`)
   - If "API restrictions" is enabled, make sure "Firebase Authentication API" is allowed
   - Or temporarily remove restrictions to test

4. **Verify project ID matches:**
   - In Firebase Console → Project Settings, check the "Project ID"
   - Compare with `REACT_APP_FIREBASE_PROJECT_ID` in your `.env`
   - They must match exactly

5. **Make sure Authentication is enabled:**
   - Go to Firebase Console → Authentication
   - Click "Get started" if you haven't already
   - Enable "Email/Password" and "Google" providers

6. **Restart your frontend server:**
   - After making any changes to `.env`, you MUST restart the React dev server
   - Stop the server (Ctrl+C) and run `npm start` again

### Error: "Missing or insufficient permissions"
- Check your Firestore security rules
- Make sure the user is authenticated

### Google Sign-In not working
- Make sure Google provider is enabled in Firebase Authentication
- Firebase handles Google OAuth automatically (no need for separate Google Cloud setup)
- If you see "CONFIGURATION_NOT_FOUND", follow the troubleshooting steps above

### Data not saving
- Check browser console for errors
- Verify Firestore security rules allow write access
- Make sure user is authenticated

### API Key Issues
If your API key is restricted in Google Cloud Console:
- Make sure "Firebase Authentication API" is in the allowed list
- Or use an unrestricted key for development
- The key must be from the same Google Cloud project as your Firebase project

## Migration from Local Auth

If you had portfolios stored locally:
1. The old `backend/portfolios.json` file is no longer used
2. Users will need to sign up again (or sign in if they had accounts)
3. Portfolios will be stored in Firestore going forward
