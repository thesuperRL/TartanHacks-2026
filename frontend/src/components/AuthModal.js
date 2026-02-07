import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthModal.css';

const AuthModal = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check if Firebase is configured
  const isFirebaseConfigured = 
    process.env.REACT_APP_FIREBASE_API_KEY &&
    process.env.REACT_APP_FIREBASE_API_KEY !== 'your_firebase_api_key' &&
    !process.env.REACT_APP_FIREBASE_API_KEY.includes('123456789');

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    setError('');

    const result = await signInWithGoogle();
    
    if (!result.success) {
      let errorMessage = result.error || 'Failed to sign in with Google. Please try again.';
      
      // Handle specific Firebase configuration errors
      if (errorMessage.includes('CONFIGURATION_NOT_FOUND') || 
          errorMessage.includes('configuration-not-found') ||
          errorMessage.includes('auth/configuration-not-found')) {
        errorMessage = `Firebase Configuration Error: The API key or project settings don't match.\n\n` +
          `Please verify:\n` +
          `1. All Firebase config values in frontend/.env match your Firebase project\n` +
          `2. Firebase Authentication is enabled in Firebase Console\n` +
          `3. Google Sign-In provider is enabled in Authentication → Sign-in method\n` +
          `4. The API key is not restricted (or if restricted, allows Firebase Authentication API)\n` +
          `5. The project ID matches between .env and Firebase Console\n\n` +
          `See FIREBASE_SETUP.md for detailed setup instructions.`;
      } else if (errorMessage.includes('auth/popup-closed-by-user')) {
        errorMessage = 'Sign-in popup was closed. Please try again.';
      } else if (errorMessage.includes('auth/popup-blocked')) {
        errorMessage = 'Popup was blocked by your browser. Please allow popups for this site.';
      }
      
      setError(errorMessage);
    }
    // If successful, the AuthContext will handle the state update via onAuthStateChanged
    
    setGoogleLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password, name);
      }

      if (!result.success) {
        // Format Firebase error messages to be more user-friendly
        let errorMessage = result.error;
        if (errorMessage.includes('auth/user-not-found')) {
          errorMessage = 'No account found with this email. Please sign up first.';
        } else if (errorMessage.includes('auth/wrong-password')) {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (errorMessage.includes('auth/email-already-in-use')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (errorMessage.includes('auth/weak-password')) {
          errorMessage = 'Password should be at least 6 characters.';
        } else if (errorMessage.includes('auth/invalid-email')) {
          errorMessage = 'Invalid email address.';
        } else if (errorMessage.includes('CONFIGURATION_NOT_FOUND') || 
                   errorMessage.includes('configuration-not-found') ||
                   errorMessage.includes('auth/configuration-not-found')) {
          errorMessage = `Firebase Configuration Error: The API key or project settings don't match.\n\n` +
            `Please verify:\n` +
            `1. All Firebase config values in frontend/.env match your Firebase project\n` +
            `2. Firebase Authentication is enabled in Firebase Console\n` +
            `3. The API key is not restricted (or if restricted, allows Firebase Authentication API)\n` +
            `4. The project ID matches between .env and Firebase Console\n\n` +
            `See FIREBASE_SETUP.md for detailed setup instructions.`;
        }
        setError(errorMessage);
      }
      // If successful, the AuthContext will handle the state update via onAuthStateChanged
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Sign in to explore global news' : 'Sign up to get started'}</p>
        </div>

        <div className="auth-modal-content">
          {!isFirebaseConfigured && (
            <div className="error-message" style={{ marginBottom: '20px', textAlign: 'left' }}>
              <strong>⚠️ Firebase Not Configured</strong>
              <br /><br />
              Firebase configuration is missing or incomplete. Please:
              <br /><br />
              1. Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff' }}>Firebase Console</a>
              <br />
              2. Create a project and get your configuration
              <br />
              3. Add Firebase config to <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>frontend/.env</code>
              <br />
              4. Restart the frontend server
              <br /><br />
              See <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>FIREBASE_SETUP.md</code> for detailed instructions.
            </div>
          )}
          
          <button
            className="google-signin-button"
            onClick={handleGoogleClick}
            disabled={googleLoading || loading || !isFirebaseConfigured}
          >
            {googleLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="auth-submit-button" disabled={loading || !isFirebaseConfigured}>
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                isLogin ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          <div className="auth-switch">
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => setIsLogin(false)} className="auth-link">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => setIsLogin(true)} className="auth-link">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
