import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../utils/loadGoogleMaps';
import './MapViewer.css';

const MapViewer = ({ articles, selectedArticle, onArticleSelect }) => {
  const mapRef = useRef(null);
  const streetViewRef = useRef(null);
  const [map, setMap] = useState(null);
  const [streetView, setStreetView] = useState(null);
  const [isStreetView, setIsStreetView] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [googleMaps, setGoogleMaps] = useState(null);
  const [loadingError, setLoadingError] = useState(null);

  // Load Google Maps API
  useEffect(() => {
    console.log('Loading Google Maps API...');
    loadGoogleMaps()
      .then((maps) => {
        console.log('Google Maps API loaded successfully');
        setGoogleMaps(maps);
        setLoadingError(null);
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
        setLoadingError(error.message);
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #2a2a2a; color: #fff; flex-direction: column; padding: 20px; text-align: center;">
              <h2>⚠️ Google Maps API Key Required</h2>
              <p>${error.message}</p>
              <p style="font-size: 12px; color: #aaa; margin-top: 10px;">
                Create a .env file in the frontend directory and add:<br/>
                REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
              </p>
              <p style="font-size: 11px; color: #888; margin-top: 10px;">
                Current API Key: ${process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'Set (but may be invalid)' : 'Not set'}
              </p>
            </div>
          `;
        }
      });
  }, []);

  // Initialize map once Google Maps is loaded
  useEffect(() => {
    if (!googleMaps || !mapRef.current) {
      if (!googleMaps) console.log('Waiting for Google Maps to load...');
      if (!mapRef.current) console.log('Waiting for map container...');
      return;
    }

    console.log('Initializing Google Map...');
    
    // Ensure map container has dimensions
    const container = mapRef.current;
    const parent = container.parentElement;
    
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Map container has no dimensions');
      console.log('Container:', container.offsetWidth, 'x', container.offsetHeight);
      console.log('Parent:', parent?.offsetWidth, 'x', parent?.offsetHeight);
      
      // Force dimensions from parent
      if (parent) {
        const parentWidth = parent.offsetWidth || parent.clientWidth || window.innerWidth;
        const parentHeight = parent.offsetHeight || parent.clientHeight || window.innerHeight;
        container.style.width = `${parentWidth}px`;
        container.style.height = `${parentHeight}px`;
        console.log('Set container dimensions to:', parentWidth, 'x', parentHeight);
      } else {
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.minHeight = '400px';
      }
    }

    try {
      // Initialize map
      const mapInstance = new googleMaps.Map(mapRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      // Use default map style - custom dark styles were hiding map tiles
      // If you want dark mode, use mapTypeId: 'satellite' or apply styles more carefully
    });

      console.log('Map initialized successfully');
      console.log('Map container dimensions:', mapRef.current.offsetWidth, 'x', mapRef.current.offsetHeight);
      
      // Initialize street view
      const streetViewInstance = new googleMaps.StreetViewPanorama(streetViewRef.current, {
        position: { lat: 40.7128, lng: -74.0060 },
        pov: { heading: 0, pitch: 0 },
        visible: false
      });

      setMap(mapInstance);
      setStreetView(streetViewInstance);

      // Link street view to map
      mapInstance.setStreetView(streetViewInstance);
      
      // Trigger a resize event to ensure map renders properly
      const triggerResize = () => {
        if (window.google && window.google.maps && window.google.maps.event && mapInstance) {
          window.google.maps.event.trigger(mapInstance, 'resize');
          console.log('Map resize triggered');
        }
      };
      
      // Trigger resize after a short delay to ensure DOM is ready
      setTimeout(triggerResize, 100);
      setTimeout(triggerResize, 500);
      
      // Also trigger on window resize
      const resizeHandler = () => triggerResize();
      window.addEventListener('resize', resizeHandler);
      
      return () => {
        window.removeEventListener('resize', resizeHandler);
      };

    // Add double-click to enter street view
    mapInstance.addListener('dblclick', (e) => {
      const position = e.latLng;
      streetViewInstance.setPosition(position);
      streetViewInstance.setVisible(true);
      setIsStreetView(true);
    });

    // Add exit button
    const exitButton = document.createElement('button');
    exitButton.textContent = 'Exit Street View';
    exitButton.className = 'exit-street-view';
    exitButton.onclick = () => {
      streetViewInstance.setVisible(false);
      setIsStreetView(false);
    };
    mapRef.current.appendChild(exitButton);

      return () => {
        if (exitButton.parentNode) {
          exitButton.parentNode.removeChild(exitButton);
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #2a2a2a; color: #fff; flex-direction: column; padding: 20px; text-align: center;">
            <h2>⚠️ Map Initialization Error</h2>
            <p>${error.message}</p>
            <p style="font-size: 12px; color: #aaa; margin-top: 10px;">
              Please check your Google Maps API key and ensure it's valid.
            </p>
          </div>
        `;
      }
    }
  }, [googleMaps]);

  useEffect(() => {
    if (!map || !googleMaps || !articles.length) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    const newMarkers = articles.map(article => {
      if (!article.coordinates || !article.coordinates.lat || !article.coordinates.lng) {
        return null;
      }

      const position = {
        lat: article.coordinates.lat,
        lng: article.coordinates.lng
      };

      // Create custom marker icon based on category
      const iconColor = article.category === 'financial' ? '#4a9eff' : '#ff6b6b';
      const icon = {
        path: googleMaps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: iconColor,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      };

      const marker = new googleMaps.Marker({
        position: position,
        map: map,
        icon: icon,
        title: article.title,
        animation: selectedArticle?.id === article.id ? googleMaps.Animation.BOUNCE : null
      });

      // Add click listener
      marker.addListener('click', () => {
        onArticleSelect(article);
        map.setCenter(position);
        map.setZoom(10);
      });

      // Add info window
      const infoWindow = new googleMaps.InfoWindow({
        content: `
          <div class="marker-info">
            <h3>${article.title}</h3>
            <p>${article.location}</p>
            <p class="category">${article.category}</p>
            <a href="${article.url}" target="_blank">Read more</a>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      return marker;
    }).filter(Boolean);

    setMarkers(newMarkers);

    // Add markers to street view if available
    if (streetView && isStreetView) {
      newMarkers.forEach(marker => {
        marker.setMap(streetView);
      });
    }
  }, [map, articles, selectedArticle, googleMaps, streetView, isStreetView, onArticleSelect]);

  return (
    <div className="map-viewer" style={{ width: '100%', height: '100%', position: 'relative', minHeight: '400px' }}>
      {!googleMaps && !loadingError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#2a2a2a',
          color: '#fff',
          flexDirection: 'column',
          position: 'absolute',
          width: '100%',
          zIndex: 10
        }}>
          <p>Loading map...</p>
        </div>
      )}
      {loadingError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#2a2a2a',
          color: '#fff',
          flexDirection: 'column',
          position: 'absolute',
          width: '100%',
          zIndex: 10
        }}>
          <p>Error: {loadingError}</p>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="google-map-container" 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '400px',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          display: googleMaps ? 'block' : 'none'
        }} 
      />
      <div 
        ref={streetViewRef} 
        className="street-view-container" 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: isStreetView ? 3 : 0,
          visibility: isStreetView ? 'visible' : 'hidden'
        }} 
      />
      {isStreetView && (
        <div className="street-view-overlay">
          <p>Street View Mode - Double click on map to exit</p>
        </div>
      )}
    </div>
  );
};

export default MapViewer;
