import React, { useState, useEffect, useRef } from 'react';
import './MindMapModal.css';

const MindMapModal = ({ isOpen, onClose, articleTitle, location }) => {
  const [mindMapContent, setMindMapContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const getMindMapPath = () => {
      if (!articleTitle && !location) return null;
      
      const titleLower = (articleTitle || '').toLowerCase();
      const locationLower = (location || '').toLowerCase();
      
      if (titleLower.includes('trump') || titleLower.includes('ice') || 
          titleLower.includes('immigration') || locationLower.includes('washington') || 
          locationLower.includes('dc')) {
        return '/mindmaps/trump_immigration_tactics.md';
      }
      
      if (titleLower.includes('london') || titleLower.includes('wales') || 
          titleLower.includes('brexit') || titleLower.includes('reform') ||
          locationLower.includes('london') || locationLower.includes('uk') ||
          locationLower.includes('wales')) {
        return '/mindmaps/london_reform_wales.md';
      }
      
      if (titleLower.includes('new york') || titleLower.includes('nycha') ||
          titleLower.includes('mayor') || locationLower.includes('new york') ||
          locationLower.includes('nyc')) {
        return '/mindmaps/new_york_nycha_investment.md';
      }
      
      return null;
    };

    const mindMapPath = getMindMapPath();
    if (!mindMapPath) {
      setError('No mind map available for this article');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(mindMapPath)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load mind map');
        return response.text();
      })
      .then(text => {
        setMindMapContent(text);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading mind map:', err);
        setError(err.message || 'Failed to load mind map');
        setLoading(false);
      });
  }, [isOpen, articleTitle, location]);

  // Parse tree structure
  const parseTree = (content) => {
    const codeBlockMatch = content.match(/```[\s\S]*?```/);
    if (!codeBlockMatch) return null;

    const treeContent = codeBlockMatch[0].replace(/```/g, '').trim();
    const lines = treeContent.split('\n').filter(line => line.trim());
    
    const nodes = [];
    const stack = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const indent = line.match(/^(\s*)/)[1].length;
      const isMain = !line.includes('├──') && !line.includes('└──') && line.includes('│');
      const isBranch = line.includes('├──') || line.includes('└──');
      
      let text = trimmed
        .replace(/^│\s*/, '')
        .replace(/^├──\s*/, '')
        .replace(/^└──\s*/, '')
        .replace(/\s*│$/, '')
        .trim();
      
      if (!text) return;
      text = text.replace(/[│├└──]/g, '').trim();
      if (!text) return;
      
      const node = {
        id: index,
        text,
        depth: Math.floor(indent / 2),
        isMain: isMain && indent === 0,
        isBranch,
        children: []
      };
      
      while (stack.length > 0 && stack[stack.length - 1].depth >= node.depth) {
        stack.pop();
      }
      
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      }
      
      stack.push(node);
      if (node.depth === 0) {
        nodes.push(node);
      }
    });
    
    return nodes.length > 0 ? nodes : (stack[0] ? [stack[0]] : []);
  };

  // Better positioning algorithm
  const calculatePositions = (nodes, startX = 400, startY = 200) => {
    const positionedNodes = [];
    const nodePositions = new Map();
    
    const getNodeHeight = (node) => {
      const lines = Math.ceil(node.text.length / 15);
      return Math.max(60, lines * 20 + 40);
    };
    
    const layoutNode = (node, parentX, parentY, level, siblingIndex, totalSiblings) => {
      const nodeHeight = getNodeHeight(node);
      const levelSpacing = 280;
      const siblingSpacing = 140;
      
      let x, y;
      
      if (level === 0) {
        // Root node in center
        x = startX;
        y = startY;
      } else {
        // Calculate Y position based on siblings
        const totalHeight = totalSiblings * siblingSpacing;
        const startYPos = parentY - totalHeight / 2 + siblingSpacing / 2;
        y = startYPos + siblingIndex * siblingSpacing;
        x = startX + level * levelSpacing;
      }
      
      const positioned = {
        ...node,
        x,
        y,
        parentX,
        parentY,
        width: 180,
        height: nodeHeight
      };
      
      positionedNodes.push(positioned);
      nodePositions.set(node.id, positioned);
      
      // Layout children
      if (node.children && node.children.length > 0) {
        node.children.forEach((child, idx) => {
          layoutNode(child, x, y, level + 1, idx, node.children.length);
        });
      }
    };
    
    nodes.forEach((node, idx) => {
      layoutNode(node, startX, startY, 0, idx, nodes.length);
    });
    
    return positionedNodes;
  };

  // Render mind map
  useEffect(() => {
    if (!mindMapContent || !svgRef.current || !containerRef.current) return;
    
    const nodes = parseTree(mindMapContent);
    if (!nodes || nodes.length === 0) return;
    
    const positionedNodes = calculatePositions(nodes);
    
    const svg = svgRef.current;
    const container = containerRef.current;
    
    // Calculate dimensions
    const maxX = Math.max(...positionedNodes.map(n => n.x + n.width/2), 1200);
    const maxY = Math.max(...positionedNodes.map(n => n.y + n.height/2), 800);
    const width = Math.max(1200, maxX + 100);
    const height = Math.max(800, maxY + 100);
    
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.innerHTML = '';
    
    // Add gradient definition
    const defs = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'rootGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#00D4FF');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#0099FF');
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    
    // Draw connections first (behind nodes)
    const connections = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
    connections.setAttribute('class', 'connections');
    
    positionedNodes.forEach(node => {
      if (node.parentX !== undefined && node.parentY !== undefined) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', node.parentX);
        line.setAttribute('y1', node.parentY);
        line.setAttribute('x2', node.x);
        line.setAttribute('y2', node.y);
        line.setAttribute('stroke', '#4a9eff');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.5');
        connections.appendChild(line);
      }
    });
    
    // Draw nodes
    const nodeGroup = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
    nodeGroup.setAttribute('class', 'nodes');
    
    positionedNodes.forEach(node => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      const isRoot = node.depth === 0;
      const nodeWidth = node.width;
      const nodeHeight = node.height;
      
      // Background box
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', node.x - nodeWidth/2);
      rect.setAttribute('y', node.y - nodeHeight/2);
      rect.setAttribute('width', nodeWidth);
      rect.setAttribute('height', nodeHeight);
      rect.setAttribute('rx', '12');
      
      if (isRoot) {
        rect.setAttribute('fill', 'url(#rootGradient)');
        rect.setAttribute('stroke', '#fff');
        rect.setAttribute('stroke-width', '4');
      } else {
        const colors = ['#00D4FF', '#FF6B9D', '#9B59B6', '#FFD700', '#FFA500', '#52C41A'];
        rect.setAttribute('fill', colors[node.depth % colors.length]);
        rect.setAttribute('stroke', '#fff');
        rect.setAttribute('stroke-width', '2');
      }
      
      group.appendChild(rect);
      
      // Text in foreignObject for proper wrapping
      const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      foreignObject.setAttribute('x', node.x - nodeWidth/2 + 10);
      foreignObject.setAttribute('y', node.y - nodeHeight/2 + 10);
      foreignObject.setAttribute('width', nodeWidth - 20);
      foreignObject.setAttribute('height', nodeHeight - 20);
      
      const textDiv = document.createElement('div');
      textDiv.className = 'node-text-container';
      textDiv.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: ${isRoot ? '#fff' : '#1a1a1a'};
        font-size: ${isRoot ? '14px' : '11px'};
        font-weight: ${isRoot ? '700' : '600'};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        line-height: 1.3;
        padding: 8px;
        word-wrap: break-word;
        overflow-wrap: break-word;
      `;
      textDiv.textContent = node.text;
      foreignObject.appendChild(textDiv);
      group.appendChild(foreignObject);
      
      nodeGroup.appendChild(group);
    });
    
  }, [mindMapContent]);

  if (!isOpen) return null;

  return (
    <div className="mindmap-modal-overlay" onClick={onClose}>
      <div className="mindmap-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="mindmap-modal-header">
          <h2>Mind Map: {articleTitle || location || 'Article'}</h2>
          <button className="mindmap-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="mindmap-modal-body" ref={containerRef}>
          {loading && (
            <div className="mindmap-loading">
              <p>Loading mind map...</p>
            </div>
          )}
          
          {error && (
            <div className="mindmap-error">
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && mindMapContent && (
            <div className="mindmap-display">
              <svg ref={svgRef} className="mindmap-svg"></svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MindMapModal;
