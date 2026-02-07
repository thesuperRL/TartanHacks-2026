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

    // Initialize Street View panorama
    useEffect(() => {
        if (!isOpen || !googleMaps || !panoramaRef.current || !lat || !lng) return;

        console.log('Initializing Street View panorama at:', lat, lng);

        try {
            // Check if Street View is available at this location
            const streetViewService = new googleMaps.StreetViewService();
            streetViewService.getPanorama(
                { location: { lat, lng }, radius: 50 },
                (data, status) => {
                    if (status === 'OK' && data && data.location) {
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
                            zoomControl: true
                        });

                        panorama.addListener('status_changed', () => {
                            const panoStatus = panorama.getStatus();
                            if (panoStatus === 'OK') {
                                setStreetViewLoaded(true);
                                console.log('Street View loaded successfully');
                            } else {
                                setLoadingError('Street View imagery is not available at this location');
                                console.log('Street View status:', panoStatus);
                            }
                        });

                        setStreetViewLoaded(true);
                    } else {
                        setLoadingError('Street View imagery is not available at this location. Try a different location.');
                        console.log('Street View not available:', status);
                    }
                }
            );
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
