import React, { useEffect, useRef, useState } from 'react';
import { loadMapbox } from '../utils/loadMapbox';
import PhotosphereViewer from './PhotosphereViewer';
import MindMapModal from './MindMapModal';
import PodcastPlayer from './PodcastPlayer';
import { generateDemoArticles } from '../utils/generateDemoArticles';
import { checkArticleImpact } from '../utils/checkArticleImpact';
import './MapViewer.css';

const MapViewer = ({ articles, selectedArticle, onArticleSelect, portfolio = [], stocks = [] }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapbox, setMapbox] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef([]);
  const popupsRef = useRef([]);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [demoArticles] = useState(() => generateDemoArticles());

  // Modal states
  const [photosphereOpen, setPhotosphereOpen] = useState(false);
  const [photosphereCoords, setPhotosphereCoords] = useState({ lat: null, lng: null });
  const [photosphereTitle, setPhotosphereTitle] = useState('');
  const [photosphereLocation, setPhotosphereLocation] = useState('');
  const [photosphereStoryContext, setPhotosphereStoryContext] = useState('');
  const [mindMapOpen, setMindMapOpen] = useState(false);
  const [mindMapTitle, setMindMapTitle] = useState('');
  const [mindMapLocation, setMindMapLocation] = useState('');
  const [podcastOpen, setPodcastOpen] = useState(false);
  const [podcastTitle, setPodcastTitle] = useState('');
  const [podcastLocation, setPodcastLocation] = useState('');

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
      });
  }, []);

  // Initialize map once Mapbox is loaded
  useEffect(() => {
    if (!mapbox || !mapContainerRef.current || mapRef.current) return;

    console.log('Initializing Mapbox map...');

    try {
      const mapboxgl = window.mapboxgl || mapbox;

      if (!mapboxgl || !mapboxgl.Map) {
        throw new Error('Mapbox GL JS not properly loaded.');
      }

      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [0, 20],
        zoom: 2,
        attributionControl: true
      });

      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      mapInstance.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }), 'top-right');

      mapRef.current = mapInstance;

      // Track zoom level
      mapInstance.on('zoom', () => {
        setCurrentZoom(mapInstance.getZoom());
      });

      mapInstance.on('load', () => {
        console.log('Map loaded, applying custom theme...');
        setMapLoaded(true);
        setCurrentZoom(mapInstance.getZoom());

        // Apply dark theme colors
        try {
          // Background
          if (mapInstance.getLayer('background')) {
            mapInstance.setPaintProperty('background', 'background-color', '#0f0c29');
          }

          // Water layers
          ['water', 'waterway'].forEach(layerId => {
            if (mapInstance.getLayer(layerId)) {
              const layer = mapInstance.getLayer(layerId);
              try {
                if (layer.type === 'fill') {
                  mapInstance.setPaintProperty(layerId, 'fill-color', '#0a0e27');
                } else if (layer.type === 'line') {
                  mapInstance.setPaintProperty(layerId, 'line-color', '#0a0e27');
                }
              } catch (e) {
                // Layer might not support these properties
              }
            }
          });

          // Land layers
          if (mapInstance.getLayer('land')) {
            try {
              mapInstance.setPaintProperty('land', 'fill-color', '#302b63');
            } catch (e) {
              // Try alternative property
              try {
                mapInstance.setPaintProperty('land', 'background-color', '#302b63');
              } catch (e2) {
                console.warn('Could not set land color');
              }
            }
          }

          // Other land-related layers
          ['landuse', 'national-park', 'land-structure-polygon'].forEach(layerId => {
            if (mapInstance.getLayer(layerId)) {
              const layer = mapInstance.getLayer(layerId);
              try {
                if (layer.type === 'fill') {
                  mapInstance.setPaintProperty(layerId, 'fill-color', '#302b63');
                  mapInstance.setPaintProperty(layerId, 'fill-opacity', 0.85);
                } else if (layer.type === 'line') {
                  mapInstance.setPaintProperty(layerId, 'line-color', '#302b63');
                  mapInstance.setPaintProperty(layerId, 'line-opacity', 0.85);
                }
              } catch (e) {
                // Layer might not support these properties
              }
            }
          });

          // National parks
          if (mapInstance.getLayer('national-park')) {
            try {
              const parkLayer = mapInstance.getLayer('national-park');
              if (parkLayer.type === 'fill') {
                mapInstance.setPaintProperty('national-park', 'fill-color', '#24243e');
                mapInstance.setPaintProperty('national-park', 'fill-opacity', 0.8);
              }
            } catch (e) {
              // Ignore
            }
          }

          // Buildings
          ['building', 'building-extrusion'].forEach(layerId => {
            if (mapInstance.getLayer(layerId)) {
              try {
                mapInstance.setPaintProperty(layerId, 'fill-color', '#8b5cf6');
                mapInstance.setPaintProperty(layerId, 'fill-opacity', 0.3);
              } catch (e) {
                // Ignore
              }
            }
          });

          // Boundaries - less pronounced
          ['admin-0-boundary', 'admin-1-boundary', 'admin-0-boundary-bg'].forEach(layerId => {
            if (mapInstance.getLayer(layerId)) {
              try {
                const isCountry = layerId.includes('admin-0');
                mapInstance.setPaintProperty(layerId, 'line-color', isCountry ? '#4a9eff' : '#8b5cf6');
                mapInstance.setPaintProperty(layerId, 'line-opacity', isCountry ? 0.15 : 0.1);
                // Make lines thinner if possible
                try {
                  mapInstance.setPaintProperty(layerId, 'line-width', isCountry ? 0.5 : 0.3);
                } catch (e) {
                  // Some layers might not support line-width
                }
              } catch (e) {
                // Ignore
              }
            }
          });

          // Roads
          const roadLayers = ['road-street', 'road-primary', 'road-secondary', 'road-highway'];
          roadLayers.forEach(layerId => {
            if (mapInstance.getLayer(layerId)) {
              try {
                if (layerId.includes('highway')) {
                  mapInstance.setPaintProperty(layerId, 'line-color', '#4a9eff');
                  mapInstance.setPaintProperty(layerId, 'line-opacity', 0.5);
                } else {
                  mapInstance.setPaintProperty(layerId, 'line-color', '#1a1a2e');
                  mapInstance.setPaintProperty(layerId, 'line-opacity', 0.3);
                }
              } catch (e) {
                // Ignore
              }
            }
          });

          console.log('Custom theme colors applied');
        } catch (e) {
          console.warn('Error applying theme:', e);
        }
      });

      // Also apply colors on style.load (in case style loads after initial load)
      const applyThemeColors = () => {
        try {
          if (mapInstance.getLayer('background')) {
            mapInstance.setPaintProperty('background', 'background-color', '#0f0c29');
          }

          ['water', 'waterway'].forEach(layerId => {
            if (mapInstance.getLayer(layerId)) {
              const layer = mapInstance.getLayer(layerId);
              try {
                if (layer.type === 'fill') {
                  mapInstance.setPaintProperty(layerId, 'fill-color', '#0a0e27');
                } else if (layer.type === 'line') {
                  mapInstance.setPaintProperty(layerId, 'line-color', '#0a0e27');
                }
              } catch (e) {}
            }
          });

          if (mapInstance.getLayer('land')) {
            try {
              mapInstance.setPaintProperty('land', 'fill-color', '#302b63');
            } catch (e) {
              try {
                mapInstance.setPaintProperty('land', 'background-color', '#302b63');
              } catch (e2) {}
            }
          }

          ['landuse', 'national-park', 'land-structure-polygon'].forEach(layerId => {
            if (mapInstance.getLayer(layerId)) {
              const layer = mapInstance.getLayer(layerId);
              try {
                if (layer.type === 'fill') {
                  mapInstance.setPaintProperty(layerId, 'fill-color', '#302b63');
                  mapInstance.setPaintProperty(layerId, 'fill-opacity', 0.85);
                }
              } catch (e) {}
            }
          });

          ['admin-0-boundary', 'admin-1-boundary'].forEach(layerId => {
            if (mapInstance.getLayer(layerId)) {
              try {
                const isCountry = layerId.includes('admin-0');
                mapInstance.setPaintProperty(layerId, 'line-color', isCountry ? '#4a9eff' : '#8b5cf6');
                mapInstance.setPaintProperty(layerId, 'line-opacity', isCountry ? 0.15 : 0.1);
                try {
                  mapInstance.setPaintProperty(layerId, 'line-width', isCountry ? 0.5 : 0.3);
                } catch (e) {}
              } catch (e) {}
            }
          });
        } catch (e) {
          console.warn('Error applying theme on style.load:', e);
        }
      };

      mapInstance.on('style.load', applyThemeColors);

      window.addEventListener('resize', () => mapInstance.resize());

      return () => {
        if (mapInstance) mapInstance.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoadingError(error.message);
    }
  }, [mapbox]);

  // Update markers when articles change or zoom changes
  useEffect(() => {
    if (!mapRef.current || !mapbox || !mapLoaded) return;

    const map = mapRef.current;
    const mapboxgl = window.mapboxgl || mapbox;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    popupsRef.current.forEach(popup => popup.remove());
    popupsRef.current = [];

    // Filter articles with gradual zoom-based visibility
    // Use demo articles if no articles provided, otherwise use provided articles
    const allArticles = articles.length > 0 ? articles : demoArticles;
    
    // Filter articles with gradual appearance based on zoom level
    const filteredArticles = allArticles.filter(article => {
      const minZoom = article.minZoom !== undefined ? article.minZoom : 0;
      const maxZoom = article.maxZoom !== undefined ? article.maxZoom : Infinity;
      
      if (currentZoom < minZoom) {
        return false; // Not zoomed in enough
      }
      
      // For gradual appearance within the zoom range
      if (maxZoom !== Infinity && currentZoom < maxZoom) {
        // Calculate how far through the appearance range we are (0 to 1)
        const zoomProgress = (currentZoom - minZoom) / (maxZoom - minZoom);
        
        // Use a smooth ease-in-out curve for gradual appearance
        // This creates a smooth transition from 0% to 100% visibility
        const visibility = zoomProgress * zoomProgress * (3 - 2 * zoomProgress); // Smoothstep function
        
        // Use article ID to create a deterministic but distributed appearance order
        // Extract numeric part of ID for consistent hashing
        const idNum = parseInt(article.id.replace(/\D/g, '')) || article.id.charCodeAt(0) || 0;
        const articleOrder = (idNum % 1000) / 1000; // Normalize to 0-1
        
        // Article appears when visibility progress exceeds its order threshold
        // This ensures articles appear in a distributed manner across the zoom range
        return visibility >= articleOrder;
      }
      
      return true; // Fully visible (past maxZoom)
    });

    // Only show articles with coordinates
    const articlesWithCoords = filteredArticles.filter(a => a.coordinates?.lat && a.coordinates?.lng);
    
    // If zoomed out (zoom < 2.5), limit to a sample of global articles for performance
    let markersToCreate = articlesWithCoords;
    if (currentZoom < 2.5) {
      // Show only a sample of global articles when zoomed out
      markersToCreate = articlesWithCoords
        .filter(a => (a.minZoom === 0 || a.minZoom === undefined) && (a.maxZoom === undefined || a.maxZoom > 2.5))
        .slice(0, Math.max(10, Math.floor(20 * currentZoom))); // Gradually increase from 10 to 50 as zoom increases
    }

    markersToCreate.forEach(article => {
      const { lat, lng } = article.coordinates;
      const coordinates = [lng, lat];

      // Check if article impacts user holdings (synchronous check)
      const impactResult = checkArticleImpact(article, stocks, portfolio);
      const impactsHoldings = impactResult.impacts;
      const impactReason = impactResult.reason;
      
      // Determine marker color: red if impacts holdings, otherwise category-based
      let markerGradient;
      if (impactsHoldings) {
        markerGradient = 'linear-gradient(135deg,#FF3366,#FF0000)'; // Red for impactful
      } else {
        markerGradient = article.category === 'financial' 
          ? 'linear-gradient(135deg,#00D4FF,#0099FF)' 
          : 'linear-gradient(135deg,#FF6B9D,#FF3366)';
      }
      
      // Store impact reason in article for popup display
      article.impactReason = impactReason;

      // Create marker element
      const el = document.createElement('div');
      el.style.cssText = 'width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;';

      const innerEl = document.createElement('div');
      innerEl.style.cssText = `
        width:24px;height:24px;border-radius:50%;border:4px solid white;
        box-shadow:0 4px 12px rgba(0,0,0,0.4);
        background:${markerGradient};
        transition:transform 0.2s,box-shadow 0.2s;
      `;
      el.appendChild(innerEl);

      el.addEventListener('mouseenter', () => {
        innerEl.style.transform = 'scale(1.3)';
        innerEl.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
      });
      el.addEventListener('mouseleave', () => {
        innerEl.style.transform = 'scale(1)';
        innerEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coordinates)
        .addTo(map);

      // Create popup content with bright colors and buttons
      const popupContent = document.createElement('div');
      popupContent.className = 'marker-popup';
      const buttonGradient = article.category === 'financial'
        ? 'linear-gradient(135deg, #00D4FF 0%, #0099FF 100%)'
        : 'linear-gradient(135deg, #FF6B9D 0%, #FF3366 100%)';

      // Add impact reason if article impacts holdings
      const impactReasonHTML = impactReason 
        ? `<div style="margin-top: 10px; padding: 10px; background: rgba(255, 51, 102, 0.15); border-left: 3px solid rgba(255, 51, 102, 0.6); border-radius: 6px;">
             <strong style="color: rgba(255, 255, 255, 0.95); display: block; margin-bottom: 4px;">⚠️ Why this matters:</strong>
             <p style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 12px; line-height: 1.5;">${impactReason}</p>
           </div>`
        : '';

      popupContent.innerHTML = `
          <div class="marker-info">
            <h3>${article.title}</h3>
          <p style="margin: 4px 0; color: rgba(255,255,255,0.7);">${article.location}</p>
          <span class="category-badge ${article.category}">${article.category === 'financial' ? '💰 Financial' : '🏛️ Political'}</span>
          ${impactReasonHTML}
          <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; width: 100%;">
            <button id="images-btn-${article.id}" style="
              display: inline-block;
              padding: 8px 16px;
              background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              transition: all 0.2s;
              cursor: pointer;
            ">👁️ First-Person Perspective</button>
            <button id="mindmap-btn-${article.id}" style="
              display: inline-block;
              padding: 8px 16px;
              background: linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              transition: all 0.2s;
              cursor: pointer;
            ">🧠 View Mind Map</button>
            <button id="podcast-btn-${article.id}" style="
              display: inline-block;
              padding: 8px 16px;
              background: linear-gradient(135deg, #52C41A 0%, #389E0D 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              transition: all 0.2s;
              cursor: pointer;
            ">🎧 Listen to Podcast</button>
          </div>
        </div>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        className: 'article-popup'
      })
        .setDOMContent(popupContent);

      // Add mousedown handler to prevent map drag
      el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });

      // Capture article data for button handlers
      const articleLat = lat;
      const articleLng = lng;
      const articleTitle = article.title;
      const articleLocation = article.location || '';

      // Function to attach button handlers
      const attachButtonHandlers = () => {
        const imagesBtn = document.getElementById(`images-btn-${article.id}`);
        if (imagesBtn && !imagesBtn.dataset.handlersAttached) {
          imagesBtn.dataset.handlersAttached = 'true';
          imagesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setPhotosphereCoords({ lat: articleLat, lng: articleLng });
            setPhotosphereTitle(articleTitle);
            setPhotosphereLocation(articleLocation);
            setPhotosphereStoryContext(article.story_context || '');
            setPhotosphereOpen(true);
          });
        }

        // Add Mind Map button handler
        const mindMapBtn = document.getElementById(`mindmap-btn-${article.id}`);
        if (mindMapBtn && !mindMapBtn.dataset.handlersAttached) {
          mindMapBtn.dataset.handlersAttached = 'true';
          mindMapBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setMindMapTitle(articleTitle);
            setMindMapLocation(articleLocation);
            setMindMapOpen(true);
          });
        }

        // Add Podcast button handler
        const podcastBtn = document.getElementById(`podcast-btn-${article.id}`);
        if (podcastBtn && !podcastBtn.dataset.handlersAttached) {
          podcastBtn.dataset.handlersAttached = 'true';
          podcastBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setPodcastTitle(articleTitle);
            setPodcastLocation(articleLocation);
            setPodcastOpen(true);
          });
        }
      };

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        onArticleSelect(article);

        // Close any existing popups first (except this one)
        popupsRef.current.forEach(p => {
          if (p && p !== popup) {
            p.remove();
          }
        });

        // Fly to the location
        map.flyTo({
          center: coordinates,
          zoom: 10,
          duration: 1000
        });

        // Show popup after a short delay to let flyTo start
        setTimeout(() => {
          console.log('Adding popup for:', article.title);
          marker.setPopup(popup);
          popup.addTo(map);
          console.log('Popup added, isOpen:', popup.isOpen());

          // Attach button handlers after popup is shown
          setTimeout(attachButtonHandlers, 200);
        }, 300);
      });

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

  }, [mapbox, mapLoaded, articles, selectedArticle, onArticleSelect, currentZoom, demoArticles]);

  return (
    <div className="map-viewer" style={{ width: '100%', height: '100%', position: 'relative', minHeight: '400px' }}>
      {!mapLoaded && !loadingError && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#1a1a2e',color:'#fff',position:'absolute',width:'100%',zIndex:10 }}>
          <p>Loading map...</p>
        </div>
      )}
      {loadingError && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#1a1a2e',color:'#fff',flexDirection:'column',position:'absolute',width:'100%',zIndex:10,padding:'20px',textAlign:'center' }}>
          <h2>⚠️ Map Error</h2>
          <p>{loadingError}</p>
        </div>
      )}
      <div ref={mapContainerRef} className="mapbox-map-container" style={{ width:'100%',height:'100%',minHeight:'400px',position:'absolute',top:0,left:0,zIndex:1 }} />

      <PhotosphereViewer
        isOpen={photosphereOpen}
        onClose={() => setPhotosphereOpen(false)}
        lat={photosphereCoords.lat}
        lng={photosphereCoords.lng}
        articleTitle={photosphereTitle}
        location={photosphereLocation}
        storyContext={photosphereStoryContext}
      />
      <MindMapModal
        isOpen={mindMapOpen}
        onClose={() => setMindMapOpen(false)}
        articleTitle={mindMapTitle}
        location={mindMapLocation}
      />
      <PodcastPlayer
        isOpen={podcastOpen}
        onClose={() => setPodcastOpen(false)}
        articleTitle={podcastTitle}
        location={podcastLocation}
      />
    </div>
  );
};

export default MapViewer;
