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

  // Expose street view function globally for info window buttons
  useEffect(() => {
    if (googleMaps && streetView) {
      window.enterStreetView = (lat, lng) => {
        const position = { lat, lng };
        const streetViewService = new googleMaps.StreetViewService();
        streetViewService.getPanorama({ location: position, radius: 50 }, (data, status) => {
          if (status === 'OK') {
            console.log('Street view available, activating...');
            streetView.setPosition(position);
            streetView.setPov({ heading: 270, pitch: 0 });
            streetView.setVisible(true);
            setIsStreetView(true);
          } else {
            console.log('Street view not available at this location:', status);
            alert('Street View imagery is not available at this location. Try clicking on a road or street.');
          }
        });
      };
    }
    return () => {
      delete window.enterStreetView;
    };
  }, [googleMaps, streetView]);

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
      
      // Ensure street view container has dimensions before initializing
      if (!streetViewRef.current) {
        console.error('Street view container ref is null');
        return;
      }
      
      const svContainer = streetViewRef.current;
      const parent = svContainer.parentElement;
      if (parent) {
        const parentWidth = parent.offsetWidth || parent.clientWidth || window.innerWidth;
        const parentHeight = parent.offsetHeight || parent.clientHeight || window.innerHeight;
        svContainer.style.width = `${parentWidth}px`;
        svContainer.style.height = `${parentHeight}px`;
        svContainer.style.minHeight = '400px';
        svContainer.style.position = 'absolute';
        svContainer.style.top = '0';
        svContainer.style.left = '0';
        console.log('Street view container dimensions:', parentWidth, 'x', parentHeight);
      }
      
      // Initialize street view
      const streetViewInstance = new googleMaps.StreetViewPanorama(streetViewRef.current, {
        position: { lat: 40.7128, lng: -74.0060 },
        pov: { heading: 0, pitch: 0 },
        visible: false,
        enableCloseButton: false, // We'll handle exit with our own button
        addressControl: false,
        linksControl: true,
        panControl: true
      });
      
      console.log('Street view initialized on container:', streetViewRef.current);

      setMap(mapInstance);
      setStreetView(streetViewInstance);
      
      // Link street view to map
      mapInstance.setStreetView(streetViewInstance);
      
      // Trigger street view resize after initialization
      setTimeout(() => {
        if (streetViewInstance && window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.trigger(streetViewInstance, 'resize');
          console.log('Street view resize triggered');
        }
      }, 200);
      
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

    // Add double-click to enter street view
    const dblclickListener = mapInstance.addListener('dblclick', (e) => {
      const position = e.latLng;
      console.log('Double-click detected at:', position.lat(), position.lng());
      
      // Check if street view is available at this location
      const streetViewService = new googleMaps.StreetViewService();
      streetViewService.getPanorama({ location: position, radius: 50 }, (data, status) => {
        if (status === 'OK' && data && data.location) {
          console.log('Street view available, activating...', data.location);
          
          // Use the actual panorama location from the service
          const panoramaLocation = data.location.latLng;
          
          // Ensure container is visible and sized
          if (streetViewRef.current) {
            streetViewRef.current.style.display = 'block';
            streetViewRef.current.style.visibility = 'visible';
            streetViewRef.current.style.zIndex = '10';
          }
          
          // Set position and make visible
          streetViewInstance.setPosition(panoramaLocation);
          streetViewInstance.setPov({ heading: 270, pitch: 0 });
          streetViewInstance.setVisible(true);
          setIsStreetView(true);
          
          // Wait a bit then trigger resize to ensure street view renders
          setTimeout(() => {
            if (window.google && window.google.maps && window.google.maps.event) {
              window.google.maps.event.trigger(streetViewInstance, 'resize');
              console.log('Street view resize triggered after activation');
            }
          }, 300);
        } else {
          console.log('Street view not available at this location:', status);
          alert('Street View imagery is not available at this location. Try clicking on a road or street.');
        }
      });
    });
    
    // Listen for street view errors
    streetViewInstance.addListener('error', (error) => {
      console.error('Street view error:', error);
      if (error === 'ZERO_RESULTS' || error === 'NOT_FOUND') {
        alert('Street View imagery is not available at this location.');
        streetViewInstance.setVisible(false);
        setIsStreetView(false);
      } else if (error === 'UNKNOWN_ERROR') {
        console.warn('Street view unknown error - may be rate limiting (429)');
        // Show a message but don't auto-exit - user can manually exit
        // The loading overlay will show the issue
      }
    });
    
    // Track if street view has loaded successfully
    let streetViewLoaded = false;
    streetViewInstance.addListener('pano_changed', () => {
      streetViewLoaded = true;
      console.log('Street view panorama loaded, pano ID:', streetViewInstance.getPano());
    });
    
    // Listen for when street view is ready
    streetViewInstance.addListener('pano_changed', () => {
      console.log('Street view panorama changed, pano ID:', streetViewInstance.getPano());
    });
    
    // Listen for street view visibility changes
    streetViewInstance.addListener('visible_changed', () => {
      const isVisible = streetViewInstance.getVisible();
      console.log('Street view visibility changed:', isVisible);
      setIsStreetView(isVisible);
      if (streetViewRef.current) {
        if (isVisible) {
          streetViewRef.current.style.display = 'block';
          streetViewRef.current.style.visibility = 'visible';
          streetViewRef.current.style.zIndex = '10';
          // Ensure container has proper dimensions
          const parent = streetViewRef.current.parentElement;
          if (parent) {
            const parentWidth = parent.offsetWidth || parent.clientWidth;
            const parentHeight = parent.offsetHeight || parent.clientHeight;
            streetViewRef.current.style.width = `${parentWidth}px`;
            streetViewRef.current.style.height = `${parentHeight}px`;
          }
          // Trigger resize after visibility change
          setTimeout(() => {
            if (window.google && window.google.maps && window.google.maps.event) {
              window.google.maps.event.trigger(streetViewInstance, 'resize');
            }
          }, 100);
        } else {
          streetViewRef.current.style.display = 'none';
          streetViewRef.current.style.visibility = 'hidden';
          streetViewRef.current.style.zIndex = '-1';
        }
      }
    });

      return () => {
        window.removeEventListener('resize', resizeHandler);
        if (dblclickListener) {
          googleMaps.event.removeListener(dblclickListener);
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

      // Create info window content with street view button
      const infoContent = document.createElement('div');
      infoContent.className = 'marker-info';
      infoContent.innerHTML = `
        <h3>${article.title}</h3>
        <p>${article.location}</p>
        <p class="category">${article.category}</p>
        <a href="${article.url}" target="_blank">Read more</a>
        <br/><br/>
        <button id="street-view-btn-${article.id}" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Enter Street View
        </button>
      `;
      
      const infoWindow = new googleMaps.InfoWindow({
        content: infoContent
      });

      // Add click listener
      marker.addListener('click', () => {
        onArticleSelect(article);
        map.setCenter(position);
        map.setZoom(10);
        infoWindow.open(map, marker);
        
        // Add street view button listener after info window opens
        setTimeout(() => {
          const btn = document.getElementById(`street-view-btn-${article.id}`);
          if (btn && streetView) {
            btn.onclick = () => {
              const streetViewService = new googleMaps.StreetViewService();
              streetViewService.getPanorama({ location: position, radius: 50 }, (data, status) => {
                if (status === 'OK') {
                  console.log('Street view available, activating from marker...');
                  streetView.setPosition(position);
                  streetView.setPov({ heading: 270, pitch: 0 });
                  streetView.setVisible(true);
                  setIsStreetView(true);
                  infoWindow.close();
                } else {
                  alert('Street View imagery is not available at this location.');
                }
              });
            };
          }
        }, 100);
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
          minHeight: '400px',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: isStreetView ? 10 : -1,
          display: isStreetView ? 'block' : 'none',
          visibility: isStreetView ? 'visible' : 'hidden',
          backgroundColor: isStreetView ? '#000' : 'transparent',
          overflow: 'hidden'
        }} 
      />
      {isStreetView && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 11,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px 30px',
          borderRadius: '8px',
          textAlign: 'center',
          pointerEvents: 'none',
          maxWidth: '400px'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 500 }}>
            {streetView && streetView.getPano() ? 'Street View Loaded' : 'Loading Street View...'}
          </p>
          <p style={{ fontSize: '12px', margin: '0', opacity: 0.9, lineHeight: '1.5' }}>
            If you see a black screen, Google may be rate-limiting requests (429 error).
            <br />
            Wait a few seconds and the imagery should load, or click "Exit Street View" to return to the map.
          </p>
        </div>
      )}
      {isStreetView && (
        <>
          <button 
            className="exit-street-view"
            onClick={() => {
              console.log('Exiting street view via button');
              if (streetView) {
                streetView.setVisible(false);
              }
              setIsStreetView(false);
              // Force hide the container
              if (streetViewRef.current) {
                streetViewRef.current.style.display = 'none';
                streetViewRef.current.style.visibility = 'hidden';
                streetViewRef.current.style.zIndex = '-1';
              }
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 10000,
              padding: '12px 24px',
              background: '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'auto'
            }}
          >
            Exit Street View
          </button>
          <div className="street-view-overlay" style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px 25px',
            borderRadius: '8px',
            fontSize: '14px',
            pointerEvents: 'none',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 500 }}>
              Street View Mode
            </p>
            <p style={{ margin: '0', fontSize: '12px', opacity: 0.9 }}>
              {streetView && streetView.getPano() 
                ? 'If you see a black screen, Google is rate-limiting requests (429 error). Wait a moment or click "Exit Street View" to return to the map.'
                : 'Loading Street View...'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MapViewer;
