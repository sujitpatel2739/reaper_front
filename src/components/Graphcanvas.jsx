import React, { useCallback, useRef } from 'react';
import ReactFlow, { Background, Controls, MiniMap, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';

import Component     from './Components';
import NodeComponent from './Nodecomponents';
import { useGraphStore } from '../store/Usegraphstore';

const componentTypes = {
  component:     Component,
  nodeComponent: NodeComponent,
};

export default function GraphCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    setSelected, setActiveView, activeView, runMode,
  } = useGraphStore();

  const locked     = runMode !== 'idle';
  const dragOffset = useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    window.__setDragOffset = (x, y) => { dragOffset.current = { x, y }; };
    return () => { delete window.__setDragOffset; };
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    if (locked) return;
    const type   = e.dataTransfer.getData('componentType');
    const kind   = e.dataTransfer.getData('componentKind');
    const bounds = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - bounds.left - dragOffset.current.x,
      y: e.clientY - bounds.top  - dragOffset.current.y,
    };
    const store = useGraphStore.getState();
    if (kind === 'layer') store.addLayer(type, position);
    if (kind === 'node')  store.addNode(type, position);
  }, [locked]);

  const onDragOver = useCallback(e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // In metric views (overview, layer), clicking a node selects it AND
  // navigates to the Layer Detail view so the user can inspect it.
  const onNodeClick = useCallback((e, node) => {
    setSelected(node.id);
    if (activeView === 'overview') {
      setActiveView('layer');
    }
  }, [activeView, setSelected, setActiveView]);

  const onPaneClick = useCallback(() => setSelected(null), [setSelected]);

  const isValidConnection = useCallback(conn => {
    const existing = useGraphStore.getState().edges;
    return !existing.some(
      e => e.target === conn.target && e.targetHandle === conn.targetHandle
    );
  }, []);

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={componentTypes}
        onNodesChange={locked ? undefined : onNodesChange}
        onEdgesChange={locked ? undefined : onEdgesChange}
        onConnect={locked ? undefined : conn => { if (isValidConnection(conn)) onConnect(conn); }}
        onNodeClick={onNodeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={locked ? null : 'Backspace'}
        nodesDraggable={!locked}
        nodesConnectable={!locked}
        elementsSelectable={!locked}
        style={{ background: 'var(--bg-void)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="var(--border)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => {
            if (n.data?.type === 'inputlayer') return 'var(--accent)';
            const h = n.data?.health;
            if (h === 'crit') return 'var(--red)';
            if (h === 'warn') return 'var(--amber)';
            const s = n.data?.status;
            if (s === 'done')    return 'var(--accent-dim)';
            if (s === 'error')   return 'var(--red)';
            if (s === 'running') return 'var(--accent)';
            if (s === 'pending') return 'var(--amber)';
            if (n.data?.kind === 'node') return 'var(--blue-dim)';
            return 'var(--border-bright)';
          }}
          maskColor="rgba(3,4,10,0.78)"
          style={{ bottom: 12, right: 12 }}
        />
      </ReactFlow>

      {locked && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(3,4,10,0.12)', pointerEvents: 'none', zIndex: 5,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 14,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
            background: 'var(--bg-panel)', padding: '3px 10px', borderRadius: 3,
            border: '1px solid var(--border-mid)', letterSpacing: '0.06em',
          }}>
            CANVAS LOCKED — stop run to edit
          </span>
        </div>
      )}
    </div>
  );
}