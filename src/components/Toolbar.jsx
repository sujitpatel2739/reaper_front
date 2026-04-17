import React, { useRef } from 'react';
import { useGraphStore } from '../store/Usegraphstore';
import { useFullRunSession } from '../hooks/Usewebsocket';
import { buildNetwork, resetNetwork, importModel, saveNetwork, loadNetwork } from '../api/api';

// ---------------------------------------------------------------------------
// Draggable palette pill
// ---------------------------------------------------------------------------

function Pill({ label, type, kind, accent = 'var(--text-secondary)' }) {
  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('componentType', type);
        e.dataTransfer.setData('componentKind', kind);
        const rect = e.currentTarget.getBoundingClientRect();
        if (window.__setDragOffset)
          window.__setDragOffset(e.clientX - rect.left, e.clientY - rect.top);
      }}
      style={{
        padding: '3px 11px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-mid)',
        background: 'var(--bg-surface)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10, color: accent,
        cursor: 'grab', userSelect: 'none', whiteSpace: 'nowrap',
        transition: 'all 0.12s', letterSpacing: '0.02em',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
    >
      {label}
    </div>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 22, flexShrink: 0, background: 'linear-gradient(to bottom, transparent, var(--border-mid), transparent)', margin: '0 2px' }} />;
}

function Btn({ children, onClick, accent = 'var(--text-secondary)', title, disabled, active }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      style={{
        padding: '4px 12px', borderRadius: 'var(--radius-sm)',
        border: `1px solid ${active ? accent : 'var(--border-mid)'}`,
        background: active ? `${accent}18` : 'var(--bg-surface)',
        color: disabled ? 'var(--text-dim)' : (active ? accent : 'var(--text-secondary)'),
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.03em',
        cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.12s', opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; e.currentTarget.style.background = `${accent}10`; } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = active ? accent : 'var(--border-mid)'; e.currentTarget.style.color = active ? accent : 'var(--text-secondary)'; e.currentTarget.style.background = active ? `${accent}18` : 'var(--bg-surface)'; } }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Run progress bar (shown during active run)
// ---------------------------------------------------------------------------

function RunProgressBar({ progress }) {
  const { epoch, batch, n_epochs, n_batches } = progress;
  const epochFrac = n_epochs > 0 ? epoch / n_epochs : 0;
  const batchFrac = n_batches > 0 ? (epoch * n_batches + batch) / (n_epochs * n_batches) : epochFrac;
  const pct = Math.min(100, Math.round(batchFrac * 100));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{
        width: 100, height: 4, background: 'var(--border-mid)',
        borderRadius: 2, overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'var(--accent)',
          boxShadow: '0 0 6px var(--accent-glow)',
          transition: 'width 0.3s ease',
          borderRadius: 2,
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        E{epoch}/{n_epochs} · {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export default function Toolbar() {
  const importRef = useRef();
  const loadRef   = useRef();

  const {
    runMode, setRunMode,
    nodes, edges,
    runConfig, setRunConfig,
    dataset, datasetMode,
    layerTypes, nodeTypes,
    setComponentWarnings, setAllStatuses,
    loadGraph, clearGraph,
    layoutDirection, toggleLayout,
    buildId, buildValid, setBuild, invalidateBuild,
    runProgress,
  } = useGraphStore();

  const { start: startRun, stop: stopRun } = useFullRunSession();

  const locked   = runMode !== 'idle';
  const hasNodes = nodes.length > 0;
  const isBuilt  = !!buildId;
  const isRunning = runMode === 'running' || runMode === 'connecting';

  // ── Build ────────────────────────────────────────────────────────────────
  const handleBuild = async () => {
    if (!hasNodes) return;
    await resetNetwork();
    invalidateBuild();
    setAllStatuses('idle');

    const result = await buildNetwork({ nodes, edges }, runConfig);
    if (result.detail) { alert(`Build failed:\n${result.detail}`); return; }

    (result.warnings ?? []).forEach(w => setComponentWarnings(w.node_id, [w.message]));
    setBuild(result.build_id, result.valid);
    if (result.valid) nodes.forEach(n => setComponentWarnings(n.id, []));
  };

  // ── Run ──────────────────────────────────────────────────────────────────
  const handleRun = () => {
    if (!isBuilt) { alert('Build the network first.'); return; }
    if (!datasetMode || dataset.length === 0) { alert('Configure at least one dataset input (Dataset drawer).'); return; }
    startRun(buildId, runConfig, dataset);
  };

  // ── Import ───────────────────────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const graph = await importModel(file);
      if (graph?.detail) { alert(`Import failed:\n${graph.detail}`); return; }
      if (!graph?.nodes) { alert('Import failed: unexpected response.'); return; }
      loadGraph(graph); invalidateBuild();
    } catch (err) { alert(`Import failed: ${err.message}`); }
    e.target.value = '';
  };

  const handleLoad = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { loadGraph(await loadNetwork(file)); invalidateBuild(); }
    catch { alert('Invalid network file.'); }
    e.target.value = '';
  };

  const handleClear = async () => {
    if (locked) return;
    await resetNetwork();
    clearGraph();
    invalidateBuild();
  };

  const handleToggleLayout = () => {
    toggleLayout();
    useGraphStore.setState(s => ({
      nodes: s.nodes.map(n => ({ ...n, position: { x: n.position.y, y: n.position.x } })),
    }));
  };

  return (
    <div style={{
      height: 'var(--toolbar-h)',
      display: 'flex', alignItems: 'center',
      gap: 5, padding: '0 16px',
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border-mid)',
      flexShrink: 0, overflowX: 'auto',
      boxShadow: '0 1px 0 var(--border)',
    }}>

      {/* Logo */}
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
        color: 'var(--accent)', letterSpacing: '0.18em', whiteSpace: 'nowrap',
        marginRight: 10, flexShrink: 0, textShadow: '0 0 20px var(--accent-glow)',
      }}>
        NSO
      </span>

      <Sep />

      {/* Layer palette */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        layers
      </span>
      {Object.entries(layerTypes).map(([type, def]) => (
        <Pill key={type} label={def.label ?? type} type={type} kind="layer"
          accent={type === 'inputlayer' ? 'var(--accent)' : 'var(--accent-dim)'} />
      ))}

      <Sep />

      {/* Node palette */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        nodes
      </span>
      {Object.entries(nodeTypes).map(([type, def]) => (
        <Pill key={type} label={def.label ?? type} type={type} kind="node" accent="var(--blue-dim)" />
      ))}

      <Sep />

      {/* Build */}
      <Btn onClick={handleBuild} disabled={locked || !hasNodes} accent="var(--amber)" title="Validate and compile">
        ⚙ Build
      </Btn>

      {/* Build badge */}
      {isBuilt && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 8,
          color: buildValid ? 'var(--accent-dim)' : 'var(--amber)',
          padding: '2px 7px',
          background: buildValid ? 'var(--accent-faint)' : 'var(--amber-glow)',
          border: `1px solid ${buildValid ? 'var(--accent-faint)' : 'rgba(240,165,0,0.2)'}`,
          borderRadius: 'var(--radius-xs)', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {buildValid ? '✓ ready' : '⚠ warnings'}
        </span>
      )}

      {/* Epochs input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          epochs
        </span>
        <input
          type="number" min={1} max={1000}
          value={runConfig.n_epochs ?? 1}
          disabled={locked}
          onChange={e => setRunConfig({ n_epochs: Math.max(1, parseInt(e.target.value) || 1) })}
          style={{ width: 46, fontSize: 10, padding: '3px 6px', textAlign: 'center' }}
        />
      </div>

      {/* Run */}
      <Btn onClick={handleRun} disabled={locked || !isBuilt} accent="var(--accent)"
        title={isBuilt ? 'Run full diagnostic pass' : 'Build first'}>
        ▶ Run
      </Btn>

      {/* Progress bar — visible during run */}
      {isRunning && <RunProgressBar progress={runProgress} />}

      {/* Stop */}
      {locked && runMode !== 'stepping' && (
        <Btn onClick={() => { stopRun(); }} accent="var(--red)">
          ■ Stop
        </Btn>
      )}
      {locked && runMode === 'stepping' && (
        <Btn onClick={() => { setRunMode('idle'); setAllStatuses('idle'); }} accent="var(--red)">
          ■ Stop
        </Btn>
      )}

      <Sep />

      {/* Layout */}
      <Btn onClick={handleToggleLayout} title="Rotate layout 90°">
        {layoutDirection === 'LR' ? '↕' : '↔'}
      </Btn>

      <Sep />

      {/* File ops */}
      <Btn onClick={() => !locked && saveNetwork({ nodes, edges, run_config: runConfig })} disabled={locked}>↓ Save</Btn>
      <Btn onClick={() => !locked && loadRef.current.click()} disabled={locked}>↑ Load</Btn>
      <Btn onClick={() => !locked && importRef.current.click()} disabled={locked} accent="var(--amber)">⬆ Import</Btn>
      <Btn onClick={handleClear} disabled={locked} accent="var(--red)">✕</Btn>

      <input ref={importRef} type="file" accept=".pt,.pth" style={{ display: 'none' }} onChange={handleImport} />
      <input ref={loadRef}   type="file" accept=".json"   style={{ display: 'none' }} onChange={handleLoad} />
    </div>
  );
}