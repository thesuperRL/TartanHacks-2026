import React, { useState, useEffect, useRef } from 'react';
import './KnowledgeGraph.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

// SVG-based graph node
const GraphNode = ({ x, y, width, height, label, fullText, icon, color, borderColor, textColor = '#fff', isTruncated, isSelected, onClick }) => {
    const rx = 16;
    const displayLabel = label.length > 30 ? label.substring(0, 28) + '...' : label;
    const truncated = label.length > 30 || isTruncated;

    return (
        <g
            onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
            style={{ cursor: truncated ? 'pointer' : 'default' }}
        >
            <defs>
                <filter id={`shadow-${x}-${y}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={borderColor} floodOpacity="0.4" />
                </filter>
                <linearGradient id={`grad-${x}-${y}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor={borderColor} />
                </linearGradient>
            </defs>
            <rect
                x={x - width / 2}
                y={y - height / 2}
                width={width}
                height={height}
                rx={rx}
                ry={rx}
                fill={`url(#grad-${x}-${y})`}
                stroke={isSelected ? '#fff' : borderColor}
                strokeWidth={isSelected ? '3' : '2'}
                filter={`url(#shadow-${x}-${y})`}
            />
            {truncated && (
                <circle cx={x + width / 2 - 14} cy={y - height / 2 + 14} r="8" fill="rgba(255,255,255,0.25)" />
            )}
            {truncated && (
                <text x={x + width / 2 - 14} y={y - height / 2 + 14} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="9" fontWeight="700">···</text>
            )}
            <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textColor}
                fontSize="13"
                fontWeight="600"
                fontFamily="'Inter', 'Segoe UI', sans-serif"
            >
                {icon && <tspan>{icon} </tspan>}
                <tspan>{displayLabel}</tspan>
            </text>
        </g>
    );
};

// SVG arrow between nodes
const GraphEdge = ({ x1, y1, x2, y2, color = '#FF6B9D' }) => {
    // Calculate the angle for the arrowhead
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const len = Math.sqrt(dx * dx + dy * dy);

    // Shorten the line so the arrow doesn't overlap nodes
    const shortenBy = 30;
    const startX = x1 + Math.cos(angle) * shortenBy;
    const startY = y1 + Math.sin(angle) * shortenBy;
    const endX = x2 - Math.cos(angle) * shortenBy;
    const endY = y2 - Math.sin(angle) * shortenBy;

    // Arrowhead
    const arrowSize = 10;
    const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
    const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
    const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
    const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

    // Curved path for nicer look
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 15;

    return (
        <g>
            <path
                d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeOpacity="0.7"
                markerEnd=""
            />
            <polygon
                points={`${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
                fill={color}
                fillOpacity="0.8"
            />
        </g>
    );
};

const KnowledgeGraph = ({ portfolio, stocks, initialArticleUrl = null }) => {
    // Initialize with initialArticleUrl if provided
    const [articleUrl, setArticleUrl] = useState(initialArticleUrl || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [graphData, setGraphData] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const svgRef = useRef(null);
    const hasGeneratedRef = useRef(false);
    const lastGeneratedUrlRef = useRef(null);

    // Set demo data on mount (only if no initial article URL)
    useEffect(() => {
        if (!initialArticleUrl) {
            setGraphData({
                article: { title: 'Demo: How Market Events Impact Your Portfolio', summary: 'This is a demo knowledge graph. Enter an article URL above to generate a real analysis of how news impacts your investments.' },
                events: ['Market policy changes announced', 'Tech sector reacts to new regulations', 'Consumer confidence shifts'],
                impacts: [
                    { stock: 'AAPL', type: 'positive', description: 'Benefits from increased consumer spending', reasoning: 'Strong brand loyalty provides buffer against market volatility' },
                    { stock: 'GOOGL', type: 'neutral', description: 'Mixed impact from regulatory changes', reasoning: 'Advertising revenue may be affected but cloud services remain strong' },
                    { stock: 'MSFT', type: 'negative', description: 'Enterprise spending may slow down', reasoning: 'Budget cuts in corporate sector affect software licensing' }
                ],
                reasoning: ['Tech sector resilience varies by sub-sector', 'Consumer-facing companies adapt faster to policy changes']
            });
        }
    }, [initialArticleUrl]);

    // Auto-generate graph if initialArticleUrl is provided
    useEffect(() => {
        console.log('KnowledgeGraph: initialArticleUrl changed:', initialArticleUrl);
        if (initialArticleUrl && initialArticleUrl.trim()) {
            console.log('KnowledgeGraph: Setting articleUrl and starting generation');
            // Update the article URL input
            setArticleUrl(initialArticleUrl);
            
            // Only generate if we haven't already generated for this URL
            if (lastGeneratedUrlRef.current !== initialArticleUrl) {
                console.log('KnowledgeGraph: New URL detected, will generate graph');
                lastGeneratedUrlRef.current = initialArticleUrl;
                hasGeneratedRef.current = false;
                
                // Clear any existing graph data
                setGraphData(null);
                setError(null);
                
                // Start generation after a short delay to ensure state is updated
                const timer = setTimeout(async () => {
                    console.log('KnowledgeGraph: Starting auto-generation for URL:', initialArticleUrl);
                    // Use the initialArticleUrl directly since state might not be updated yet
                    const urlToUse = initialArticleUrl.trim();
                    if (!urlToUse) {
                        setError('Please enter an article URL');
                        return;
                    }
                    
                    // Prevent duplicate generation
                    if (hasGeneratedRef.current && lastGeneratedUrlRef.current === urlToUse) {
                        return;
                    }
                    
                    hasGeneratedRef.current = true;
                    setLoading(true);
                    setError(null);

                    try {
                        // Extract stock symbols from stocks array (handle both object and string formats)
                        const stockSymbols = [];
                        if (stocks && Array.isArray(stocks)) {
                            stocks.forEach(s => {
                                if (typeof s === 'string') {
                                    stockSymbols.push(s);
                                } else if (s && s.symbol) {
                                    stockSymbols.push(s.symbol);
                                }
                            });
                        }
                        
                        // Also check portfolio if it has stocks
                        if (portfolio && Array.isArray(portfolio)) {
                            portfolio.forEach(s => {
                                if (typeof s === 'string' && !stockSymbols.includes(s)) {
                                    stockSymbols.push(s);
                                } else if (s && s.symbol && !stockSymbols.includes(s.symbol)) {
                                    stockSymbols.push(s.symbol);
                                }
                            });
                        }

                        console.log('Sending request with stocks:', stockSymbols);

                        const response = await fetch(`${API_BASE_URL}/knowledge-graph`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                article_url: urlToUse,
                                portfolio_stocks: stockSymbols,
                            }),
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            let errorData;
                            try {
                                errorData = JSON.parse(errorText);
                            } catch {
                                errorData = { message: errorText || `HTTP error! status: ${response.status}` };
                            }
                            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
                        }

                        const data = await response.json();
                        console.log('Knowledge graph data received:', data);
                        
                        // Validate and set graph data
                        if (data.status === 'error') {
                            throw new Error(data.message || 'Failed to generate knowledge graph');
                        }
                        
                        // Ensure data has the expected structure
                        const graphData = {
                            article: data.article || { title: 'Article', summary: '' },
                            events: data.events || [],
                            impacts: data.impacts || [],
                            reasoning: data.reasoning || []
                        };
                        
                        setGraphData(graphData);
                    } catch (err) {
                        console.error('Error generating knowledge graph:', err);
                        setError(err.message || 'Failed to generate knowledge graph. Please check the article URL and try again.');
                        hasGeneratedRef.current = false;
                    } finally {
                        setLoading(false);
                    }
                }, 200);
                return () => clearTimeout(timer);
            }
        } else {
            // Reset refs when initialArticleUrl is cleared
            lastGeneratedUrlRef.current = null;
            hasGeneratedRef.current = false;
        }
    }, [initialArticleUrl, portfolio, stocks]);

    const generateKnowledgeGraph = async () => {
        if (!articleUrl.trim()) {
            setError('Please enter an article URL');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Extract stock symbols from stocks array (handle both object and string formats)
            const stockSymbols = [];
            if (stocks && Array.isArray(stocks)) {
                stocks.forEach(s => {
                    if (typeof s === 'string') {
                        stockSymbols.push(s);
                    } else if (s && s.symbol) {
                        stockSymbols.push(s.symbol);
                    }
                });
            }
            
            // Also check portfolio if it has stocks
            if (portfolio && Array.isArray(portfolio)) {
                portfolio.forEach(s => {
                    if (typeof s === 'string' && !stockSymbols.includes(s)) {
                        stockSymbols.push(s);
                    } else if (s && s.symbol && !stockSymbols.includes(s.symbol)) {
                        stockSymbols.push(s.symbol);
                    }
                });
            }

            console.log('Sending request with stocks:', stockSymbols);

            const response = await fetch(`${API_BASE_URL}/knowledge-graph`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    article_url: articleUrl.trim(),
                    portfolio_stocks: stockSymbols,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || `HTTP error! status: ${response.status}` };
                }
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Knowledge graph data received:', data);
            
            // Validate and set graph data
            if (data.status === 'error') {
                throw new Error(data.message || 'Failed to generate knowledge graph');
            }
            
            // Ensure data has the expected structure
            const graphData = {
                article: data.article || { title: 'Article', summary: '' },
                events: data.events || [],
                impacts: data.impacts || [],
                reasoning: data.reasoning || []
            };
            
            setGraphData(graphData);
            setError(null);
        } catch (err) {
            console.error('Error generating knowledge graph:', err);
            setError(err.message || 'Failed to generate knowledge graph. Please check the article URL and try again.');
        } finally {
            setLoading(false);
        }
    };

    // Build graph layout
    const buildGraphLayout = () => {
        if (!graphData) return { nodes: [], edges: [] };

        const nodes = [];
        const edges = [];
        const svgWidth = 1100;
        const nodeWidth = 220;
        const nodeHeight = 50;

        // Article node - top center
        const articleTitle = graphData.article?.title || 'Article';
        const articleSummary = graphData.article?.summary || '';
        nodes.push({
            id: 'article',
            x: svgWidth / 2, y: 60,
            width: 280, height: 55,
            label: articleTitle.substring(0, 40),
            fullText: articleTitle,
            extraInfo: articleSummary,
            category: 'Article',
            icon: '📰', color: '#0077b6', borderColor: '#0096c7',
        });

        // Events - second row
        const events = graphData.events || [];
        const eventSpacing = svgWidth / (events.length + 1);
        events.forEach((event, i) => {
            const id = `event-${i}`;
            const eventStr = String(event);
            nodes.push({
                id,
                x: eventSpacing * (i + 1), y: 180,
                width: nodeWidth, height: nodeHeight,
                label: eventStr.substring(0, 35),
                fullText: eventStr,
                category: 'Event',
                icon: '📅', color: '#e63946', borderColor: '#d62828',
            });
            edges.push({ from: 'article', to: id, color: '#e63946' });
        });

        // Impacts - third row
        const impacts = graphData.impacts || [];
        const impactSpacing = svgWidth / (impacts.length + 1);
        impacts.forEach((impact, i) => {
            const id = `impact-${i}`;
            const typeColor = impact.type === 'positive' ? '#2d6a4f' : impact.type === 'negative' ? '#9d0208' : '#6c757d';
            const typeBorder = impact.type === 'positive' ? '#40916c' : impact.type === 'negative' ? '#d00000' : '#adb5bd';
            const shortDesc = `${impact.stock}: ${(impact.description || '').substring(0, 25)}`;
            const fullDesc = `${impact.stock}: ${impact.description || 'No description'}`;
            nodes.push({
                id,
                x: impactSpacing * (i + 1), y: 310,
                width: nodeWidth, height: nodeHeight,
                label: shortDesc,
                fullText: fullDesc,
                extraInfo: impact.reasoning || '',
                category: `Impact (${impact.type || 'neutral'})`,
                icon: '💼', color: typeColor, borderColor: typeBorder,
            });
            // Connect each event to each impact
            events.forEach((_, ei) => {
                edges.push({ from: `event-${ei}`, to: id, color: typeBorder });
            });
        });

        // Reasoning - fourth row
        const reasoning = graphData.reasoning || [];
        const reasonSpacing = svgWidth / (reasoning.length + 1);
        reasoning.forEach((reason, i) => {
            const id = `reason-${i}`;
            const reasonStr = String(reason);
            nodes.push({
                id,
                x: reasonSpacing * (i + 1), y: 440,
                width: nodeWidth + 20, height: nodeHeight,
                label: reasonStr.substring(0, 40),
                fullText: reasonStr,
                category: 'Reasoning',
                icon: '💡', color: '#2b9348', borderColor: '#55a630',
            });
            // Connect each impact to each reason
            impacts.forEach((_, ii) => {
                edges.push({ from: `impact-${ii}`, to: id, color: '#55a630' });
            });
        });

        return { nodes, edges };
    };

    const { nodes, edges } = buildGraphLayout();
    const svgWidth = 1100;
    const svgHeight = 520;

    // Build a map of node id -> position for edges
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    return (
        <div className="knowledge-graph-page">
            <div className="knowledge-graph-header">
                <h1>🧠 Knowledge Graph</h1>
                <p>Analyze articles and visualize their impact on your investments</p>
            </div>

            <div className="knowledge-graph-container">
                <div className="input-section">
                    <div className="input-group">
                        <label htmlFor="article-url">Article URL</label>
                        <input
                            id="article-url"
                            type="url"
                            value={articleUrl}
                            onChange={(e) => setArticleUrl(e.target.value)}
                            placeholder="https://example.com/article"
                            disabled={loading}
                            onKeyDown={(e) => e.key === 'Enter' && generateKnowledgeGraph()}
                        />
                    </div>
                    <button
                        onClick={generateKnowledgeGraph}
                        disabled={loading || !articleUrl.trim()}
                        className="generate-button"
                    >
                        {loading ? 'Analyzing...' : 'Generate Knowledge Graph'}
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        <p>❌ {error}</p>
                    </div>
                )}

                {loading && (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Analyzing article and generating knowledge graph...</p>
                    </div>
                )}

                {graphData && (
                    <div className="graph-section">
                        <div className="graph-header">
                            <h2>Knowledge Graph Visualization</h2>
                            {graphData.article && (
                                <div className="article-info">
                                    <h3>{graphData.article.title}</h3>
                                    {graphData.article.summary && (
                                        <p className="article-summary">{graphData.article.summary}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="graph-legend">
                            <div className="legend-item"><span className="legend-dot" style={{ background: '#0096c7' }}></span> Article</div>
                            <div className="legend-item"><span className="legend-dot" style={{ background: '#e63946' }}></span> Events</div>
                            <div className="legend-item"><span className="legend-dot" style={{ background: '#6c757d' }}></span> Impacts</div>
                            <div className="legend-item"><span className="legend-dot" style={{ background: '#55a630' }}></span> Reasoning</div>
                            <div className="legend-item"><span className="legend-dot" style={{ background: '#40916c' }}></span> Positive</div>
                            <div className="legend-item"><span className="legend-dot" style={{ background: '#d00000' }}></span> Negative</div>
                        </div>

                        {/* SVG Graph */}
                        <div className="svg-graph-container" onClick={() => setSelectedNode(null)}>
                            <svg
                                ref={svgRef}
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                width="100%"
                                height={svgHeight}
                                style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}
                            >
                                {/* Render edges first (behind nodes) */}
                                {edges.map((edge, i) => {
                                    const from = nodeMap[edge.from];
                                    const to = nodeMap[edge.to];
                                    if (!from || !to) return null;
                                    return (
                                        <GraphEdge
                                            key={`edge-${i}`}
                                            x1={from.x}
                                            y1={from.y}
                                            x2={to.x}
                                            y2={to.y}
                                            color={edge.color}
                                        />
                                    );
                                })}
                                {/* Render nodes on top */}
                                {nodes.map((node) => (
                                    <GraphNode
                                        key={node.id}
                                        x={node.x}
                                        y={node.y}
                                        width={node.width}
                                        height={node.height}
                                        label={node.label}
                                        fullText={node.fullText}
                                        icon={node.icon}
                                        color={node.color}
                                        borderColor={node.borderColor}
                                        isTruncated={node.fullText && node.fullText.length > 30}
                                        isSelected={selectedNode?.id === node.id}
                                        onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                                    />
                                ))}
                            </svg>
                        </div>

                        {/* Tooltip for selected node */}
                        {selectedNode && (
                            <div className="node-tooltip" onClick={() => setSelectedNode(null)}>
                                <div className="node-tooltip-content" onClick={(e) => e.stopPropagation()}>
                                    <button className="tooltip-close" onClick={() => setSelectedNode(null)}>×</button>
                                    <div className="tooltip-category">{selectedNode.icon} {selectedNode.category || 'Node'}</div>
                                    <p className="tooltip-text">{selectedNode.fullText}</p>
                                    {selectedNode.extraInfo && (
                                        <p className="tooltip-extra">{selectedNode.extraInfo}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Impacts detail cards */}
                        {graphData.impacts && graphData.impacts.length > 0 && (
                            <div className="impacts-section">
                                <h3>Investment Impacts</h3>
                                <div className="impacts-list">
                                    {graphData.impacts.map((impact, idx) => (
                                        <div key={idx} className="impact-item">
                                            <div className="impact-header">
                                                <span className="stock-badge">{impact.stock}</span>
                                                <span className={`impact-type ${impact.type || 'neutral'}`}>
                                                    {impact.type === 'positive' ? '📈 Positive' : impact.type === 'negative' ? '📉 Negative' : '➡️ Neutral'}
                                                </span>
                                            </div>
                                            <p className="impact-description">{impact.description}</p>
                                            {impact.reasoning && (
                                                <p className="impact-reasoning">💡 {impact.reasoning}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeGraph;
