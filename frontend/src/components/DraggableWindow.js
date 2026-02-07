import React, { useState, useRef, useEffect } from 'react';
import './DraggableWindow.css';

const DraggableWindow = ({ 
  title, 
  children, 
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 500 },
  minSize = { width: 300, height: 200 },
  onClose,
  isMinimized: externalMinimized,
  onMinimize,
  className = ''
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isMinimized, setIsMinimized] = useState(externalMinimized || false);
  const windowRef = useRef(null);
  const headerRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls') || e.target.closest('.window-resize-handle')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    // Store the initial mouse position and current window position
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      // Calculate how far the mouse has moved from the initial click
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // New position is the original position plus the mouse movement delta
      const newX = dragStart.posX + deltaX;
      const newY = dragStart.posY + deltaY;
      
      // Get parent container for bounds checking
      const parent = windowRef.current?.parentElement;
      const parentWidth = parent ? parent.clientWidth : window.innerWidth;
      const parentHeight = parent ? parent.clientHeight : window.innerHeight;
      
      // Keep window within bounds
      const maxX = parentWidth - size.width;
      const maxY = parentHeight - (isMinimized ? 50 : size.height);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(minSize.width, Math.min(resizeStart.width + deltaX, window.innerWidth - position.x));
      const newHeight = Math.max(minSize.height, Math.min(resizeStart.height + deltaY, window.innerHeight - position.y));
      
      setSize({
        width: newWidth,
        height: newHeight
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, position, size, isMinimized, resizeStart]);

  const handleResizeStart = (e) => {
    e.stopPropagation();
    const rect = windowRef.current.getBoundingClientRect();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height
    });
    setIsResizing(true);
  };

  const handleMinimize = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    if (onMinimize) {
      onMinimize(newMinimized);
    }
  };

  // Keep window within viewport on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - (isMinimized ? 50 : size.height);
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY))
      }));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [size, isMinimized]);

  return (
    <div
      ref={windowRef}
      className={`draggable-window ${className} ${isMinimized ? 'minimized' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? '50px' : `${size.height}px`,
        zIndex: isDragging || isResizing ? 10000 : 1000
      }}
    >
      <div
        ref={headerRef}
        className="window-header"
        onMouseDown={handleMouseDown}
      >
        <div className="window-title">{title}</div>
        <div className="window-controls">
          <button className="window-control minimize" onClick={handleMinimize} title="Minimize">
            {isMinimized ? '□' : '−'}
          </button>
          {onClose && (
            <button className="window-control close" onClick={onClose} title="Close">
              ×
            </button>
          )}
        </div>
      </div>
      {!isMinimized && (
        <>
          <div className="window-content">
            {children}
          </div>
          <div
            className="window-resize-handle"
            onMouseDown={handleResizeStart}
          />
        </>
      )}
    </div>
  );
};

export default DraggableWindow;
