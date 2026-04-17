<<<<<<< HEAD
<<<<<<< HEAD
/**
 * Overviewpanel.jsx
 *
 * Cross-layer metrics dashboard. Shows all layers at a glance for one epoch.
 *
 * Layout:
 *   - Epoch selector (top)
 *   - Activation Mean across layers (bar chart)
 *   - Activation Std across layers (bar chart)
 *   - Grad-in Norm across layers (bar chart, amber)
 *   - Output shape flow (compact chain)
 *   - Anomaly summary table
 *
 * Clicking a bar selects that layer on the canvas and switches to Layer Detail view.
 */

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
import { useGraphStore } from '../store/Usegraphstore';
import { Section } from './Metricspanel';

// ---------------------------------------------------------------------------
// Epoch selector strip
// ---------------------------------------------------------------------------

function EpochSelector() {
  const { runMetrics, selectedEpoch, setSelectedEpoch } = useGraphStore();
  const n = runMetrics.n_epochs;
  if (n === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', marginRight: 4, whiteSpace: 'nowrap' }}>
        EPOCH
      </span>
      {Array.from({ length: n }, (_, i) => (
        <button
          key={i}
          onClick={() => setSelectedEpoch(i)}
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            border: `1px solid ${selectedEpoch === i ? 'var(--accent-dim)' : 'var(--border-mid)'}`,
            background: selectedEpoch === i ? 'var(--accent-faint)' : 'transparent',
            color: selectedEpoch === i ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            cursor: 'pointer', transition: 'all 0.1s',
          }}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom bar chart tooltip
// ---------------------------------------------------------------------------

function MetricTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const { nodeId, nodeType, value, std } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)',
      borderRadius: 'var(--radius-sm)', padding: '6px 10px',
      fontFamily: 'var(--font-mono)', fontSize: 9,
    }}>
      <div style={{ color: 'var(--text-primary)', marginBottom: 2 }}>{nodeType} — {nodeId}</div>
      <div style={{ color: 'var(--accent)' }}>mean: {value?.toFixed(5)}</div>
      {std !== undefined && <div style={{ color: 'var(--text-muted)' }}>±{std?.toFixed(5)}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cross-layer bar chart
// ---------------------------------------------------------------------------

function LayerBarChart({ title, metricKey, stdKey, color, nodes, epochData }) {
  const { setSelected, setActiveView } = useGraphStore();

  const data = nodes
    .filter(n => epochData?.[n.id]?.[metricKey])
    .map(n => {
      const stat = epochData[n.id][metricKey];
      return {
        nodeId:   n.id,
        nodeType: n.data.type,
        value:    stat.mean,
        std:      stdKey ? epochData[n.id]?.[stdKey]?.mean : stat.std,
        health:   n.data.health,
      };
    });

  if (data.length === 0) return null;

  const handleClick = (entry) => {
    if (entry?.activePayload?.[0]) {
      setSelected(entry.activePayload[0].payload.nodeId);
      setActiveView('layer');
    }
  };

  const getBarColor = (health) => {
    if (health === 'crit') return 'var(--red)';
    if (health === 'warn') return 'var(--amber)';
    return color;
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6,
      }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} onClick={handleClick} style={{ cursor: 'pointer' }}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="nodeId" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<MetricTooltip />} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.health)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shape flow chain
// ---------------------------------------------------------------------------

function ShapeFlow({ nodes, epochData }) {
  const layerNodes = nodes.filter(n => n.data.kind === 'layer' && epochData?.[n.id]?.output_shape);
  if (layerNodes.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        Output Shape Flow
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {layerNodes.map((n, i) => {
          const shape = epochData[n.id].output_shape;
          return (
            <React.Fragment key={n.id}>
              <div style={{
                padding: '2px 7px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-xs)',
                fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--accent-dim)',
                whiteSpace: 'nowrap',
              }}>
                {shape.join('×')}
              </div>
              {i < layerNodes.length - 1 && (
                <span style={{ color: 'var(--border-bright)', fontSize: 9 }}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anomaly summary table
// ---------------------------------------------------------------------------

const SEVERITY_COLOR = { critical: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)' };

function AnomalySummary({ nodes, anomalyData }) {
  if (!anomalyData || Object.keys(anomalyData).length === 0) return null;

  // Flatten: collect all (nodeId, anomaly) pairs
  const rows = [];
  nodes.forEach(n => {
    (anomalyData[n.id] ?? []).forEach(a => {
      rows.push({ nodeId: n.id, nodeType: n.data.type, ...a });
    });
  });

  if (rows.length === 0) return null;

  // Sort: critical first
  rows.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--red)', marginBottom: 8,
        borderBottom: '1px solid var(--red)22', paddingBottom: 4,
      }}>
        Anomalies — Epoch Summary
      </div>
      {rows.map((row, i) => {
        const c = SEVERITY_COLOR[row.severity] ?? 'var(--text-muted)';
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 8px', marginBottom: 3,
            background: `${c}08`, border: `1px solid ${c}30`,
            borderRadius: 'var(--radius-xs)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
                {row.nodeType} {row.nodeId}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: c }}>
                {row.kind.replace(/_/g, ' ')}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)', flexShrink: 0 }}>
              {((row.frequency ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function OverviewPanel() {
  const { nodes, runMetrics, selectedEpoch } = useGraphStore();
  const [isolatedMetric, setIsolatedMetric] = useState(null);

  const epochData    = runMetrics.epochs[selectedEpoch] ?? {};
  const anomalyData  = runMetrics.anomalies[selectedEpoch] ?? {};
  const hasData      = Object.keys(epochData).length > 0;

  const METRICS = [
    { key: 'activation_mean', stdKey: null,          title: 'Output Activation Mean',  color: 'var(--metric-activation)' },
    { key: 'activation_std',  stdKey: null,          title: 'Output Activation Std',   color: 'var(--metric-activation)' },
    { key: 'grad_in_norm',    stdKey: 'grad_in_std', title: 'Gradient Input Norm',     color: 'var(--metric-gradient)'   },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 0', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-primary)', marginBottom: 10,
        }}>
          Overview
        </div>
        <EpochSelector />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {!hasData ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '60%', fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.8,
          }}>
            Run the network to see<br />cross-layer metrics.
          </div>
        ) : (
          <>
            {/* Metric filter toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setIsolatedMetric(isolatedMetric === m.key ? null : m.key)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: `1px solid ${(!isolatedMetric || isolatedMetric === m.key) ? m.color : 'var(--border-mid)'}`,
                    background: (!isolatedMetric || isolatedMetric === m.key) ? `${m.color}10` : 'transparent',
                    color: (!isolatedMetric || isolatedMetric === m.key) ? m.color : 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)', fontSize: 8,
                    cursor: 'pointer', transition: 'all 0.1s',
                  }}
                >
                  {m.title}
                </button>
              ))}
            </div>

            {/* Bar charts */}
            {METRICS
              .filter(m => !isolatedMetric || isolatedMetric === m.key)
              .map(m => (
                <LayerBarChart
                  key={m.key}
                  title={m.title}
                  metricKey={m.key}
                  stdKey={m.stdKey}
                  color={m.color}
                  nodes={nodes}
                  epochData={epochData}
                />
              ))
            }

            {/* Shape flow */}
            <ShapeFlow nodes={nodes} epochData={epochData} />

            {/* Anomaly summary */}
            <AnomalySummary nodes={nodes} anomalyData={anomalyData} />
          </>
        )}
      </div>
    </div>
  );
=======
/**
 * Overviewpanel.jsx
 *
 * Cross-layer metrics dashboard. Shows all layers at a glance for one epoch.
 *
 * Layout:
 *   - Epoch selector (top)
 *   - Activation Mean across layers (bar chart)
 *   - Activation Std across layers (bar chart)
 *   - Grad-in Norm across layers (bar chart, amber)
 *   - Output shape flow (compact chain)
 *   - Anomaly summary table
 *
 * Clicking a bar selects that layer on the canvas and switches to Layer Detail view.
 */

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
import { useGraphStore } from '../store/Usegraphstore';
import { Section } from './Metricspanel';

// ---------------------------------------------------------------------------
// Epoch selector strip
// ---------------------------------------------------------------------------

function EpochSelector() {
  const { runMetrics, selectedEpoch, setSelectedEpoch } = useGraphStore();
  const n = runMetrics.n_epochs;
  if (n === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', marginRight: 4, whiteSpace: 'nowrap' }}>
        EPOCH
      </span>
      {Array.from({ length: n }, (_, i) => (
        <button
          key={i}
          onClick={() => setSelectedEpoch(i)}
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            border: `1px solid ${selectedEpoch === i ? 'var(--accent-dim)' : 'var(--border-mid)'}`,
            background: selectedEpoch === i ? 'var(--accent-faint)' : 'transparent',
            color: selectedEpoch === i ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            cursor: 'pointer', transition: 'all 0.1s',
          }}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom bar chart tooltip
// ---------------------------------------------------------------------------

function MetricTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const { nodeId, nodeType, value, std } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)',
      borderRadius: 'var(--radius-sm)', padding: '6px 10px',
      fontFamily: 'var(--font-mono)', fontSize: 9,
    }}>
      <div style={{ color: 'var(--text-primary)', marginBottom: 2 }}>{nodeType} — {nodeId}</div>
      <div style={{ color: 'var(--accent)' }}>mean: {value?.toFixed(5)}</div>
      {std !== undefined && <div style={{ color: 'var(--text-muted)' }}>±{std?.toFixed(5)}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cross-layer bar chart
// ---------------------------------------------------------------------------

function LayerBarChart({ title, metricKey, stdKey, color, nodes, epochData }) {
  const { setSelected, setActiveView } = useGraphStore();

  const data = nodes
    .filter(n => epochData?.[n.id]?.[metricKey])
    .map(n => {
      const stat = epochData[n.id][metricKey];
      return {
        nodeId:   n.id,
        nodeType: n.data.type,
        value:    stat.mean,
        std:      stdKey ? epochData[n.id]?.[stdKey]?.mean : stat.std,
        health:   n.data.health,
      };
    });

  if (data.length === 0) return null;

  const handleClick = (entry) => {
    if (entry?.activePayload?.[0]) {
      setSelected(entry.activePayload[0].payload.nodeId);
      setActiveView('layer');
    }
  };

  const getBarColor = (health) => {
    if (health === 'crit') return 'var(--red)';
    if (health === 'warn') return 'var(--amber)';
    return color;
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6,
      }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} onClick={handleClick} style={{ cursor: 'pointer' }}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="nodeId" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<MetricTooltip />} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.health)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shape flow chain
// ---------------------------------------------------------------------------

function ShapeFlow({ nodes, epochData }) {
  const layerNodes = nodes.filter(n => n.data.kind === 'layer' && epochData?.[n.id]?.output_shape);
  if (layerNodes.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        Output Shape Flow
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {layerNodes.map((n, i) => {
          const shape = epochData[n.id].output_shape;
          return (
            <React.Fragment key={n.id}>
              <div style={{
                padding: '2px 7px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-xs)',
                fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--accent-dim)',
                whiteSpace: 'nowrap',
              }}>
                {shape.join('×')}
              </div>
              {i < layerNodes.length - 1 && (
                <span style={{ color: 'var(--border-bright)', fontSize: 9 }}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anomaly summary table
// ---------------------------------------------------------------------------

const SEVERITY_COLOR = { critical: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)' };

function AnomalySummary({ nodes, anomalyData }) {
  if (!anomalyData || Object.keys(anomalyData).length === 0) return null;

  // Flatten: collect all (nodeId, anomaly) pairs
  const rows = [];
  nodes.forEach(n => {
    (anomalyData[n.id] ?? []).forEach(a => {
      rows.push({ nodeId: n.id, nodeType: n.data.type, ...a });
    });
  });

  if (rows.length === 0) return null;

  // Sort: critical first
  rows.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--red)', marginBottom: 8,
        borderBottom: '1px solid var(--red)22', paddingBottom: 4,
      }}>
        Anomalies — Epoch Summary
      </div>
      {rows.map((row, i) => {
        const c = SEVERITY_COLOR[row.severity] ?? 'var(--text-muted)';
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 8px', marginBottom: 3,
            background: `${c}08`, border: `1px solid ${c}30`,
            borderRadius: 'var(--radius-xs)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
                {row.nodeType} {row.nodeId}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: c }}>
                {row.kind.replace(/_/g, ' ')}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)', flexShrink: 0 }}>
              {((row.frequency ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function OverviewPanel() {
  const { nodes, runMetrics, selectedEpoch } = useGraphStore();
  const [isolatedMetric, setIsolatedMetric] = useState(null);

  const epochData    = runMetrics.epochs[selectedEpoch] ?? {};
  const anomalyData  = runMetrics.anomalies[selectedEpoch] ?? {};
  const hasData      = Object.keys(epochData).length > 0;

  const METRICS = [
    { key: 'activation_mean', stdKey: null,          title: 'Output Activation Mean',  color: 'var(--metric-activation)' },
    { key: 'activation_std',  stdKey: null,          title: 'Output Activation Std',   color: 'var(--metric-activation)' },
    { key: 'grad_in_norm',    stdKey: 'grad_in_std', title: 'Gradient Input Norm',     color: 'var(--metric-gradient)'   },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 0', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-primary)', marginBottom: 10,
        }}>
          Overview
        </div>
        <EpochSelector />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {!hasData ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '60%', fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.8,
          }}>
            Run the network to see<br />cross-layer metrics.
          </div>
        ) : (
          <>
            {/* Metric filter toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setIsolatedMetric(isolatedMetric === m.key ? null : m.key)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: `1px solid ${(!isolatedMetric || isolatedMetric === m.key) ? m.color : 'var(--border-mid)'}`,
                    background: (!isolatedMetric || isolatedMetric === m.key) ? `${m.color}10` : 'transparent',
                    color: (!isolatedMetric || isolatedMetric === m.key) ? m.color : 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)', fontSize: 8,
                    cursor: 'pointer', transition: 'all 0.1s',
                  }}
                >
                  {m.title}
                </button>
              ))}
            </div>

            {/* Bar charts */}
            {METRICS
              .filter(m => !isolatedMetric || isolatedMetric === m.key)
              .map(m => (
                <LayerBarChart
                  key={m.key}
                  title={m.title}
                  metricKey={m.key}
                  stdKey={m.stdKey}
                  color={m.color}
                  nodes={nodes}
                  epochData={epochData}
                />
              ))
            }

            {/* Shape flow */}
            <ShapeFlow nodes={nodes} epochData={epochData} />

            {/* Anomaly summary */}
            <AnomalySummary nodes={nodes} anomalyData={anomalyData} />
          </>
        )}
      </div>
    </div>
  );
>>>>>>> 3b424f8 (feat: sync package files for cloudflare)
=======
/**
 * Overviewpanel.jsx
 *
 * Cross-layer metrics dashboard. Shows all layers at a glance for one epoch.
 *
 * Layout:
 *   - Epoch selector (top)
 *   - Activation Mean across layers (bar chart)
 *   - Activation Std across layers (bar chart)
 *   - Grad-in Norm across layers (bar chart, amber)
 *   - Output shape flow (compact chain)
 *   - Anomaly summary table
 *
 * Clicking a bar selects that layer on the canvas and switches to Layer Detail view.
 */

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
import { useGraphStore } from '../store/Usegraphstore';
import { Section } from './Metricspanel';

// ---------------------------------------------------------------------------
// Epoch selector strip
// ---------------------------------------------------------------------------

function EpochSelector() {
  const { runMetrics, selectedEpoch, setSelectedEpoch } = useGraphStore();
  const n = runMetrics.n_epochs;
  if (n === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', marginRight: 4, whiteSpace: 'nowrap' }}>
        EPOCH
      </span>
      {Array.from({ length: n }, (_, i) => (
        <button
          key={i}
          onClick={() => setSelectedEpoch(i)}
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            border: `1px solid ${selectedEpoch === i ? 'var(--accent-dim)' : 'var(--border-mid)'}`,
            background: selectedEpoch === i ? 'var(--accent-faint)' : 'transparent',
            color: selectedEpoch === i ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            cursor: 'pointer', transition: 'all 0.1s',
          }}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom bar chart tooltip
// ---------------------------------------------------------------------------

function MetricTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const { nodeId, nodeType, value, std } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)',
      borderRadius: 'var(--radius-sm)', padding: '6px 10px',
      fontFamily: 'var(--font-mono)', fontSize: 9,
    }}>
      <div style={{ color: 'var(--text-primary)', marginBottom: 2 }}>{nodeType} — {nodeId}</div>
      <div style={{ color: 'var(--accent)' }}>mean: {value?.toFixed(5)}</div>
      {std !== undefined && <div style={{ color: 'var(--text-muted)' }}>±{std?.toFixed(5)}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cross-layer bar chart
// ---------------------------------------------------------------------------

function LayerBarChart({ title, metricKey, stdKey, color, nodes, epochData }) {
  const { setSelected, setActiveView } = useGraphStore();

  const data = nodes
    .filter(n => epochData?.[n.id]?.[metricKey])
    .map(n => {
      const stat = epochData[n.id][metricKey];
      return {
        nodeId:   n.id,
        nodeType: n.data.type,
        value:    stat.mean,
        std:      stdKey ? epochData[n.id]?.[stdKey]?.mean : stat.std,
        health:   n.data.health,
      };
    });

  if (data.length === 0) return null;

  const handleClick = (entry) => {
    if (entry?.activePayload?.[0]) {
      setSelected(entry.activePayload[0].payload.nodeId);
      setActiveView('layer');
    }
  };

  const getBarColor = (health) => {
    if (health === 'crit') return 'var(--red)';
    if (health === 'warn') return 'var(--amber)';
    return color;
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6,
      }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} onClick={handleClick} style={{ cursor: 'pointer' }}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="nodeId" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<MetricTooltip />} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.health)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shape flow chain
// ---------------------------------------------------------------------------

function ShapeFlow({ nodes, epochData }) {
  const layerNodes = nodes.filter(n => n.data.kind === 'layer' && epochData?.[n.id]?.output_shape);
  if (layerNodes.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        Output Shape Flow
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {layerNodes.map((n, i) => {
          const shape = epochData[n.id].output_shape;
          return (
            <React.Fragment key={n.id}>
              <div style={{
                padding: '2px 7px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-xs)',
                fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--accent-dim)',
                whiteSpace: 'nowrap',
              }}>
                {shape.join('×')}
              </div>
              {i < layerNodes.length - 1 && (
                <span style={{ color: 'var(--border-bright)', fontSize: 9 }}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anomaly summary table
// ---------------------------------------------------------------------------

const SEVERITY_COLOR = { critical: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)' };

function AnomalySummary({ nodes, anomalyData }) {
  if (!anomalyData || Object.keys(anomalyData).length === 0) return null;

  // Flatten: collect all (nodeId, anomaly) pairs
  const rows = [];
  nodes.forEach(n => {
    (anomalyData[n.id] ?? []).forEach(a => {
      rows.push({ nodeId: n.id, nodeType: n.data.type, ...a });
    });
  });

  if (rows.length === 0) return null;

  // Sort: critical first
  rows.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--red)', marginBottom: 8,
        borderBottom: '1px solid var(--red)22', paddingBottom: 4,
      }}>
        Anomalies — Epoch Summary
      </div>
      {rows.map((row, i) => {
        const c = SEVERITY_COLOR[row.severity] ?? 'var(--text-muted)';
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 8px', marginBottom: 3,
            background: `${c}08`, border: `1px solid ${c}30`,
            borderRadius: 'var(--radius-xs)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
                {row.nodeType} {row.nodeId}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: c }}>
                {row.kind.replace(/_/g, ' ')}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)', flexShrink: 0 }}>
              {((row.frequency ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function OverviewPanel() {
  const { nodes, runMetrics, selectedEpoch } = useGraphStore();
  const [isolatedMetric, setIsolatedMetric] = useState(null);

  const epochData    = runMetrics.epochs[selectedEpoch] ?? {};
  const anomalyData  = runMetrics.anomalies[selectedEpoch] ?? {};
  const hasData      = Object.keys(epochData).length > 0;

  const METRICS = [
    { key: 'activation_mean', stdKey: null,          title: 'Output Activation Mean',  color: 'var(--metric-activation)' },
    { key: 'activation_std',  stdKey: null,          title: 'Output Activation Std',   color: 'var(--metric-activation)' },
    { key: 'grad_in_norm',    stdKey: 'grad_in_std', title: 'Gradient Input Norm',     color: 'var(--metric-gradient)'   },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 0', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-primary)', marginBottom: 10,
        }}>
          Overview
        </div>
        <EpochSelector />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {!hasData ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '60%', fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.8,
          }}>
            Run the network to see<br />cross-layer metrics.
          </div>
        ) : (
          <>
            {/* Metric filter toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setIsolatedMetric(isolatedMetric === m.key ? null : m.key)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: `1px solid ${(!isolatedMetric || isolatedMetric === m.key) ? m.color : 'var(--border-mid)'}`,
                    background: (!isolatedMetric || isolatedMetric === m.key) ? `${m.color}10` : 'transparent',
                    color: (!isolatedMetric || isolatedMetric === m.key) ? m.color : 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)', fontSize: 8,
                    cursor: 'pointer', transition: 'all 0.1s',
                  }}
                >
                  {m.title}
                </button>
              ))}
            </div>

            {/* Bar charts */}
            {METRICS
              .filter(m => !isolatedMetric || isolatedMetric === m.key)
              .map(m => (
                <LayerBarChart
                  key={m.key}
                  title={m.title}
                  metricKey={m.key}
                  stdKey={m.stdKey}
                  color={m.color}
                  nodes={nodes}
                  epochData={epochData}
                />
              ))
            }

            {/* Shape flow */}
            <ShapeFlow nodes={nodes} epochData={epochData} />

            {/* Anomaly summary */}
            <AnomalySummary nodes={nodes} anomalyData={anomalyData} />
          </>
        )}
      </div>
    </div>
  );
>>>>>>> dcaed53 (feat: sync package files for cloudflare)
}