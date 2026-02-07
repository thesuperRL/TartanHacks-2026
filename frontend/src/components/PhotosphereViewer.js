import React, { useState, useEffect, useRef } from 'react';
import { loadGoogleStreetView } from '../utils/loadGoogleStreetView';
import './PhotosphereViewer.css';

const PhotosphereViewer = ({ isOpen, onClose, articleTitle, location, lat, lng, storyContext }) => {
    const panoramaRef = useRef(null);
    const [streetViewLoaded, setStreetViewLoaded] = useState(false);
    const [loadingError, setLoadingError] = useState(null);
    const [googleMaps, setGoogleMaps] = useState(null);

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

    // Initialize Street View panorama - only outdoor panoramas
    useEffect(() => {
        if (!isOpen || !googleMaps || !panoramaRef.current || !lat || !lng) return;

        console.log('Initializing Street View panorama at:', lat, lng);

        const findOutdoorPanorama = (searchLat, searchLng, radius = 50, maxAttempts = 5) => {
            const streetViewService = new googleMaps.StreetViewService();
            let attempts = 0;
            
            const searchPanorama = (currentLat, currentLng, currentRadius) => {
                attempts++;
                
                streetViewService.getPanorama(
                    { location: { lat: currentLat, lng: currentLng }, radius: currentRadius },
                    (data, status) => {
                        if (status === 'OK' && data && data.location) {
                            // Check if panorama is outdoor
                            // Official Google Street View panoramas are typically outdoor
                            // User-contributed panoramas (indoor) often have specific patterns
                            const panoId = data.location.pano || '';
                            const isUserContributed = panoId.startsWith('CAoS') || 
                                                     panoId.startsWith('CB') ||
                                                     data.location.source === 'user';
                            
                            // Official panoramas are almost always outdoor
                            // Check if it's an official Google Street View panorama
                            const isOfficial = !isUserContributed && 
                                             (data.location.source === 'outdoor' || 
                                              !data.location.source ||
                                              panoId.length > 0);
                            
                            // Prefer official outdoor panoramas, reject user-contributed (often indoor)
                            if (isOfficial && !isUserContributed) {
                                // Use the actual panorama location from the service
                                const panoramaLocation = data.location.latLng;

                                // Initialize Street View panorama
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
                                    // Prefer outdoor imagery
                                    imageDateControl: false
                                });

                                panorama.addListener('status_changed', () => {
                                    const panoStatus = panorama.getStatus();
                                    if (panoStatus === 'OK') {
                                        // Double-check it's outdoor by checking panorama metadata
                                        const currentPano = panorama.getPosition();
                                        if (currentPano) {
                                            setStreetViewLoaded(true);
                                            console.log('Outdoor Street View loaded successfully');
                                        }
                                    } else {
                                        setLoadingError('Street View imagery is not available at this location');
                                        console.log('Street View status:', panoStatus);
                                    }
                                });

                                setStreetViewLoaded(true);
                                return;
                            } else {
                                // This is likely an indoor panorama, search nearby
                                if (attempts < maxAttempts) {
                                    // Try searching in a wider radius with slight offset
                                    const angle = (attempts * 72) * (Math.PI / 180); // Spread searches in circle
                                    const offset = 0.001 * attempts; // ~100m per attempt
                                    const newLat = searchLat + (offset * Math.cos(angle));
                                    const newLng = searchLng + (offset * Math.sin(angle));
                                    const newRadius = Math.min(currentRadius + 20, 200);
                                    
                                    console.log(`Indoor panorama detected, searching nearby (attempt ${attempts + 1})...`);
                                    setTimeout(() => searchPanorama(newLat, newLng, newRadius), 100);
                                } else {
                                    setLoadingError('Only indoor Street View imagery available at this location. Outdoor imagery not found nearby.');
                                }
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
                                setLoadingError('Street View imagery is not available at this location. Try a different location.');
                                console.log('Street View not available:', status);
                            }
                        }
                    }
                );
            };
            
            searchPanorama(searchLat, searchLng, radius);
        };

        try {
            findOutdoorPanorama(lat, lng);
        } catch (error) {
            console.error('Error initializing Street View:', error);
            setLoadingError(error.message || 'Failed to initialize Street View');
        }
    }, [isOpen, googleMaps, lat, lng]);

    // Cleanup when modal closes
    useEffect(() => {
        if (!isOpen && panoramaRef.current) {
            // Clear the panorama container
            panoramaRef.current.innerHTML = '';
            setStreetViewLoaded(false);
            setLoadingError(null);
        }
    }, [isOpen]);

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
                        style={{ width: '100vw', height: '100vh' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PhotosphereViewer;
