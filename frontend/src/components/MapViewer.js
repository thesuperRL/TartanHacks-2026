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
    loadGoogleMaps()
      .then((maps) => {
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
            </div>
          `;
        }
      });
  }, []);

  // Initialize map once Google Maps is loaded
  useEffect(() => {
    if (!googleMaps || !mapRef.current) return;

    // Initialize map
    const mapInstance = new googleMaps.Map(mapRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      styles: [
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ color: '#242424' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#000000' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#ffffff' }]
        }
      ]
    });

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
    <div className="map-viewer">
      <div ref={mapRef} className="map-container" />
      <div ref={streetViewRef} className="street-view-container" />
      {isStreetView && (
        <div className="street-view-overlay">
          <p>Street View Mode - Double click on map to exit</p>
        </div>
      )}
    </div>
  );
};

export default MapViewer;
