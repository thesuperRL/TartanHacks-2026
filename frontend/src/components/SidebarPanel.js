import React, { useState, useRef, useEffect } from 'react';
import './SidebarPanel.css';

// Global state to track sidebar panels for stacking
const sidebarPanels = new Set();
const PANEL_X_POSITION = 0; // x position for sidebar (full width)
const PANEL_SPACING = 0; // no spacing between panels
const SIDEBAR_WIDTH = 420; // fixed sidebar width

const SidebarPanel = ({ 
  title, 
  children, 
  defaultSize = { width: 400, height: 500 },
  isMinimized: externalMinimized,
  onMinimize,
  className = '',
  panelId
}) => {
  const [size, setSize] = useState({ ...defaultSize, width: SIDEBAR_WIDTH });
  const [isMinimized, setIsMinimized] = useState(externalMinimized || false);
  const [position, setPosition] = useState({ x: PANEL_X_POSITION, y: 80 });
  const panelRef = useRef(null);
  const uniqueId = useRef(panelId || `panel-${Date.now()}-${Math.random()}`);

  // Calculate available height (viewport - header)
  const calculateAvailableHeight = () => {
    const startY = 80; // Start position below header
    return window.innerHeight - startY;
  };

  const calculatePanelY = () => {
    // Calculate Y position based on other panels
    let yPos = 80; // Start position (below header)
    if (!panelRef.current) return yPos;
    
    // Get all sidebar panels, sorted by their order in DOM
    const allPanels = Array.from(document.querySelectorAll('.sidebar-panel'));
    const currentIndex = allPanels.indexOf(panelRef.current);
    
    // Calculate position based on panels that come before this one
    for (let i = 0; i < currentIndex; i++) {
      const panel = allPanels[i];
      if (panel && panel.getBoundingClientRect) {
        const panelRect = panel.getBoundingClientRect();
        const panelBottom = panelRect.top + panelRect.height;
        yPos = Math.max(yPos, panelBottom + PANEL_SPACING);
      }
    }
    return yPos;
  };

  // Check if this is the last panel in the stack
  const isLastPanel = () => {
    if (!panelRef.current) return false;
    const allPanels = Array.from(document.querySelectorAll('.sidebar-panel'));
    const currentIndex = allPanels.indexOf(panelRef.current);
    return currentIndex === allPanels.length - 1;
  };

  // Calculate height - last panel fills remaining space, others use default or calculated size
  useEffect(() => {
    const updateHeight = () => {
      const availableHeight = calculateAvailableHeight();
      const headerHeight = 50; // Header height of the panel
      const currentY = position.y;
      const spaceAbove = currentY - 80; // Space from header to this panel
      
      if (isLastPanel()) {
        // Last panel fills remaining space
        const newHeight = availableHeight - spaceAbove;
        setSize(prev => ({ ...prev, height: Math.max(300, newHeight - headerHeight) }));
      } else {
        // Other panels use default size or reasonable calculated size
        // Use default height if it fits, otherwise calculate based on available space
        const remainingSpace = availableHeight - spaceAbove;
        const maxHeight = Math.min(defaultSize.height, remainingSpace - headerHeight);
        setSize(prev => ({ ...prev, height: Math.max(300, maxHeight) }));
      }
    };
    
    // Initial calculation after position is set
    const timer = setTimeout(updateHeight, 200);
    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
    };
  }, [position.y, defaultSize.height]);

  const handleMinimize = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    if (onMinimize) {
      onMinimize(newMinimized);
    }
    // Recalculate positions after minimize
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('recalculatePanelPositions'));
    }, 300); // Wait for animation to complete
  };

  // Initialize panel position
  useEffect(() => {
    sidebarPanels.add(uniqueId.current);
    // Use a longer timeout to ensure all panels are mounted
    const timer = setTimeout(() => {
      const panelY = calculatePanelY();
      setPosition({ x: PANEL_X_POSITION, y: panelY });
      // Trigger recalculation for other panels
      window.dispatchEvent(new CustomEvent('recalculatePanelPositions'));
      // Update height based on whether this is the last panel
      const availableHeight = calculateAvailableHeight();
      const headerHeight = 50;
      const spaceAbove = panelY - 80;
      
      if (isLastPanel()) {
        const newHeight = availableHeight - spaceAbove;
        setSize(prev => ({ ...prev, height: Math.max(300, newHeight - headerHeight) }));
      } else {
        const remainingSpace = availableHeight - spaceAbove;
        const maxHeight = Math.min(defaultSize.height, remainingSpace - headerHeight);
        setSize(prev => ({ ...prev, height: Math.max(300, maxHeight) }));
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [defaultSize.height]);

  // Recalculate position when other panels change
  useEffect(() => {
    const handleRecalculatePanel = () => {
      const panelY = calculatePanelY();
      setPosition({ x: PANEL_X_POSITION, y: panelY });
      // Update height based on whether this is the last panel
      setTimeout(() => {
        const availableHeight = calculateAvailableHeight();
        const headerHeight = 50;
        const spaceAbove = panelY - 80;
        const bottomPadding = 20;
        
        if (isLastPanel()) {
          const newHeight = availableHeight - spaceAbove - bottomPadding;
          setSize(prev => ({ ...prev, height: Math.max(300, newHeight - headerHeight) }));
        } else {
          const remainingSpace = availableHeight - spaceAbove - bottomPadding;
          const maxHeight = Math.min(defaultSize.height, remainingSpace - headerHeight);
          setSize(prev => ({ ...prev, height: Math.max(300, maxHeight) }));
        }
      }, 100);
    };

    window.addEventListener('recalculatePanelPositions', handleRecalculatePanel);
    return () => {
      window.removeEventListener('recalculatePanelPositions', handleRecalculatePanel);
    };
  }, [isMinimized, defaultSize.height]);

  // Recalculate on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      setTimeout(() => {
        const panelY = calculatePanelY();
        setPosition({ x: PANEL_X_POSITION, y: panelY });
        const availableHeight = calculateAvailableHeight();
        const headerHeight = 50;
        const spaceAbove = panelY - 80;
        const bottomPadding = 20;
        
        if (isLastPanel()) {
          const newHeight = availableHeight - spaceAbove - bottomPadding;
          setSize(prev => ({ ...prev, height: Math.max(300, newHeight - headerHeight) }));
        } else {
          const remainingSpace = availableHeight - spaceAbove - bottomPadding;
          const maxHeight = Math.min(defaultSize.height, remainingSpace - headerHeight);
          setSize(prev => ({ ...prev, height: Math.max(300, maxHeight) }));
        }
      }, 0);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isMinimized, defaultSize.height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sidebarPanels.delete(uniqueId.current);
      // Trigger recalculation after a delay to ensure DOM is updated
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('recalculatePanelPositions'));
      }, 150);
    };
  }, []);

  // Recalculate when component mounts or when panels might have changed
  useEffect(() => {
    // Small delay to ensure all panels are in the DOM
    const timer = setTimeout(() => {
      const panelY = calculatePanelY();
      setPosition({ x: PANEL_X_POSITION, y: panelY });
      window.dispatchEvent(new CustomEvent('recalculatePanelPositions'));
    }, 200);

    return () => clearTimeout(timer);
  }, []); // Only run on mount

  return (
    <div
      ref={panelRef}
      className={`sidebar-panel ${className} ${isMinimized ? 'minimized' : ''}`}
      style={{
        left: `${PANEL_X_POSITION}px`,
        top: `${position.y}px`,
        width: `${SIDEBAR_WIDTH}px`,
        height: isMinimized ? '50px' : `${size.height}px`,
        zIndex: 1000,
        transition: 'top 0.3s ease, height 0.3s ease'
      }}
    >
      <div className="panel-header">
        <div className="panel-title">{title}</div>
        <div className="panel-controls">
          <button className="panel-control minimize" onClick={handleMinimize} title="Minimize">
            {isMinimized ? '□' : '−'}
          </button>
        </div>
      </div>
      {!isMinimized && (
        <div className="panel-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default SidebarPanel;
