import React from 'react';
import './PopularArticlesList.css';

const PopularArticlesList = ({ articles, onArticleClick, selectedArticle }) => {
  return (
    <div className="popular-articles-list">
      <p className="subtitle">Click to reveal and explore on map</p>
      
      <div className="articles-container">
        {articles.length === 0 ? (
          <div className="empty-state">
            <p>No articles available. Click "Refresh News" to load articles.</p>
          </div>
        ) : (
          articles.map((article) => (
            <div
              key={article.id}
              className={`article-card ${selectedArticle?.id === article.id ? 'selected' : ''} ${article.blurred ? 'blurred' : ''}`}
              onClick={() => onArticleClick(article)}
            >
              <div className="article-header">
                <span className={`category-badge ${article.category}`}>
                  {article.category}
                </span>
                <span className="location-tag">📍 {article.location}</span>
              </div>
              
              <h3 className="article-title">{article.title}</h3>
              
              {/* Always show article details in popular articles section */}
              <div className="article-details">
                <p className="article-summary">{article.summary}</p>
                <div className="article-meta">
                  <span className="source">{article.source}</span>
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="read-more"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Read Full Article →
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PopularArticlesList;
