import React from 'react';
import './CategorySelector.css';

const CategorySelector = ({ selectedCategory, onCategoryChange }) => {
  return (
    <div className="category-selector">
      <button
        className={`category-button ${selectedCategory === 'all' ? 'active' : ''}`}
        onClick={() => onCategoryChange('all')}
      >
        All News
      </button>
      <button
        className={`category-button ${selectedCategory === 'financial' ? 'active' : ''}`}
        onClick={() => onCategoryChange('financial')}
      >
        💰 Financial
      </button>
      <button
        className={`category-button ${selectedCategory === 'political' ? 'active' : ''}`}
        onClick={() => onCategoryChange('political')}
      >
        🏛️ Political
      </button>
    </div>
  );
};

export default CategorySelector;
