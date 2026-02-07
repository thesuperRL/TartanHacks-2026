import React from 'react';
import './ModeSelector.css';

const ModeSelector = ({ selectedMode, onModeChange }) => {
  return (
    <div className="mode-selector">
      <button
        className={`mode-button ${selectedMode === 'economic' ? 'active' : ''}`}
        onClick={() => onModeChange('economic')}
      >
        💰 Economic Mode
      </button>
      <button
        className={`mode-button ${selectedMode === 'political' ? 'active' : ''}`}
        onClick={() => onModeChange('political')}
      >
        🏛️ Political Mode
      </button>
    </div>
  );
};

export default ModeSelector;
