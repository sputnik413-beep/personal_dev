import React, { useState } from 'react';
import { ArchitectureDiagramData, DiagramNode } from '../types';
import { Server, Globe, Database, Network, Shield, HardDrive, AlertCircle, Info, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Props {
  diagram: ArchitectureDiagramData;
  height?: number;
  interactive?: boolean;
}

export const ArchitectureDiagram: React.FC<Props> = ({ diagram, height = 380, interactive = true }) => {
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!diagram || !diagram.nodes || diagram.nodes.length === 0) {
    return null;
  }

  // Calculate layout coordinates dynamically
  // We arrange nodes in logical columns/tiers:
  // Col 0: external
  // Col 1: elb / router / vpc_router (edge)
  // Col 2: servers / notices
  // Col 3: switch
  // Col 4: db / storage
  const getNodeCategoryTier = (node: DiagramNode): number => {
    switch (node.type) {
      case 'external': return 0;
      case 'elb':
      case 'router':
      case 'vpc_router': return 1;
      case 'server':
      case 'notice': return 2;
      case 'switch': return 3;
      case 'db':
      case 'storage': return 4;
      default: return 2;
    }
  };

  // Group by tier
  const tiers: Record<number, DiagramNode[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  diagram.nodes.forEach(node => {
    const tier = getNodeCategoryTier(node);
    tiers[tier].push(node);
  });

  const activeTiers = Object.keys(tiers)
    .map(Number)
    .filter(t => tiers[t].length > 0)
    .sort((a, b) => a - b);

  const totalCols = Math.max(activeTiers.length, 1);
  const colWidth = 840 / (totalCols + 0.2);

  // Map node positions
  const nodePositions: Record<string, { x: number; y: number }> = {};
  activeTiers.forEach((tierIndex, colIdx) => {
    const colNodes = tiers[tierIndex];
    const colX = 50 + colIdx * colWidth + colWidth / 2;
    const totalInCol = colNodes.length;
    const spacing = 320 / (totalInCol + 1);

    colNodes.forEach((node, rowIdx) => {
      const colY = 40 + (rowIdx + 1) * spacing;
      nodePositions[node.id] = { x: colX, y: colY };
    });
  });

  const getNodeIcon = (type: DiagramNode['type']) => {
    switch (type) {
      case 'external': return <Globe className="w-4 h-4 text-sky-400" />;
      case 'elb': return <Network className="w-4 h-4 text-emerald-400" />;
      case 'vpc_router': return <Shield className="w-4 h-4 text-indigo-400" />;
      case 'server': return <Server className="w-4 h-4 text-rose-400" />;
      case 'switch': return <Network className="w-4 h-4 text-amber-400" />;
      case 'db': return <Database className="w-4 h-4 text-purple-400" />;
      case 'storage': return <HardDrive className="w-4 h-4 text-blue-400" />;
      case 'notice': return <AlertCircle className="w-4 h-4 text-orange-400" />;
      default: return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  const getNodeBadgeClass = (type: DiagramNode['type']) => {
    switch (type) {
      case 'external': return 'bg-sky-950/80 border-sky-600/40 text-sky-200';
      case 'elb': return 'bg-emerald-950/80 border-emerald-600/40 text-emerald-200';
      case 'vpc_router': return 'bg-indigo-950/80 border-indigo-600/40 text-indigo-200';
      case 'server': return 'bg-rose-950/80 border-rose-600/40 text-rose-200';
      case 'switch': return 'bg-amber-950/80 border-amber-600/40 text-amber-200';
      case 'db': return 'bg-purple-950/80 border-purple-600/40 text-purple-200';
      case 'storage': return 'bg-blue-950/80 border-blue-600/40 text-blue-200';
      case 'notice': return 'bg-orange-950/80 border-orange-600/40 text-orange-200';
      default: return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">アーキテクチャ構築イメージ</span>
          <span className="text-xs font-medium text-slate-200 truncate max-w-sm">{diagram.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 1.4))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition"
            title="拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.7))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition"
            title="縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition"
            title="リセット"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        className="w-full overflow-x-auto overflow-y-hidden p-2 select-none relative"
        style={{ minHeight: `${height}px` }}
      >
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
          className="min-w-[840px] flex justify-center"
        >
          <svg
            viewBox="0 0 860 380"
            className="w-[860px] h-[380px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Grid Pattern */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#1e293b" opacity="0.6" />
              </pattern>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#f43f5e" />
              </marker>
            </defs>

            <rect width="860" height="380" fill="url(#grid)" />

            {/* Links between nodes */}
            {diagram.links && diagram.links.map((link, idx) => {
              const fromPos = nodePositions[link.from];
              const toPos = nodePositions[link.to];
              if (!fromPos || !toPos) return null;

              // Smooth curved bezier line
              const dx = toPos.x - fromPos.x;
              const midX = fromPos.x + dx / 2;
              const pathD = `M ${fromPos.x} ${fromPos.y} C ${midX} ${fromPos.y}, ${midX} ${toPos.y}, ${toPos.x} ${toPos.y}`;

              const isHighlighted = selectedNode && (selectedNode.id === link.from || selectedNode.id === link.to);

              return (
                <g key={`link-${idx}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? '#f43f5e' : '#334155'}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={link.label?.includes('VPN') || link.label?.includes('API') ? '4,4' : undefined}
                    markerEnd={isHighlighted ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    className="transition-colors duration-200"
                  />
                  {link.label && (
                    <text
                      x={(fromPos.x + toPos.x) / 2}
                      y={(fromPos.y + toPos.y) / 2 - 6}
                      fill={isHighlighted ? '#fecdd3' : '#94a3b8'}
                      fontSize="9.5"
                      fontFamily="ui-monospace, monospace"
                      textAnchor="middle"
                      className="bg-slate-950 px-1 font-medium"
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {diagram.nodes.map(node => {
              const pos = nodePositions[node.id];
              if (!pos) return null;
              const isSelected = selectedNode?.id === node.id;
              const badgeClass = getNodeBadgeClass(node.type);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x - 70}, ${pos.y - 30})`}
                  onClick={() => interactive && setSelectedNode(node)}
                  className="cursor-pointer group"
                >
                  <rect
                    width="140"
                    height="60"
                    rx="8"
                    ry="8"
                    fill={isSelected ? '#1e293b' : '#0f172a'}
                    stroke={isSelected ? '#f43f5e' : '#334155'}
                    strokeWidth={isSelected ? 2 : 1.2}
                    className="transition-all duration-150 group-hover:stroke-rose-400 shadow-md"
                  />
                  {/* Top node label */}
                  <text
                    x="12"
                    y="22"
                    fill="#f1f5f9"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="sans-serif"
                  >
                    {node.label.split('\n')[0].substring(0, 16)}
                  </text>
                  {/* Subtitle / Spec */}
                  <text
                    x="12"
                    y="38"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="sans-serif"
                  >
                    {node.label.split('\n')[1] ? node.label.split('\n')[1].substring(0, 20) : (node.ip || node.type)}
                  </text>
                  {/* Zone / IP tag */}
                  {node.zone && (
                    <text
                      x="12"
                      y="50"
                      fill="#38bdf8"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {node.zone}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg border ${getNodeBadgeClass(selectedNode.type)}`}>
              {getNodeIcon(selectedNode.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-100">{selectedNode.label.split('\n')[0]}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {selectedNode.type}
                </span>
                {selectedNode.zone && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    {selectedNode.zone}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedNode.label.split('\n').slice(1).join(' ') || 'さくらクラウド基盤コンポーネント'}
              </p>
              {selectedNode.ip && (
                <div className="mt-1 flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <span>IP/アドレス: {selectedNode.ip}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Diagram Notes Footer */}
      {diagram.notes && diagram.notes.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-900/40 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          {diagram.notes.map((note, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
