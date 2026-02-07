import React, { useState, useMemo } from 'react';
import './ArticlesList.css';

const ArticlesList = ({ articles, onArticleClick, selectedArticle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState(null);

  // Simple text-based search as fallback
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) {
      return articles;
    }

    const query = searchQuery.toLowerCase();
    return articles.filter(article => {
      const title = (article.title || '').toLowerCase();
      const summary = (article.summary || '').toLowerCase();
      const location = (article.location || '').toLowerCase();
      const category = (article.category || '').toLowerCase();
      
      return title.includes(query) || 
             summary.includes(query) || 
             location.includes(query) ||
             category.includes(query);
    });
  }, [articles, searchQuery]);

  const handleAISearch = async () => {
    if (!searchQuery.trim()) {
      setAiSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';
      const response = await fetch(`${API_BASE_URL}/articles/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery,
          articles: articles 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSearchResults(data);
      } else {
        // Fallback to text search
        setAiSearchResults({ articles: filteredArticles, explanation: null });
      }
    } catch (error) {
      console.error('AI search error:', error);
      // Fallback to text search
      setAiSearchResults({ articles: filteredArticles, explanation: null });
    } finally {
      setIsSearching(false);
    }
  };

  const displayArticles = aiSearchResults?.articles || filteredArticles;

  return (
    <div className="articles-list">
      <div className="articles-search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="articles-search-input"
            placeholder="🔍 Search articles by keyword, location, or ask AI..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setAiSearchResults(null);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAISearch();
              }
            }}
          />
          <button
            className="ai-search-button"
            onClick={handleAISearch}
            disabled={isSearching || !searchQuery.trim()}
            title="AI-powered search"
          >
            {isSearching ? '⏳' : '🤖'}
          </button>
        </div>
        {aiSearchResults?.explanation && (
          <div className="ai-search-explanation">
            <strong>AI Analysis:</strong> {aiSearchResults.explanation}
          </div>
        )}
      </div>

      <div className="articles-container">
        {displayArticles.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchQuery.trim() 
                ? `No articles found matching "${searchQuery}"` 
                : 'No articles available. Click "Refresh News" to load articles.'}
            </p>
          </div>
        ) : (
          <>
            {searchQuery.trim() && (
              <div className="search-results-count">
                Found {displayArticles.length} article{displayArticles.length !== 1 ? 's' : ''}
              </div>
            )}
            {displayArticles.map((article) => (
              <div
                key={article.id}
                className={`article-card ${selectedArticle?.id === article.id ? 'selected' : ''}`}
                onClick={() => onArticleClick(article)}
              >
                <div className="article-header">
                  <span className={`category-badge ${article.category}`}>
                    {article.category}
                  </span>
                  <span className="location-tag">📍 {article.location}</span>
                </div>
                
                <h3 className="article-title">{article.title}</h3>
                
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
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ArticlesList;
