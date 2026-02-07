import React from 'react';
import { checkArticleImpact } from '../utils/checkArticleImpact';
import './ImportantArticlesList.css';

const ImportantArticlesList = ({ articles, stocks, portfolio, onArticleClick, selectedArticle }) => {
  // Filter articles that impact holdings
  // Also check demo articles from MapViewer if needed
  const allArticles = articles || [];
  
  const importantArticles = allArticles.filter(article => {
    const impact = checkArticleImpact(article, stocks, portfolio);
    return impact.impacts;
  }).map(article => {
    const impact = checkArticleImpact(article, stocks, portfolio);
    return {
      ...article,
      impactReason: impact.reason
    };
  });

  return (
    <div className="important-articles-list">
      <p className="subtitle">
        {importantArticles.length > 0 
          ? `${importantArticles.length} article${importantArticles.length !== 1 ? 's' : ''} may impact your portfolio`
          : 'No articles found that impact your holdings'}
      </p>
      
      <div className="articles-container">
        {importantArticles.length === 0 ? (
          <div className="empty-state">
            <p>No important articles at this time. Articles that mention your holdings will appear here.</p>
          </div>
        ) : (
          importantArticles.map((article) => (
            <div
              key={article.id}
              className={`article-card important ${selectedArticle?.id === article.id ? 'selected' : ''}`}
              onClick={() => onArticleClick(article)}
            >
              <div className="article-header">
                <span className="important-badge">⚠️ Important</span>
                <span className="location-tag">📍 {article.location}</span>
              </div>
              
              <h3 className="article-title">{article.title}</h3>
              
              {article.impactReason && (
                <div className="impact-reason">
                  <strong>Why this matters:</strong> {article.impactReason}
                </div>
              )}
              
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

export default ImportantArticlesList;
