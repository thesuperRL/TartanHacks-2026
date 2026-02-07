/**
 * Dynamically load Mapbox GL JS
 * @returns {Promise} Resolves when Mapbox GL JS is loaded
 */
export const loadMapbox = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.mapboxgl) {
      resolve(window.mapboxgl);
      return;
    }

    // Check if script is already being loaded
    if (window.mapboxLoading) {
      window.mapboxLoading.then(resolve).catch(reject);
      return;
    }

    // Get API key from environment variable
    const accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

    if (!accessToken || accessToken === 'your_mapbox_access_token_here') {
      reject(new Error('Mapbox access token not configured. Please set REACT_APP_MAPBOX_ACCESS_TOKEN in your .env file'));
      return;
    }

    // Create loading promise
    window.mapboxLoading = new Promise((resolveLoading, rejectLoading) => {
      // Load Mapbox GL JS CSS
      const cssLink = document.createElement('link');
      cssLink.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css';
      cssLink.rel = 'stylesheet';
      document.head.appendChild(cssLink);

      // Load Mapbox GL JS script
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // Wait a bit for the library to fully initialize
        setTimeout(() => {
          if (window.mapboxgl && window.mapboxgl.Map) {
            // Set the access token
            window.mapboxgl.accessToken = accessToken;
            resolveLoading(window.mapboxgl);
          } else {
            rejectLoading(new Error('Mapbox GL JS failed to load - Map constructor not found'));
          }
        }, 100);
      };

      script.onerror = () => {
        rejectLoading(new Error('Failed to load Mapbox GL JS script'));
      };

      // Add script to document
      document.head.appendChild(script);
    });

    window.mapboxLoading.then(resolve).catch(reject);
  });
};
