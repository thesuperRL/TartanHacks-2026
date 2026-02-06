/**
 * Dynamically load Google Maps JavaScript API
 * @returns {Promise} Resolves when Google Maps API is loaded
 */
export const loadGoogleMaps = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }

    // Check if script is already being loaded
    if (window.googleMapsLoading) {
      window.googleMapsLoading.then(resolve).catch(reject);
      return;
    }

    // Get API key from environment variable
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      reject(new Error('Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY in your .env file'));
      return;
    }

    // Create loading promise
    window.googleMapsLoading = new Promise((resolveLoading, rejectLoading) => {
      // Create a unique callback name
      const callbackName = `googleMapsCallback_${Date.now()}`;
      
      // Set up the callback
      window[callbackName] = () => {
        if (window.google && window.google.maps) {
          resolveLoading(window.google.maps);
          // Clean up
          delete window[callbackName];
        } else {
          rejectLoading(new Error('Google Maps API failed to load'));
          delete window[callbackName];
        }
      };

      // Create script element with callback for best-practice loading
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}&loading=async`;
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        rejectLoading(new Error('Failed to load Google Maps API script'));
        delete window[callbackName];
      };

      // Add script to document
      document.head.appendChild(script);
    });

    window.googleMapsLoading.then(resolve).catch(reject);
  });
};
