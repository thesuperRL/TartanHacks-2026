import React, { useEffect, useRef, useState } from 'react';
import { loadMapbox } from '../utils/loadMapbox';
import PhotosphereViewer from './PhotosphereViewer';
import MindMapModal from './MindMapModal';
import PodcastPlayer from './PodcastPlayer';
import MapPanelToggle from './MapPanelToggle';
import CompanyHoverChart from './CompanyHoverChart';
import { generateDemoArticles } from '../utils/generateDemoArticles';
import { checkArticleImpact } from '../utils/checkArticleImpact';
import './MapViewer.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

const MapViewer = ({ articles, selectedArticle, onArticleSelect, portfolio = [], stocks = [], mode = 'economic', activePanel = 'news', onPanelChange }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapbox, setMapbox] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef([]);
  const popupsRef = useRef([]);
  const currentOpenPopupRef = useRef(null);
  const currentOpenMarkerRef = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [mapBounds, setMapBounds] = useState(null);
  const [demoArticles, setDemoArticles] = useState(() => generateDemoArticles(mode));
  
  // Company data state (activePanel is now a prop)
  const [topCompanies, setTopCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const companyMarkersRef = useRef([]);
  
  // Hover chart state - pinned means it stays visible and can be dragged
  const [hoverChart, setHoverChart] = useState({ visible: false, pinned: false, symbol: null, name: null, x: 0, y: 0 });
  
  // Update demo articles when mode changes
  useEffect(() => {
    setDemoArticles(generateDemoArticles(mode));
  }, [mode]);
  
  // Fetch top companies when switching to companies panel
  useEffect(() => {
    if (activePanel === 'companies' && topCompanies.length === 0) {
      fetchTopCompanies();
    }
  }, [activePanel]);
  
  const fetchTopCompanies = async () => {
    try {
      setCompaniesLoading(true);
      const response = await fetch(`${API_BASE_URL}/companies/top`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setTopCompanies(data.companies);
      }
    } catch (err) {
      console.error('Error fetching top companies:', err);
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Modal states
  const [photosphereOpen, setPhotosphereOpen] = useState(false);
  const [photosphereCoords, setPhotosphereCoords] = useState({ lat: null, lng: null });
  const [photosphereTitle, setPhotosphereTitle] = useState('');
  const [photosphereLocation, setPhotosphereLocation] = useState('');
  const [photosphereStoryContext, setPhotosphereStoryContext] = useState('');
  const [photosphereSummary, setPhotosphereSummary] = useState('');
  const [photosphereReasoning, setPhotosphereReasoning] = useState('');
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
    
    // Ensure container is visible and has dimensions before initializing
    const container = mapContainerRef.current;
    const rect = container.getBoundingClientRect();
    if (!container || (rect.width === 0 && rect.height === 0)) {
      // Container not ready yet, wait a bit and try again
      const timer = setTimeout(() => {
        // This will trigger the effect again if container becomes ready
      }, 100);
      return () => clearTimeout(timer);
    }

    console.log('Initializing Mapbox map...');

    try {
      const mapboxgl = window.mapboxgl || mapbox;

      if (!mapboxgl || !mapboxgl.Map) {
        throw new Error('Mapbox GL JS not properly loaded.');
      }

      const mapInstance = new mapboxgl.Map({
        container: container,
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
      
      // Add custom Home button control
      class HomeControl {
        onAdd(map) {
          this._map = map;
          this._container = document.createElement('div');
          this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
          
          const button = document.createElement('button');
          button.className = 'mapboxgl-ctrl-home';
          button.type = 'button';
          button.title = 'Reset to default view';
          button.innerHTML = '🏠';
          button.style.cssText = 'font-size: 18px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fff; border: none;';
          
          button.addEventListener('click', () => {
            map.flyTo({
              center: [0, 20],
              zoom: 2,
              pitch: 0,
              bearing: 0,
              duration: 1500
            });
          });
          
          this._container.appendChild(button);
          return this._container;
        }
        
        onRemove() {
          this._container.parentNode.removeChild(this._container);
          this._map = undefined;
        }
      }
      
      mapInstance.addControl(new HomeControl(), 'top-right');

      mapRef.current = mapInstance;

      // Track zoom level and map movement to update markers
      const updateMapState = () => {
        setCurrentZoom(mapInstance.getZoom());
        setMapBounds(mapInstance.getBounds());
      };
      
      mapInstance.on('zoom', updateMapState);
      mapInstance.on('move', updateMapState);
      mapInstance.on('rotate', updateMapState);
      mapInstance.on('pitch', updateMapState);

      mapInstance.on('load', () => {
        console.log('Map loaded, applying custom theme...');
        setMapLoaded(true);
        setCurrentZoom(mapInstance.getZoom());
        setMapBounds(mapInstance.getBounds());

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

      const handleResize = () => {
        if (mapInstance && container && container.offsetWidth > 0 && container.offsetHeight > 0) {
          try {
            mapInstance.resize();
          } catch (e) {
            console.warn('Error resizing map:', e);
          }
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Use ResizeObserver to detect when container becomes visible
      let resizeObserver;
      if (window.ResizeObserver && container) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstance && container && container.offsetWidth > 0 && container.offsetHeight > 0) {
            try {
              mapInstance.resize();
            } catch (e) {
              console.warn('Error resizing map from ResizeObserver:', e);
            }
          }
        });
        resizeObserver.observe(container);
      }

      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        window.removeEventListener('resize', handleResize);
        if (mapInstance) {
          try {
            mapInstance.remove();
          } catch (e) {
            console.warn('Error removing map:', e);
          }
        }
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoadingError(error.message);
    }
  }, [mapbox]);

  // Handle map resize when container becomes visible (e.g., after toggling from knowledge graph)
  useEffect(() => {
    if (!mapRef.current || !mapContainerRef.current) return;
    
    const checkVisibility = () => {
      const container = mapContainerRef.current;
      if (container && mapRef.current) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Container is visible, trigger resize
          try {
            mapRef.current.resize();
          } catch (e) {
            console.warn('Error resizing map on visibility change:', e);
          }
        }
      }
    };
    
    // Check immediately
    checkVisibility();
    
    // Also check after a short delay to catch delayed renders
    const timer = setTimeout(checkVisibility, 200);
    
    return () => clearTimeout(timer);
  }, [mapLoaded]); // Re-run when map loads or when component becomes visible

  // Update markers when articles change, zoom changes, or mode changes
  useEffect(() => {
    if (!mapRef.current || !mapbox || !mapLoaded) return;
    
    // Only show article markers when in news panel
    if (activePanel !== 'news') {
      // Hide existing article markers
      markersRef.current.forEach(marker => {
        const el = marker.getElement();
        if (el) el.style.display = 'none';
      });
      return;
    }

    const map = mapRef.current;
    const mapboxgl = window.mapboxgl || mapbox;

    // Clear existing markers and popups
    markersRef.current.forEach(marker => {
      // Remove any popup attached to the marker
      if (marker.getPopup()) {
        marker.getPopup().remove();
      }
      marker.remove();
    });
    markersRef.current = [];
    popupsRef.current.forEach(popup => {
      if (popup) popup.remove();
    });
    popupsRef.current = [];
    currentOpenPopupRef.current = null;
    currentOpenMarkerRef.current = null;

    // Get current map bounds to filter markers on opposite side of globe
    const bounds = mapBounds || map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    // Helper function to check if a coordinate is actually visible on screen
    const isCoordinateVisible = (lat, lng) => {
      try {
        // Use map.project() to convert lat/lng to screen coordinates
        // This accounts for rotation, pitch, and actual visibility
        const point = map.project([lng, lat]);
        
        // Check if project() returned valid coordinates
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
          return false;
        }
        
        // Get the map container dimensions
        const container = map.getContainer();
        if (!container) {
          return false;
        }
        const width = container.offsetWidth || 0;
        const height = container.offsetHeight || 0;
        
        // Check if the point is within the visible viewport
        // Use tighter padding to prevent markers on the back of the globe
        const padding = 50;
        const isInViewport = point.x >= -padding && 
                            point.x <= width + padding && 
                            point.y >= -padding && 
                            point.y <= height + padding;
        
        // Also check bounds as a secondary check
        // This helps catch edge cases where project() might return coordinates
        // for points on the back of the globe that still project to screen space
        const inLatBounds = lat >= sw.lat && lat <= ne.lat;
        const lngWest = sw.lng;
        const lngEast = ne.lng;
        let inLngBounds;
        if (lngWest <= lngEast) {
          inLngBounds = lng >= lngWest && lng <= lngEast;
        } else {
          // Bounds wrap around date line
          inLngBounds = lng >= lngWest || lng <= lngEast;
        }
        
        // Point must be both in viewport AND in bounds
        return isInViewport && inLatBounds && inLngBounds;
      } catch (e) {
        // Fallback to bounds check if project() fails
        // Check latitude bounds
        if (lat < sw.lat || lat > ne.lat) {
          return false;
        }
        
        // Check longitude bounds (handle wrapping around date line)
        const lngWest = sw.lng;
        const lngEast = ne.lng;
        
        // Normal case: bounds don't wrap
        if (lngWest <= lngEast) {
          return lng >= lngWest && lng <= lngEast;
        } else {
          // Bounds wrap around date line (e.g., lngWest = 170, lngEast = -170)
          return lng >= lngWest || lng <= lngEast;
        }
      }
    };

    // Filter articles with gradual zoom-based visibility
    // Use demo articles if no articles provided, otherwise use provided articles
    // Always use demoArticles as fallback to ensure markers are shown
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
    
    // Filter out markers that are on the opposite side of the globe
    // Always filter by screen visibility when zoomed in enough
    let markersToCreate = articlesWithCoords;
    if (currentZoom >= 2.5) {
      // Filter by actual screen visibility when zoomed in
      // This prevents markers on the back of the globe from appearing
      markersToCreate = articlesWithCoords.filter(article => {
        const { lat, lng } = article.coordinates;
        return isCoordinateVisible(lat, lng);
      });
    } else if (currentZoom < 2.5) {
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
      
      // Determine marker color: pink/red if impacts holdings, otherwise category-based
      // Use mode to determine color if category is not clear
      let markerGradient;
      if (impactsHoldings) {
        markerGradient = 'linear-gradient(135deg,#ff6b6b,#ec4899)'; // Pink/red for impactful
      } else {
        // Check category first, then fall back to mode
        const articleCategory = article.category || (mode === 'political' ? 'political' : 'financial');
        markerGradient = articleCategory === 'financial' 
          ? 'linear-gradient(135deg,#4a9eff,#3a8eef)' // Blue for financial
          : 'linear-gradient(135deg,#8b5cf6,#7c3aed)'; // Purple for political
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

      // Create popup content with theme colors
      const popupContent = document.createElement('div');
      popupContent.className = 'marker-popup';

      // Add impact reason if article impacts holdings
      const impactReasonHTML = impactReason 
        ? `<div style="margin-top: 10px; padding: 10px; background: rgba(236, 72, 153, 0.15); border-left: 3px solid rgba(236, 72, 153, 0.6); border-radius: 6px;">
             <strong style="color: rgba(255, 255, 255, 0.95); display: block; margin-bottom: 4px;">⚠️ Why this matters:</strong>
             <p style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 12px; line-height: 1.5;">${impactReason}</p>
           </div>`
        : '';

      popupContent.innerHTML = `
          <div class="marker-info">
            <h3>${article.title}</h3>
          <p style="margin: 4px 0; color: rgba(255,255,255,0.7);">${article.location}</p>
          <span class="category-badge ${article.category || (mode === 'political' ? 'political' : 'financial')}">${(article.category || (mode === 'political' ? 'political' : 'financial')) === 'financial' ? '💰 Financial' : '🏛️ Political'}</span>
          ${impactReasonHTML}
          <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; width: 100%;">
            <button id="images-btn-${article.id}" style="
              display: inline-block;
              padding: 8px 16px;
              background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
              transition: all 0.2s;
              cursor: pointer;
            ">👁️ First-Person Perspective</button>
            <button id="mindmap-btn-${article.id}" style="
              display: inline-block;
              padding: 8px 16px;
              background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
              transition: all 0.2s;
              cursor: pointer;
            ">🧠 View Mind Map</button>
            <button id="podcast-btn-${article.id}" style="
              display: inline-block;
              padding: 8px 16px;
              background: linear-gradient(135deg, #4a9eff 0%, #3a8eef 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
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
      // Ensure coordinates are numbers
      const articleLat = typeof lat === 'number' ? lat : Number(lat);
      const articleLng = typeof lng === 'number' ? lng : Number(lng);
      const articleTitle = article.title;
      // Use location_name if available (from backend), otherwise use location
      const articleLocation = article.location_name || article.location || '';

      // Function to attach button handlers
      const attachButtonHandlers = () => {
        const imagesBtn = document.getElementById(`images-btn-${article.id}`);
        if (imagesBtn && !imagesBtn.dataset.handlersAttached) {
          imagesBtn.dataset.handlersAttached = 'true';
          imagesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Ensure coordinates are valid numbers
            const validLat = !isNaN(articleLat) && articleLat !== null && articleLat !== undefined;
            const validLng = !isNaN(articleLng) && articleLng !== null && articleLng !== undefined;
            
            if (validLat && validLng) {
              console.log('Setting Street View coordinates:', articleLat, articleLng);
              setPhotosphereCoords({ lat: articleLat, lng: articleLng });
              setPhotosphereTitle(articleTitle);
              setPhotosphereLocation(articleLocation);
              setPhotosphereStoryContext(article.story_context || '');
              setPhotosphereSummary(article.summary || '');
              // Use location_reasoning if available, otherwise generate a helpful fallback
              const defaultReasoning = articleLocation 
                ? `This location (${articleLocation}) is a significant landmark directly related to the article's ${article.category || 'topic'}.`
                : 'This location is relevant to the article topic.';
              setPhotosphereReasoning(article.location_reasoning || defaultReasoning);
              setPhotosphereOpen(true);
            } else {
              console.error('Invalid coordinates for Street View:', { lat: articleLat, lng: articleLng });
            }
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
        
        // Aggressively close ALL popups - both from refs and from markers
        // First, close the currently tracked popup
        if (currentOpenPopupRef.current) {
          try {
            currentOpenPopupRef.current.remove();
          } catch (err) {
            console.warn('Error removing current popup:', err);
          }
          currentOpenPopupRef.current = null;
        }
        
        // Close popup from the currently open marker
        if (currentOpenMarkerRef.current) {
          try {
            const existingPopup = currentOpenMarkerRef.current.getPopup();
            if (existingPopup) {
              existingPopup.remove();
            }
            currentOpenMarkerRef.current.setPopup(null);
          } catch (err) {
            console.warn('Error removing marker popup:', err);
          }
          currentOpenMarkerRef.current = null;
        }
        
        // Close ALL popups from ALL markers (comprehensive cleanup)
        markersRef.current.forEach(m => {
          try {
            const mPopup = m.getPopup();
            if (mPopup) {
              mPopup.remove();
            }
            m.setPopup(null);
          } catch (err) {
            console.warn('Error removing marker popup:', err);
          }
        });
        
        // Also remove any popups that might be directly on the map
        // Mapbox stores popups in the map's internal state, so we need to be thorough
        try {
          // Get all popup elements from the DOM and remove them
          const popupElements = map.getContainer().querySelectorAll('.mapboxgl-popup');
          popupElements.forEach(popupEl => {
            try {
              popupEl.remove();
            } catch (err) {
              console.warn('Error removing popup element:', err);
            }
          });
        } catch (err) {
          console.warn('Error querying popup elements:', err);
        }
        
        // Update selected article
        onArticleSelect(article);

        // Fly to the location
        map.flyTo({
          center: coordinates,
          zoom: 10,
          duration: 1000
        });

        // Show popup after a short delay to let flyTo start
        setTimeout(() => {
          console.log('Adding popup for:', article.title);
          
          // Double-check no other popups are open before adding this one
          const existingPopups = map.getContainer().querySelectorAll('.mapboxgl-popup');
          existingPopups.forEach(p => {
            if (p && p.parentNode) {
              p.remove();
            }
          });
          
          // Set this as the current open popup and marker
          currentOpenPopupRef.current = popup;
          currentOpenMarkerRef.current = marker;
          
          marker.setPopup(popup);
          popup.addTo(map);
          console.log('Popup added, isOpen:', popup.isOpen());

          // Attach button handlers after popup is shown
          setTimeout(attachButtonHandlers, 200);
          
          // Listen for popup close event to clear refs
          popup.on('close', () => {
            if (currentOpenPopupRef.current === popup) {
              currentOpenPopupRef.current = null;
            }
            if (currentOpenMarkerRef.current === marker) {
              currentOpenMarkerRef.current = null;
            }
          });
        }, 300);
      });

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

  }, [mapbox, mapLoaded, articles, selectedArticle, onArticleSelect, currentZoom, mapBounds, demoArticles, stocks, portfolio, mode, activePanel]);

  // Update company markers when companies panel is active
  useEffect(() => {
    if (!mapRef.current || !mapbox || !mapLoaded || activePanel !== 'companies') {
      // Clear company markers when not in companies panel
      companyMarkersRef.current.forEach(marker => marker.remove());
      companyMarkersRef.current = [];
      return;
    }

    const map = mapRef.current;
    const mapboxgl = window.mapboxgl || mapbox;

    // Clear existing company markers
    companyMarkersRef.current.forEach(marker => marker.remove());
    companyMarkersRef.current = [];

    // Hide article markers when in companies mode
    markersRef.current.forEach(marker => {
      const el = marker.getElement();
      if (el) el.style.display = 'none';
    });

    // Add company markers
    topCompanies.forEach(company => {
      if (!company.headquarters?.lat || !company.headquarters?.lng) return;

      const { lat, lng } = company.headquarters;
      const coordinates = [lng, lat];

      // Create company marker element
      const el = document.createElement('div');
      el.className = 'company-marker';
      el.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;';

      const innerEl = document.createElement('div');
      const isPositive = company.changePercent >= 0;
      innerEl.style.cssText = `
        width:32px;height:32px;border-radius:50%;border:3px solid white;
        box-shadow:0 4px 12px rgba(0,0,0,0.4);
        background:${isPositive ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)'};
        transition:transform 0.2s,box-shadow 0.2s;
        display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:bold;color:white;
      `;
      innerEl.textContent = company.symbol.substring(0, 2);
      el.appendChild(innerEl);

      // Hover effects
      el.addEventListener('mouseenter', (e) => {
        innerEl.style.transform = 'scale(1.4)';
        innerEl.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
        
        // If any chart is pinned, ignore hover events completely
        setHoverChart(prev => {
          if (prev.pinned) {
            return prev; // Don't change anything when a chart is pinned
          }
          // Show chart for this company on hover (always fixed position)
          return {
            visible: true,
            pinned: false,
            symbol: company.symbol,
            name: company.name,
            x: 0,
            y: 0
          };
        });
      });

      el.addEventListener('mouseleave', () => {
        innerEl.style.transform = 'scale(1)';
        innerEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        
        // If pinned, don't hide on mouseleave
        setHoverChart(prev => {
          if (prev.pinned) {
            return prev; // Keep visible if any chart is pinned
          }
          // Hide chart when mouse leaves
          return { visible: false, pinned: false, symbol: null, name: null, x: 0, y: 0 };
        });
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Pin the chart for this company in fixed top-right position
        setHoverChart({
          visible: true,
          pinned: true,
          symbol: company.symbol,
          name: company.name,
          x: 0, // Not used for pinned - fixed position in CSS
          y: 0
        });
        
        // Fly to company location
        map.flyTo({
          center: coordinates,
          zoom: 12,
          duration: 1000
        });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coordinates)
        .addTo(map);

      companyMarkersRef.current.push(marker);
    });

    // Show article markers when switching back
    return () => {
      markersRef.current.forEach(marker => {
        const el = marker.getElement();
        if (el) el.style.display = '';
      });
    };
  }, [mapbox, mapLoaded, activePanel, topCompanies]);

  // Handle panel change
  const handlePanelChange = (panel) => {
    if (onPanelChange) {
      onPanelChange(panel);
    }
    setHoverChart({ visible: false, pinned: false, symbol: null, name: null, x: 0, y: 0 });
  };

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

      {/* Panel Toggle */}
      <MapPanelToggle 
        activePanel={activePanel} 
        onPanelChange={handlePanelChange}
      />

      {/* Loading indicator for companies */}
      {activePanel === 'companies' && companiesLoading && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 12, 41, 0.9)',
          padding: '12px 24px',
          borderRadius: '12px',
          color: '#fff',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(139, 92, 246, 0.3)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading company data...
        </div>
      )}

      {/* Hover Chart for Companies - Always fixed position top-right */}
      {hoverChart.visible && (
        <div 
          style={{
            position: 'fixed',
            top: 100,
            right: 20,
            zIndex: 10000,
            pointerEvents: 'auto'
          }}
        >
          <CompanyHoverChart 
            symbol={hoverChart.symbol}
            name={hoverChart.name}
            isPinned={hoverChart.pinned}
            onClose={() => setHoverChart({ visible: false, pinned: false, symbol: null, name: null, x: 0, y: 0 })}
          />
        </div>
      )}

      <PhotosphereViewer
        isOpen={photosphereOpen}
        onClose={() => setPhotosphereOpen(false)}
        lat={photosphereCoords.lat}
        lng={photosphereCoords.lng}
        articleTitle={photosphereTitle}
        location={photosphereLocation}
        storyContext={photosphereStoryContext}
        articleSummary={photosphereSummary}
        locationReasoning={photosphereReasoning}
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
