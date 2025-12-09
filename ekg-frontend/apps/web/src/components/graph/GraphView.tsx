'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  val?: number;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relationship: string;
  value?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphViewProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
}

// Neo4j-inspired color palette
const NEO4J_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  employee: { fill: '#4C8EDA', stroke: '#2870BD', text: '#FFFFFF' },
  department: { fill: '#DA7194', stroke: '#B84D6E', text: '#FFFFFF' },
  skill: { fill: '#57C7E3', stroke: '#3AA6C4', text: '#1A1A1A' },
  project: { fill: '#F79767', stroke: '#D47747', text: '#1A1A1A' },
  document: { fill: '#C990C0', stroke: '#A66F9E', text: '#FFFFFF' },
  technology: { fill: '#8DCC93', stroke: '#6BAA71', text: '#1A1A1A' },
  position: { fill: '#ECB5C9', stroke: '#C993A8', text: '#1A1A1A' },
  location: { fill: '#FFC454', stroke: '#D9A43C', text: '#1A1A1A' },
  default: { fill: '#D9D9D9', stroke: '#A6A6A6', text: '#1A1A1A' },
};

// Relationship type colors
const RELATIONSHIP_COLORS: Record<string, string> = {
  'WORKS_IN': '#DA7194',
  'HAS_SKILL': '#57C7E3',
  'WORKS_ON': '#F79767',
  'MANAGES': '#4C8EDA',
  'PART_OF': '#C990C0',
  'HAS_DOC': '#8DCC93',
  'HAS_POSITION': '#ECB5C9',
  'LOCATED_AT': '#FFC454',
  'default': '#A6A6A6',
};

export function GraphView({ data, width = 600, height = 450, onNodeClick }: GraphViewProps) {
  const fgRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Configure d3 forces for better spacing
  useEffect(() => {
    if (fgRef.current && mounted) {
      // Increase link distance and repulsion for better spacing
      fgRef.current.d3Force('link')?.distance(100);
      fgRef.current.d3Force('charge')?.strength(-200);
    }
  }, [mounted, data]);

  // Get node colors
  const getNodeColors = useCallback((node: GraphNode) => {
    return NEO4J_COLORS[node.type] || NEO4J_COLORS.default;
  }, []);

  // Get link color
  const getLinkColor = useCallback((link: any) => {
    return RELATIONSHIP_COLORS[link.relationship] || RELATIONSHIP_COLORS.default;
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    onNodeClick?.(node);
    
    // Center on node
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 500);
      fgRef.current.zoom(2, 500);
    }
  }, [onNodeClick]);

  // Zoom controls
  const handleZoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.5, 300);
  const handleZoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.5, 300);
  const handleFitToScreen = () => fgRef.current?.zoomToFit(400, 50);
  const handleReset = () => {
    setSelectedNode(null);
    fgRef.current?.zoomToFit(400, 50);
  };

  // Custom node rendering - Neo4j style
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Skip if node position is not initialized
    if (typeof node.x !== 'number' || typeof node.y !== 'number' || !isFinite(node.x) || !isFinite(node.y)) {
      return;
    }

    const colors = getNodeColors(node);
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode?.id === node.id;
    // Smaller nodes for better visualization
    const baseRadius = node.val ? Math.min(Math.sqrt(node.val) * 2.5, 25) : 12;
    const radius = isSelected ? baseRadius * 1.15 : (isHovered ? baseRadius * 1.08 : baseRadius);

    // Draw outer glow for selected/hovered
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? 'rgba(76, 142, 218, 0.3)' : 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
    }

    // Draw main circle with gradient
    const gradient = ctx.createRadialGradient(
      node.x - radius * 0.3, node.y - radius * 0.3, 0,
      node.x, node.y, radius
    );
    gradient.addColorStop(0, lightenColor(colors.fill, 20));
    gradient.addColorStop(1, colors.fill);

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isSelected ? '#FFFFFF' : colors.stroke;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    // Draw label inside node if large enough, otherwise below
    if (showLabels) {
      const label = node.label || node.id;
      const fontSize = Math.max(10, radius / 2);
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Truncate label if too long
      const maxLength = Math.floor(radius / 3);
      const displayLabel = label.length > maxLength ? label.substring(0, maxLength) + '...' : label;

      if (radius > 20) {
        // Label inside node
        ctx.fillStyle = colors.text;
        ctx.fillText(displayLabel, node.x, node.y);
      } else {
        // Label below node
        ctx.fillStyle = '#E0E0E0';
        ctx.font = `${10 / globalScale}px Inter, system-ui, sans-serif`;
        ctx.fillText(label, node.x, node.y + radius + 8);
      }
    }

    // Draw type badge
    if (radius > 15) {
      const typeLabel = node.type.substring(0, 1).toUpperCase();
      ctx.font = `bold ${8}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = colors.stroke;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Small circle badge at top-right
      const badgeX = node.x + radius * 0.7;
      const badgeY = node.y - radius * 0.7;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#1A1A1A';
      ctx.fill();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(typeLabel, badgeX, badgeY);
    }
  }, [getNodeColors, selectedNode, hoveredNode, showLabels]);

  // Custom link rendering with labels
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source;
    const end = link.target;
    
    // Skip if positions are not initialized
    if (!start || !end || 
        typeof start.x !== 'number' || typeof start.y !== 'number' ||
        typeof end.x !== 'number' || typeof end.y !== 'number' ||
        !isFinite(start.x) || !isFinite(start.y) || !isFinite(end.x) || !isFinite(end.y)) {
      return;
    }

    const color = getLinkColor(link);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = (link.value || 1) * 1.5;
    ctx.stroke();

    // Draw arrow
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const nodeRadius = end.val ? Math.sqrt(end.val) * 4 : 16;
    
    const arrowX = end.x - Math.cos(angle) * (nodeRadius + 5);
    const arrowY = end.y - Math.sin(angle) * (nodeRadius + 5);
    const arrowSize = 6;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
      arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
      arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Draw relationship label - smaller text
    if (showLabels && globalScale > 1.5) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      
      // Very small font for relationship labels
      const fontSize = Math.max(4, Math.min(6, 6 / globalScale));
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Background for text
      const text = link.relationship || '';
      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(26, 26, 26, 0.75)';
      ctx.fillRect(midX - textWidth / 2 - 2, midY - fontSize / 2 - 1, textWidth + 4, fontSize + 2);
      
      ctx.fillStyle = '#999999';
      ctx.fillText(text, midX, midY);
    }
  }, [getLinkColor, showLabels]);

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ width, height, backgroundColor: '#1A1A1A' }}
      >
        <p className="text-sm text-gray-400">Loading graph...</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: '#0D0D0D' }}>
      {/* Graph Canvas */}
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="#0D0D0D"
        nodeRelSize={8}
        nodeVal={(node: any) => node.val || 5}
        linkWidth={(link: any) => (link.value || 1) * 1.5}
        linkDirectionalArrowLength={0}
        linkCurvature={0.1}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        onNodeClick={handleNodeClick}
        onNodeHover={(node: any) => setHoveredNode(node)}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        cooldownTime={2000}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.2}
        warmupTicks={100}
      />

      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-gray-800/90 hover:bg-gray-700 rounded flex items-center justify-center text-white text-lg font-bold transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-gray-800/90 hover:bg-gray-700 rounded flex items-center justify-center text-white text-lg font-bold transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleFitToScreen}
          className="w-8 h-8 bg-gray-800/90 hover:bg-gray-700 rounded flex items-center justify-center text-white text-xs transition-colors"
          title="Fit to Screen"
        >
          ⊡
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`w-8 h-8 rounded flex items-center justify-center text-xs transition-colors ${
            showLabels ? 'bg-blue-600 text-white' : 'bg-gray-800/90 text-gray-400 hover:bg-gray-700'
          }`}
          title="Toggle Labels"
        >
          Aa
        </button>
        <button
          onClick={handleReset}
          className="w-8 h-8 bg-gray-800/90 hover:bg-gray-700 rounded flex items-center justify-center text-white text-sm transition-colors"
          title="Reset View"
        >
          ↺
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-gray-900/95 backdrop-blur-sm rounded-lg p-2 text-xs space-y-1">
        {Object.entries(NEO4J_COLORS).filter(([key]) => key !== 'default').slice(0, 5).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border"
              style={{ backgroundColor: colors.fill, borderColor: colors.stroke }}
            />
            <span className="text-gray-300 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="absolute top-3 left-3 bg-gray-900/95 backdrop-blur-sm rounded-lg p-3 max-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium capitalize"
              style={{
                backgroundColor: getNodeColors(selectedNode).fill,
                color: getNodeColors(selectedNode).text,
              }}
            >
              {selectedNode.type}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
          <p className="text-white font-medium text-sm mb-2">{selectedNode.label}</p>
          <div className="text-xs text-gray-400">
            <p>ID: {selectedNode.id}</p>
            {selectedNode.val && <p>Size: {selectedNode.val}</p>}
          </div>
          {/* Connected nodes */}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Connections:</p>
            <div className="text-xs text-gray-400 max-h-20 overflow-y-auto">
              {data.links
                .filter((l: any) => {
                  const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                  const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                  return sourceId === selectedNode.id || targetId === selectedNode.id;
                })
                .slice(0, 5)
                .map((l: any, i: number) => {
                  const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                  const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                  const otherId = sourceId === selectedNode.id ? targetId : sourceId;
                  const otherNode = data.nodes.find(n => n.id === otherId);
                  return (
                    <div key={i} className="truncate">
                      → {l.relationship}: {otherNode?.label || otherId}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Lighten color
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
