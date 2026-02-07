import React, { useEffect, useRef, useState } from 'react';
import { loadMapbox } from '../utils/loadMapbox';
import './MapViewer.css';

const MapViewer = ({ articles, selectedArticle, onArticleSelect }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapbox, setMapbox] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);

  // Load Mapbox GL JS
  useEffect(() => {
    console.log('Loading Mapbox GL JS...');
    loadMapbox()
      .then((mapboxgl) => {
        console.log('Mapbox GL JS loaded successfully');
        setMapbox(mapboxgl);
        setLoadingError(null);
      })
      .catch((error) => {
        console.error('Error loading Mapbox:', error);
        setLoadingError(error.message);
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #2a2a2a; color: #fff; flex-direction: column; padding: 20px; text-align: center;">
              <h2>⚠️ Mapbox Access Token Required</h2>
              <p>${error.message}</p>
              <p style="font-size: 12px; color: #aaa; margin-top: 10px;">
                Create a .env file in the frontend directory and add:<br/>
                REACT_APP_MAPBOX_ACCESS_TOKEN=your_access_token_here
              </p>
              <p style="font-size: 11px; color: #888; margin-top: 10px;">
                Current Access Token: ${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ? 'Set (but may be invalid)' : 'Not set'}
              </p>
              <p style="font-size: 11px; color: #888; margin-top: 10px;">
                Get your free access token at: <a href="https://account.mapbox.com/access-tokens/" target="_blank" style="color: #4a9eff;">https://account.mapbox.com/access-tokens/</a>
              </p>
            </div>
          `;
        }
      });
  }, []);

  // Initialize map once Mapbox is loaded
  useEffect(() => {
    if (!mapbox || !mapContainerRef.current || mapRef.current) {
      if (!mapbox) console.log('Waiting for Mapbox to load...');
      if (!mapContainerRef.current) console.log('Waiting for map container...');
      if (mapRef.current) console.log('Map already initialized');
      return;
    }

    console.log('Initializing Mapbox map...');
    
    // Ensure map container has dimensions
    const container = mapContainerRef.current;
    const parent = container.parentElement;
    
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Map container has no dimensions');
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
      const mapInstance = new mapbox.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Dark theme
        center: [0, 20], // [lng, lat]
        zoom: 2,
        attributionControl: true
      });

      console.log('Map initialized successfully');
      
      mapRef.current = mapInstance;

      // Handle map load
      mapInstance.on('load', () => {
        console.log('Map loaded');
      });

      // Handle resize
      const resizeHandler = () => {
        if (mapInstance) {
          mapInstance.resize();
        }
      };
      window.addEventListener('resize', resizeHandler);

      // Cleanup
      return () => {
        window.removeEventListener('resize', resizeHandler);
        if (mapInstance) {
          mapInstance.remove();
        }
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #2a2a2a; color: #fff; flex-direction: column; padding: 20px; text-align: center;">
            <h2>⚠️ Map Initialization Error</h2>
            <p>${error.message}</p>
            <p style="font-size: 12px; color: #aaa; margin-top: 10px;">
              Please check your Mapbox access token and ensure it's valid.
            </p>
          </div>
        `;
      }
    }
  }, [mapbox]);

  // Update markers when articles change
  useEffect(() => {
    if (!mapRef.current || !mapbox || !articles.length) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      return;
    }

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create markers for each article
    articles.forEach(article => {
      if (!article.coordinates || !article.coordinates.lat || !article.coordinates.lng) {
        return;
      }

      const position = [article.coordinates.lng, article.coordinates.lat]; // [lng, lat] for Mapbox

      // Determine marker color based on category
      const markerColor = article.category === 'financial' ? '#4a9eff' : '#ff6b6b';

      // Create a custom marker element
      const el = document.createElement('div');
      el.className = 'mapbox-marker';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = markerColor;
      el.style.border = '2px solid #ffffff';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      
      // Add animation for selected article
      if (selectedArticle?.id === article.id) {
        el.style.animation = 'bounce 1s infinite';
        el.style.width = '20px';
        el.style.height = '20px';
      }

      // Create marker
      const marker = new mapbox.Marker(el)
        .setLngLat(position)
        .addTo(map);

      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'marker-info';
      popupContent.innerHTML = `
        <h3>${article.title}</h3>
        <p>${article.location}</p>
        <p class="category">${article.category}</p>
        <a href="${article.url}" target="_blank">Read more</a>
      `;

      // Create popup
      const popup = new mapbox.Popup({ offset: 25, closeOnClick: true })
        .setDOMContent(popupContent);

      // Add click listener
      marker.setPopup(popup);
      
      marker.getElement().addEventListener('click', () => {
        onArticleSelect(article);
        map.flyTo({
          center: position,
          zoom: 10,
          duration: 1000
        });
      });

      markersRef.current.push(marker);
    });

    // Fit map to show all markers if there are any
    if (markersRef.current.length > 0) {
      const bounds = new mapbox.LngLatBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getLngLat());
      });
      
      // Only fit bounds if there's more than one marker or if no article is selected
      if (markersRef.current.length > 1 || !selectedArticle) {
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 10
        });
      }
    }

  }, [mapbox, articles, selectedArticle, onArticleSelect]);

  return (
    <div className="map-viewer" style={{ width: '100%', height: '100%', position: 'relative', minHeight: '400px' }}>
      {!mapbox && !loadingError && (
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
        ref={mapContainerRef} 
        className="mapbox-map-container" 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '400px',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          display: mapbox ? 'block' : 'none'
        }} 
      />
    </div>
  );
};

export default MapViewer;
