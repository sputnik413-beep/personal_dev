import React, { useState } from 'react';
import { AwsArchitectureDiagram, AwsDiagramNode } from '../types';
import {
  Server,
  Zap,
  Layers,
  HardDrive,
  Globe,
  Search,
  Database,
  Shield,
  Network,
  Lock,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  CheckCircle2,
  Info
} from 'lucide-react';

interface Props {
  diagram: AwsArchitectureDiagram;
  height?: number;
  interactive?: boolean;
}

export const VisualDiagram: React.FC<Props> = ({ diagram, height = 400, interactive = true }) => {
  const [selectedNode, setSelectedNode] = useState<AwsDiagramNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  if (!diagram || !diagram.nodes || diagram.nodes.length === 0) {
    return null;
  }

  // Calculate layout coordinates dynamically by tier
  // Tier 0: Client/Edge/Internet
  // Tier 1: Ingress/Router/IGW/EventBus/Queue
  // Tier 2: Compute/Lambda/StepFunctions/NAT
  // Tier 3: Internal Queue/Storage/Private Subnet
  // Tier 4: Backend/DB/S3/OpenSearch/FSx
  const tiers: Record<number, AwsDiagramNode[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  diagram.nodes.forEach(node => {
    const tier = node.tier !== undefined ? node.tier : 2;
    if (!tiers[tier]) tiers[tier] = [];
    tiers[tier].push(node);
  });

  const activeTiers = Object.keys(tiers)
    .map(Number)
    .filter(t => tiers[t].length > 0)
    .sort((a, b) => a - b);

  const totalCols = Math.max(activeTiers.length, 1);
  const colWidth = 840 / (totalCols + 0.2);

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

  const getNodeIcon = (type: AwsDiagramNode['type']) => {
    switch (type) {
      case 'lambda': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'stepfunctions': return <Layers className="w-4 h-4 text-orange-400" />;
      case 'eventbridge': return <Network className="w-4 h-4 text-purple-400" />;
      case 's3': return <HardDrive className="w-4 h-4 text-emerald-400" />;
      case 'cloudfront': return <Globe className="w-4 h-4 text-sky-400" />;
      case 'opensearch': return <Search className="w-4 h-4 text-blue-400" />;
      case 'fsx_ontap': return <Database className="w-4 h-4 text-cyan-400" />;
      case 'sqs': return <Layers className="w-4 h-4 text-rose-400" />;
      case 'vpc': return <Shield className="w-4 h-4 text-indigo-400" />;
      case 'nat_gw':
      case 'igw': return <Network className="w-4 h-4 text-slate-300" />;
      case 'iam_role': return <Lock className="w-4 h-4 text-yellow-400" />;
      default: return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  const getNodeBadgeClass = (type: AwsDiagramNode['type']) => {
    switch (type) {
      case 'lambda': return 'bg-amber-950/80 border-amber-600/50 text-amber-200';
      case 'stepfunctions': return 'bg-orange-950/80 border-orange-600/50 text-orange-200';
      case 'eventbridge': return 'bg-purple-950/80 border-purple-600/50 text-purple-200';
      case 's3': return 'bg-emerald-950/80 border-emerald-600/50 text-emerald-200';
      case 'cloudfront': return 'bg-sky-950/80 border-sky-600/50 text-sky-200';
      case 'opensearch': return 'bg-blue-950/80 border-blue-600/50 text-blue-200';
      case 'fsx_ontap': return 'bg-cyan-950/80 border-cyan-600/50 text-cyan-200';
      case 'sqs': return 'bg-rose-950/80 border-rose-600/50 text-rose-200';
      case 'vpc': return 'bg-indigo-950/80 border-indigo-600/50 text-indigo-200';
      case 'iam_role': return 'bg-yellow-950/80 border-yellow-600/50 text-yellow-200';
      default: return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  const activeStep = activeStepIndex !== null && diagram.packetFlowSteps
    ? diagram.packetFlowSteps[activeStepIndex]
    : null;

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-950/95 overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/70 backdrop-blur gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">AWS Architecture Flow</span>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-sm">{diagram.title}</span>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => { setZoomLevel(1); setActiveStepIndex(null); }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition"
            title="リセット"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Packet Flow Stepper Header (if available) */}
      {diagram.packetFlowSteps && diagram.packetFlowSteps.length > 0 && (
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
            <Play className="w-3 h-3 text-amber-400" />
            パケット通信フロー:
          </span>
          {diagram.packetFlowSteps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStepIndex(activeStepIndex === idx ? null : idx)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
                activeStepIndex === idx
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="font-mono text-[10px] w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center">
                {step.step}
              </span>
              <span>{step.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active Step Explanation Callout */}
      {activeStep && (
        <div className="px-4 py-2.5 bg-amber-950/30 border-b border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-200 animate-in fade-in duration-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold mr-2">【Step {activeStep.step}: {activeStep.title}】</span>
            <span>{activeStep.description}</span>
          </div>
          <button
            onClick={() => setActiveStepIndex(null)}
            className="text-[10px] text-amber-400/80 hover:text-amber-200 underline ml-2 shrink-0"
          >
            解除
          </button>
        </div>
      )}

      {/* SVG Canvas */}
      <div
        className="w-full overflow-x-auto overflow-y-hidden p-3 select-none relative"
        style={{ minHeight: `${height}px` }}
      >
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
          className="min-w-[860px] flex justify-center"
        >
          <svg
            viewBox="0 0 880 390"
            className="w-[880px] h-[390px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="aws-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#1e293b" opacity="0.6" />
              </pattern>
              <marker
                id="arrow-aws"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
              <marker
                id="arrow-aws-active"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
              </marker>
            </defs>

            <rect width="880" height="390" fill="url(#aws-grid)" />

            {/* Links */}
            {diagram.links.map((link, idx) => {
              const fromPos = nodePositions[link.from];
              const toPos = nodePositions[link.to];
              if (!fromPos || !toPos) return null;

              const dx = toPos.x - fromPos.x;
              const midX = fromPos.x + dx / 2;
              const pathD = `M ${fromPos.x} ${fromPos.y} C ${midX} ${fromPos.y}, ${midX} ${toPos.y}, ${toPos.x} ${toPos.y}`;

              const isStepActive = activeStep && (
                (activeStep.from === link.from && activeStep.to === link.to) ||
                (activeStep.from === link.to && activeStep.to === link.from)
              );

              const isSelected = selectedNode && (selectedNode.id === link.from || selectedNode.id === link.to);
              const isHighlighted = isStepActive || isSelected;

              return (
                <g key={`aws-link-${idx}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? '#f59e0b' : '#334155'}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={link.linkType === 'async' || link.linkType === 'event' ? '5,5' : undefined}
                    markerEnd={isHighlighted ? 'url(#arrow-aws-active)' : 'url(#arrow-aws)'}
                    className="transition-colors duration-200"
                  />
                  {link.label && (
                    <text
                      x={(fromPos.x + toPos.x) / 2}
                      y={(fromPos.y + toPos.y) / 2 - 6}
                      fill={isHighlighted ? '#fde68a' : '#94a3b8'}
                      fontSize="9.5"
                      fontFamily="ui-monospace, monospace"
                      textAnchor="middle"
                      className="font-medium"
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
              const isStepActive = activeStep && (activeStep.from === node.id || activeStep.to === node.id);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x - 75}, ${pos.y - 32})`}
                  onClick={() => interactive && setSelectedNode(node)}
                  className="cursor-pointer group"
                >
                  <rect
                    width="150"
                    height="64"
                    rx="8"
                    ry="8"
                    fill={isSelected ? '#1e293b' : isStepActive ? '#1e293b' : '#0f172a'}
                    stroke={isSelected ? '#f59e0b' : isStepActive ? '#f59e0b' : '#334155'}
                    strokeWidth={isSelected || isStepActive ? 2 : 1.2}
                    className="transition-all duration-150 group-hover:stroke-amber-400 shadow-md"
                  />
                  {/* Title */}
                  <text
                    x="12"
                    y="24"
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {node.label.split('\n')[0].substring(0, 18)}
                  </text>
                  {/* Subtitle / Spec */}
                  <text
                    x="12"
                    y="40"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="sans-serif"
                  >
                    {node.label.split('\n')[1] ? node.label.split('\n')[1].substring(0, 22) : (node.subText || node.type)}
                  </text>
                  {/* VPC Placement Indicator */}
                  {node.vpcPlacement && (
                    <text
                      x="12"
                      y="53"
                      fill={node.vpcPlacement.includes('private') ? '#38bdf8' : '#34d399'}
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {node.vpcPlacement === 'inside_vpc_private' ? '[Private Subnet]' : '[Public Subnet]'}
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border ${getNodeBadgeClass(selectedNode.type)}`}>
              {getNodeIcon(selectedNode.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">{selectedNode.label.split('\n')[0]}</span>
                <span className="text-[10px] px-2 py-0.5 rounded uppercase font-mono bg-slate-800 text-amber-300 border border-slate-700">
                  {selectedNode.type}
                </span>
                {selectedNode.vpcPlacement && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    {selectedNode.vpcPlacement}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedNode.subText || selectedNode.label.split('\n').slice(1).join(' ')}
              </p>
              {selectedNode.securityGroup && (
                <div className="mt-1.5 flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <span>SG: {selectedNode.securityGroup}</span>
                  {selectedNode.port && <span>(Port: {selectedNode.port})</span>}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};
