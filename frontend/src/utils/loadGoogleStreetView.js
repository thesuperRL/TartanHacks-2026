/**
 * Dynamically load Google Street View API (via Google Maps API)
 * Street View is part of the Google Maps JavaScript API
 * @returns {Promise} Resolves when Google Maps API (with Street View) is loaded
 */
import { loadGoogleMaps } from './loadGoogleMaps';

export const loadGoogleStreetView = () => {
  return new Promise((resolve, reject) => {
    // Street View is part of Google Maps API, so we can use loadGoogleMaps
    // The Street View service is available once Google Maps is loaded
    loadGoogleMaps()
      .then((maps) => {
        // Verify Street View is available
        if (maps && maps.StreetViewService && maps.StreetViewPanorama) {
          resolve(maps);
        } else {
          reject(new Error('Google Street View API is not available. Make sure the Google Maps API key has Street View enabled.'));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};
