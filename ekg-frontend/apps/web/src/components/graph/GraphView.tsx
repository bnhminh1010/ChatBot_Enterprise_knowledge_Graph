'use client';

import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useTheme } from 'next-themes';

export interface GraphNode {
  id: string;
  label: string;
  type: string; // 'employee', 'department', 'skill', 'project', etc.
  val?: number; // Node size
}

export interface GraphLink {
  source: string;
  target: string;
  relationship: string;
  value?: number; // Link thickness
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

export function GraphView({ data, width = 600, height = 400, onNodeClick }: GraphViewProps) {
  const { theme } = useTheme();
  const fgRef = useRef<any>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center bg-muted/30 rounded-lg border border-border"
        style={{ width, height }}
      >
        <p className="text-sm text-muted-foreground">Loading graph...</p>
      </div>
    );
  }

  // Get colors based on theme
  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#1a1a1a' : '#ffffff';
  const nodeColor = (node: GraphNode) => {
    const colors = {
      employee: '#3b82f6', // blue
      department: '#8b5cf6', // purple
      skill: '#10b981', // green
      project: '#f59e0b', // amber
      default: '#6b7280', // gray
    };
    return colors[node.type as keyof typeof colors] || colors.default;
  };

  const linkColor = isDark ? '#4b5563' : '#d1d5db';
  const textColor = isDark ? '#e5e7eb' : '#374151';

  return (
    <div className="rounded-lg border border-border overflow-hidden shadow-sm">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        backgroundColor={backgroundColor}
        nodeLabel={(node: any) => `${node.label} (${node.type})`}
        nodeColor={(node: any) => nodeColor(node)}
        nodeVal={(node: any) => node.val || 5}
        nodeRelSize={6}
        linkLabel={(link: any) => link.relationship}
        linkColor={() => linkColor}
        linkWidth={(link: any) => link.value || 1}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.15}
        onNodeClick={(node: any) => onNodeClick?.(node)}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = textColor;
          ctx.fillText(label, node.x, node.y + 12);
        }}
        cooldownTime={3000}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
      
      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-foreground">Employee</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-foreground">Department</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-foreground">Skill</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-foreground">Project</span>
        </div>
      </div>
    </div>
  );
}
