import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthModal.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const AuthModal = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = React.useRef(null);

  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google?.accounts?.id) {
        setGoogleReady(true);
        initializeGoogleSignIn();
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initializeGoogleSignIn = () => {
    if (!window.google?.accounts?.id) return;
    
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.warn('REACT_APP_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.');
      return;
    }
    
    if (googleButtonRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSignIn,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render the button
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            locale: 'en',
            shape: 'rectangular'
          }
        );
      } catch (err) {
        console.error('Error initializing Google Sign-In:', err);
        setError('Google Sign-In button could not be rendered. Please use the fallback button or email/password.');
      }
    }
  };

  // Re-initialize when button ref is ready
  useEffect(() => {
    if (googleReady && googleButtonRef.current) {
      initializeGoogleSignIn();
    }
  }, [googleReady, googleButtonRef.current]);

  const handleGoogleSignIn = async (response) => {
    setGoogleLoading(true);
    setError('');

    try {
      // Check if response has an error
      if (response.error) {
        if (response.error === 'popup_closed_by_user') {
          setError('Sign-in was cancelled. Please try again.');
          setGoogleLoading(false);
          return;
        }
        throw new Error(`Google sign-in error: ${response.error}`);
      }

      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // Send the credential to backend for verification
      const backendResponse = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Google sign-in failed on server');
      }

      const data = await backendResponse.json();
      
      // Login with user data
      login(data.user, data.token);
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.message.includes('invalid_client') || err.message.includes('no registered origin')) {
        setError(
          'Google OAuth is not configured correctly.\n\n' +
          'Please:\n' +
          '1. Go to https://console.cloud.google.com/\n' +
          '2. Add http://localhost:3000 to Authorized JavaScript origins\n' +
          '3. Make sure REACT_APP_GOOGLE_CLIENT_ID is set in frontend/.env\n' +
          '4. Restart the frontend server\n\n' +
          'See GOOGLE_OAUTH_SETUP.md for detailed instructions.'
        );
      } else {
        setError(err.message || 'Failed to sign in with Google. Please try again or use email/password.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleClickFallback = () => {
    if (!window.google?.accounts) {
      setError('Google Sign-In is not loaded. Please refresh the page or use email/password.');
      return;
    }

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError(
        'Google OAuth is not configured.\n\n' +
        'To enable Google Sign-In:\n' +
        '1. Go to https://console.cloud.google.com/\n' +
        '2. Create/select a project\n' +
        '3. Enable "Google Identity Services API"\n' +
        '4. Create OAuth 2.0 Client ID (Web application)\n' +
        '5. Add authorized origins: http://localhost:3000\n' +
        '6. Copy Client ID to frontend/.env as REACT_APP_GOOGLE_CLIENT_ID\n\n' +
        'For now, please use email/password.'
      );
      return;
    }

    setGoogleLoading(true);
    setError('');

    // Use Google Identity Services popup flow (simpler, no redirect URIs needed)
    try {
      // Initialize if not already done
      if (!window.google.accounts.id._clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSignIn,
        });
      }

      // Trigger the sign-in popup
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          // One Tap not available, use button click flow
          // This will be handled by the rendered button
          setError('Please click the Google button above to sign in.');
          setGoogleLoading(false);
        } else if (notification.isSkippedMoment()) {
          // User dismissed One Tap, use button
          setError('Please click the Google button above to sign in.');
          setGoogleLoading(false);
        } else if (notification.isDismissedMoment()) {
          setGoogleLoading(false);
        }
      });
    } catch (err) {
      console.error('Error initializing Google OAuth:', err);
      setError(
        'Failed to initialize Google Sign-In.\n\n' +
        'Make sure:\n' +
        '1. REACT_APP_GOOGLE_CLIENT_ID is set in frontend/.env\n' +
        '2. Your origin (http://localhost:3000) is added to authorized origins in Google Cloud Console\n' +
        '3. Google Identity Services API is enabled\n\n' +
        'Please try again or use email/password.'
      );
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const body = isLogin 
        ? { email, password }
        : { email, password, name };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      login(data.user, data.token);
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
          <div className="google-signin-container">
            {process.env.REACT_APP_GOOGLE_CLIENT_ID && googleReady ? (
              <>
                <div ref={googleButtonRef} className="google-button-wrapper"></div>
                {!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '8px', textAlign: 'center' }}>
                    ⚠️ Client ID not configured. See GOOGLE_OAUTH_SETUP.md
                  </p>
                )}
              </>
            ) : (
              <button
                className="google-signin-button"
                onClick={handleGoogleClickFallback}
                disabled={googleLoading || loading}
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
            )}
          </div>
          
          {error && error.includes('no registered origin') && (
            <div className="error-message" style={{ marginBottom: '16px' }}>
              <strong>⚠️ Google OAuth Setup Required</strong>
              <br /><br />
              The error "no registered origin" means your Google OAuth client is not configured correctly.
              <br /><br />
              <strong>Quick Fix:</strong>
              <br />
              1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff' }}>Google Cloud Console → Credentials</a>
              <br />
              2. Click on your OAuth 2.0 Client ID
              <br />
              3. Under "Authorized JavaScript origins", click "ADD URI"
              <br />
              4. Add: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>http://localhost:3000</code>
              <br />
              5. Click "SAVE"
              <br />
              6. Make sure <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>REACT_APP_GOOGLE_CLIENT_ID</code> is set in <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>frontend/.env</code>
              <br />
              7. Restart your frontend server
              <br /><br />
              See <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>GOOGLE_OAUTH_SETUP.md</code> for detailed instructions.
            </div>
          )}

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

            <button type="submit" className="auth-submit-button" disabled={loading}>
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
