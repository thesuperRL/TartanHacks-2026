import React from 'react';
import './MapPanelToggle.css';

const MapPanelToggle = ({ activePanel, onPanelChange }) => {
  return (
    <div className="map-panel-toggle">
      <button
        className={`panel-toggle-btn ${activePanel === 'news' ? 'active' : ''}`}
        onClick={() => onPanelChange('news')}
      >
        <span className="toggle-icon">📰</span>
        <span className="toggle-text">News Articles</span>
      </button>
      <button
        className={`panel-toggle-btn ${activePanel === 'companies' ? 'active' : ''}`}
        onClick={() => onPanelChange('companies')}
      >
        <span className="toggle-icon">🏢</span>
        <span className="toggle-text">Top Companies</span>
      </button>
    </div>
  );
};

export default MapPanelToggle;
