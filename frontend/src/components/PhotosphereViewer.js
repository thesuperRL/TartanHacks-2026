import React, { useState, useEffect, useRef } from 'react';
import { loadGoogleStreetView } from '../utils/loadGoogleStreetView';
import './PhotosphereViewer.css';

const PhotosphereViewer = ({ isOpen, onClose, articleTitle, location, lat, lng, storyContext, articleSummary, locationReasoning }) => {
    const panoramaRef = useRef(null);
    const panoramaInstanceRef = useRef(null);
    const [streetViewLoaded, setStreetViewLoaded] = useState(false);
    const [loadingError, setLoadingError] = useState(null);
    const [googleMaps, setGoogleMaps] = useState(null);
    const [refinedCoords, setRefinedCoords] = useState(null);

    // Helper function to calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c; // Distance in meters
    };

    // Load Google Street View API
    useEffect(() => {
        if (!isOpen) return;

        console.log('Loading Google Street View API...');
        loadGoogleStreetView()
            .then((maps) => {
                console.log('Google Street View API loaded successfully');
                setGoogleMaps(maps);
                setLoadingError(null);
            })
            .catch((error) => {
                console.error('Error loading Google Street View:', error);
                setLoadingError(error.message);
            });
    }, [isOpen]);

    // Use Google Places API (New) REST API to get accurate coordinates from location name
    useEffect(() => {
        if (!isOpen || !location) {
            setRefinedCoords(null);
            return;
        }

        // Only use Places API (New) via backend to avoid CORS issues
        const getPlaceCoordinates = async () => {
            try {
                // Call backend endpoint that proxies Places API (New) request
                const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';
                const url = `${apiBaseUrl}/places/search`;
                
                console.log('Fetching coordinates from backend:', url, 'for location:', location);
                
                let response;
                try {
                    // Create abort controller for timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                    
                    response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ location: location }),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                } catch (fetchError) {
                    // Network error - backend might not be running
                    console.error('Network error fetching from backend:', fetchError);
                    if (fetchError.name === 'AbortError') {
                        setLoadingError(`Request timeout. Backend server at ${apiBaseUrl} is not responding.`);
                    } else if (fetchError.message && (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('ERR_CONNECTION_REFUSED'))) {
                        setLoadingError(`Cannot connect to backend server at ${apiBaseUrl}. Please make sure the backend server is running on port 5004.`);
                    } else {
                        setLoadingError(`Network error: ${fetchError.message}`);
                    }
                    setRefinedCoords(null);
                    return;
                }

                if (!response.ok) {
                    let errorMessage = `Could not find location "${location}" using Places API.`;
                    try {
                        const errorData = await response.json();
                        console.error('Places API request failed:', response.status, errorData);
                        if (errorData.error) {
                            errorMessage = `Places API error: ${errorData.error}`;
                        } else {
                            errorMessage = `Could not find location "${location}". Status: ${response.status}`;
                        }
                    } catch (e) {
                        console.error('Places API request failed:', response.status, response.statusText);
                        errorMessage = `Could not find location "${location}" using Places API. Status: ${response.status}`;
                    }
                    setLoadingError(errorMessage);
                    setRefinedCoords(null);
                    return;
                }

                const data = await response.json();
                
                if (data.success && data.location) {
                    const refinedLat = data.location.lat;
                    const refinedLng = data.location.lng;
                    const placeName = data.name || location;
                    
                    console.log(`Places API (New) found: ${placeName} at ${refinedLat}, ${refinedLng}`);
                    setRefinedCoords({ lat: refinedLat, lng: refinedLng });
                } else {
                    console.error('Places API (New) returned no results for:', location);
                    setLoadingError(data.error || `Could not find location "${location}" using Places API.`);
                    setRefinedCoords(null);
                }
            } catch (error) {
                console.error('Error using Places API (New):', error);
                // Provide more helpful error messages
                if (error.message && error.message.includes('Cannot connect to backend')) {
                    setLoadingError(error.message);
                } else if (error.message && error.message.includes('Failed to fetch')) {
                    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';
                    setLoadingError(`Cannot connect to backend server at ${apiBaseUrl}. Make sure the backend is running.`);
                } else {
                    setLoadingError('Error getting coordinates from Places API: ' + error.message);
                }
                setRefinedCoords(null);
            }
        };

        getPlaceCoordinates();
    }, [isOpen, location]);

    // Initialize Street View panorama - only outdoor panoramas
    useEffect(() => {
        // Only use Places API (New) coordinates - no fallback to original coordinates
        if (!isOpen || !googleMaps || !panoramaRef.current || !refinedCoords) {
            // Clean up if conditions not met
            if (panoramaInstanceRef.current && googleMaps) {
                googleMaps.event.clearInstanceListeners(panoramaInstanceRef.current);
                panoramaInstanceRef.current = null;
            }
            setStreetViewLoaded(false);
            if (!refinedCoords) {
                // Don't show error if we're still waiting for Places API
                if (location) {
                    // Places API is still loading or failed
                    return;
                }
            }
            return;
        }

        // Use Places API coordinates
        const numLat = Number(refinedCoords.lat);
        const numLng = Number(refinedCoords.lng);
        
        // Validate coordinates
        if (isNaN(numLat) || isNaN(numLng)) {
            console.error('Invalid Places API coordinates:', refinedCoords);
            setLoadingError('Invalid coordinates from Places API');
            return;
        }
        
        console.log(`Initializing Street View panorama at: ${numLat}, ${numLng} (from Places API)`);

        // Clean up previous panorama instance
        if (panoramaInstanceRef.current) {
            googleMaps.event.clearInstanceListeners(panoramaInstanceRef.current);
            panoramaInstanceRef.current = null;
        }
        
        // Clear the container
        if (panoramaRef.current) {
            panoramaRef.current.innerHTML = '';
        }
        
        setStreetViewLoaded(false);
        setLoadingError(null);

        const findOutdoorPanorama = (searchLat, searchLng, radius = 10, maxAttempts = 8) => {
            const streetViewService = new googleMaps.StreetViewService();
            let attempts = 0;
            let bestPanorama = null;
            let bestDistance = Infinity;
            
            const searchPanorama = (currentLat, currentLng, currentRadius) => {
                attempts++;
                
                // Ensure coordinates are numbers
                const coordLat = Number(currentLat);
                const coordLng = Number(currentLng);
                
                console.log(`Searching for panorama at: ${coordLat}, ${coordLng} with radius ${currentRadius}m (attempt ${attempts})`);
                
                streetViewService.getPanorama(
                    { location: { lat: coordLat, lng: coordLng }, radius: currentRadius },
                    (data, status) => {
                        if (status === 'OK' && data && data.location) {
                            // Check if panorama is outdoor
                            const panoId = data.location.pano || '';
                            const isUserContributed = panoId.startsWith('CAoS') || 
                                                     panoId.startsWith('CB') ||
                                                     data.location.source === 'user';
                            
                            // Official panoramas are almost always outdoor
                            const isOfficial = !isUserContributed && 
                                             (data.location.source === 'outdoor' || 
                                              !data.location.source ||
                                              panoId.length > 0);
                            
                            // Prefer official outdoor panoramas, reject user-contributed (often indoor)
                            if (isOfficial && !isUserContributed) {
                                // Calculate distance from requested location to found panorama
                                const panoramaLocation = data.location.latLng;
                                const panoramaLat = panoramaLocation.lat();
                                const panoramaLng = panoramaLocation.lng();
                                const distance = calculateDistance(searchLat, searchLng, panoramaLat, panoramaLng);
                                
                                console.log(`Found panorama at ${panoramaLat}, ${panoramaLng}, distance: ${distance.toFixed(0)}m from requested location`);
                                
                                // If this is closer than previous best, or if it's very close (< 50m), use it
                                if (distance < bestDistance || distance < 50) {
                                    bestPanorama = {
                                        location: panoramaLocation,
                                        distance: distance,
                                        data: data
                                    };
                                    bestDistance = distance;
                                    
                                    // If we found a very close panorama (< 50m), use it immediately
                                    if (distance < 50) {
                                        console.log(`Found very close panorama (${distance.toFixed(0)}m), using it`);
                                        initializePanorama(panoramaLocation, distance);
                                        return;
                                    }
                                }
                                
                                // Continue searching for closer panoramas if we haven't exhausted attempts
                                if (attempts < maxAttempts && currentRadius < 200) {
                                    const angle = (attempts * 72) * (Math.PI / 180);
                                    const offset = 0.0005 * attempts; // ~50m per attempt
                                    const newLat = searchLat + (offset * Math.cos(angle));
                                    const newLng = searchLng + (offset * Math.sin(angle));
                                    const newRadius = Math.min(currentRadius + 10, 200);
                                    
                                    setTimeout(() => searchPanorama(newLat, newLng, newRadius), 50);
                                    return;
                                } else {
                                    // Use the best panorama we found
                                    if (bestPanorama) {
                                        console.log(`Using best panorama found (${bestPanorama.distance.toFixed(0)}m away)`);
                                        initializePanorama(bestPanorama.location, bestPanorama.distance);
                                        return;
                                    }
                                }
                            } else {
                                // This is likely an indoor panorama, search nearby
                                if (attempts < maxAttempts) {
                                    const angle = (attempts * 72) * (Math.PI / 180);
                                    const offset = 0.001 * attempts;
                                    const newLat = searchLat + (offset * Math.cos(angle));
                                    const newLng = searchLng + (offset * Math.sin(angle));
                                    const newRadius = Math.min(currentRadius + 20, 200);
                                    
                                    console.log(`Indoor panorama detected, searching nearby (attempt ${attempts + 1})...`);
                                    setTimeout(() => searchPanorama(newLat, newLng, newRadius), 100);
                                } else {
                                    setLoadingError('Only indoor Street View imagery available at this location. Outdoor imagery not found nearby.');
                                }
                                return;
                            }
                        } else {
                            // No panorama found, try nearby if we haven't exhausted attempts
                            if (attempts < maxAttempts) {
                                const angle = (attempts * 72) * (Math.PI / 180);
                                const offset = 0.001 * attempts;
                                const newLat = searchLat + (offset * Math.cos(angle));
                                const newLng = searchLng + (offset * Math.sin(angle));
                                const newRadius = Math.min(currentRadius + 20, 200);
                                
                                console.log(`No panorama found, searching nearby (attempt ${attempts + 1})...`);
                                setTimeout(() => searchPanorama(newLat, newLng, newRadius), 100);
                            } else {
                                // If we found a panorama earlier but it was far, use it
                                if (bestPanorama) {
                                    console.log(`No closer panorama found, using best available (${bestPanorama.distance.toFixed(0)}m away)`);
                                    initializePanorama(bestPanorama.location, bestPanorama.distance);
                                } else {
                                    setLoadingError('Street View imagery is not available at this location. Try a different location.');
                                    console.log('Street View not available:', status);
                                }
                            }
                        }
                    }
                );
            };
            
            // Helper function to initialize the panorama
            const initializePanorama = (panoramaLocation, distance) => {

                // Destroy previous instance if exists
                if (panoramaInstanceRef.current) {
                    googleMaps.event.clearInstanceListeners(panoramaInstanceRef.current);
                }

                // Ensure container is ready
                if (!panoramaRef.current) {
                    console.error('Panorama container not available');
                    setLoadingError('Failed to initialize Street View container');
                    return;
                }

                // Log distance information
                if (distance > 100) {
                    console.warn(`Warning: Nearest Street View is ${distance.toFixed(0)}m away from requested location`);
                }

                // Initialize Street View panorama
                try {
                    const panorama = new googleMaps.StreetViewPanorama(panoramaRef.current, {
                        position: panoramaLocation,
                        pov: { heading: 270, pitch: 0 },
                        zoom: 1,
                        visible: true,
                        addressControl: false,
                        linksControl: true,
                        panControl: true,
                        enableCloseButton: false,
                        fullscreenControl: true,
                        zoomControl: true,
                        imageDateControl: false
                    });

                    panoramaInstanceRef.current = panorama;

                    panorama.addListener('status_changed', () => {
                        const panoStatus = panorama.getStatus();
                        console.log('Panorama status changed:', panoStatus);
                        if (panoStatus === 'OK') {
                            const currentPano = panorama.getPosition();
                            if (currentPano) {
                                setStreetViewLoaded(true);
                                setLoadingError(null);
                                const finalDistance = calculateDistance(searchLat, searchLng, currentPano.lat(), currentPano.lng());
                                console.log(`Outdoor Street View loaded successfully at: ${currentPano.lat()}, ${currentPano.lng()} (${finalDistance.toFixed(0)}m from requested location)`);
                            }
                        } else if (panoStatus === 'ZERO_RESULTS') {
                            setLoadingError('Street View imagery is not available at this location');
                        } else {
                            setLoadingError(`Street View error: ${panoStatus}`);
                            console.log('Street View status:', panoStatus);
                        }
                    });

                    // Also listen for pano_changed to confirm it's loaded
                    panorama.addListener('pano_changed', () => {
                        console.log('Panorama changed, ID:', panorama.getPano());
                        setStreetViewLoaded(true);
                    });

                    console.log('Street View panorama initialized successfully');
                } catch (error) {
                    console.error('Error creating panorama:', error);
                    setLoadingError('Failed to create Street View panorama: ' + error.message);
                }
            };
            
            // Start search with very small radius for maximum accuracy
            searchPanorama(searchLat, searchLng, radius);
        };

        try {
            findOutdoorPanorama(numLat, numLng);
        } catch (error) {
            console.error('Error initializing Street View:', error);
            setLoadingError(error.message || 'Failed to initialize Street View');
        }
        
        // Cleanup function
        return () => {
            if (panoramaInstanceRef.current && googleMaps) {
                googleMaps.event.clearInstanceListeners(panoramaInstanceRef.current);
                panoramaInstanceRef.current = null;
            }
        };
    }, [isOpen, googleMaps, lat, lng, refinedCoords]);

    // Cleanup when modal closes
    useEffect(() => {
        if (!isOpen) {
            // Clean up panorama instance
            if (panoramaInstanceRef.current && googleMaps) {
                googleMaps.event.clearInstanceListeners(panoramaInstanceRef.current);
                panoramaInstanceRef.current = null;
            }
            // Clear the panorama container
            if (panoramaRef.current) {
                panoramaRef.current.innerHTML = '';
            }
            setStreetViewLoaded(false);
            setLoadingError(null);
        }
    }, [isOpen, googleMaps]);

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="gallery-overlay" onClick={onClose}>
            <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
                <button className="gallery-close" onClick={onClose}>×</button>
                
                {/* Location Info Overlay - Top Left */}
                <div className="street-view-info-overlay">
                    <div className="street-view-info-content">
                        {location && (
                            <div className="street-view-location">
                                <h4>📍 {location}</h4>
                            </div>
                        )}
                        {articleSummary && (
                            <div className="street-view-summary">
                                <strong>Article Summary:</strong>
                                <p>{articleSummary}</p>
                            </div>
                        )}
                    </div>
                </div>

                {(articleTitle || location || storyContext) && (
                    <div className="gallery-header">
                        {articleTitle && <h3>{articleTitle}</h3>}
                        {location && <p className="gallery-location">{location}</p>}
                        {storyContext && <p className="gallery-context">{storyContext}</p>}
                    </div>
                )}

                <div className="gallery-main street-view-container">
                    {loadingError ? (
                        <div className="gallery-error">
                            <p>{loadingError}</p>
                            <button onClick={onClose} className="error-close-button">Close</button>
                        </div>
                    ) : !streetViewLoaded ? (
                        <div className="gallery-loading">
                            <p>Loading Street View...</p>
                        </div>
                    ) : null}
                    <div
                        ref={panoramaRef}
                        className="street-view-panorama"
                        style={{ 
                            width: '100%', 
                            height: '100%',
                            minWidth: '100vw',
                            minHeight: '100vh',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 1
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PhotosphereViewer;
