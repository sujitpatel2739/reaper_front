/**
 * Epochpanel.jsx
 *
 * Cross-epoch trends view. Shows how metrics evolve across epochs.
 *
 * Layout:
 *   - Metric line charts (N layers = N lines per chart, toggle layers)
 *   - Anomaly heatmap (rows = layers, columns = epochs, color = severity)
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useGraphStore } from '../store/Usegraphstore';

// ---------------------------------------------------------------------------
// Colour palette for layer lines — cycles through a set
// ---------------------------------------------------------------------------

const LINE_COLORS = [
  '#00e5a0', '#2196f3', '#9c6ffa', '#f0a500',
  '#f02855', '#00bcd4', '#ff9800', '#8bc34a',
  '#e91e63', '#03a9f4',
];

function layerColor(idx) {
  return LINE_COLORS[idx % LINE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Multi-line epoch chart
// ---------------------------------------------------------------------------

function EpochLineChart({ title, metricKey, layerEntries, epochCount }) {
  const [hiddenLayers, setHiddenLayers] = useState(new Set());

  const toggleLayer = (nodeId) => {
    setHiddenLayers(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  // Build chart data: one row per epoch, one key per layer
  const chartData = useMemo(() =>
    Array.from({ length: epochCount }, (_, e) => {
      const row = { epoch: e };
      layerEntries.forEach(({ nodeId, epochs }) => {
        row[nodeId] = epochs[e]?.[metricKey]?.mean ?? null;
      });
      return row;
    }),
    [epochCount, layerEntries, metricKey]
  );

  if (chartData.every(row => layerEntries.every(l => row[l.nodeId] === null))) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        {title}
      </div>

      {/* Layer toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {layerEntries.map(({ nodeId, nodeType, colorIdx }) => {
          const c = layerColor(colorIdx);
          const hidden = hiddenLayers.has(nodeId);
          return (
            <button
              key={nodeId}
              onClick={() => toggleLayer(nodeId)}
              style={{
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                border: `1px solid ${hidden ? 'var(--border-mid)' : c}`,
                background: hidden ? 'transparent' : `${c}15`,
                color: hidden ? 'var(--text-dim)' : c,
                fontFamily: 'var(--font-mono)', fontSize: 8,
                cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              {nodeType} {nodeId}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={chartData} margin={{ top: 2, right: 4, bottom: 2, left: 0 }}>
          <XAxis
            dataKey="epoch" type="number" domain={[0, epochCount - 1]}
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: 'var(--text-dim)' }}
            tickFormatter={v => `E${v}`}
          />
          <YAxis
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: 'var(--text-dim)' }}
            width={48}
            tickFormatter={v => v.toExponential(1)}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 9 }}
            labelFormatter={v => `Epoch ${v}`}
            formatter={(v, name) => [v?.toFixed(6) ?? '—', name]}
          />
          {layerEntries
            .filter(l => !hiddenLayers.has(l.nodeId))
            .map(({ nodeId, colorIdx }) => (
              <Line
                key={nodeId}
                type="monotone"
                dataKey={nodeId}
                stroke={layerColor(colorIdx)}
                strokeWidth={1.5}
                dot={epochCount < 10 ? { r: 3, fill: layerColor(colorIdx) } : false}
                isAnimationActive={false}
                connectNulls
              />
            ))
          }
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anomaly heatmap
// ---------------------------------------------------------------------------

function AnomalyHeatmap({ layerEntries, epochCount, anomalies }) {
  if (epochCount === 0) return null;

  const SEVERITY_BG = {
    critical: 'rgba(240,40,85,0.75)',
    warning:  'rgba(240,165,0,0.65)',
    info:     'rgba(33,150,243,0.55)',
    ok:       'rgba(0,229,160,0.15)',
    none:     'var(--bg-elevated)',
  };

  const getCellSeverity = (nodeId, epoch) => {
    const list = anomalies[epoch]?.[nodeId] ?? [];
    if (list.length === 0) return 'ok';
    if (list.some(a => a.severity === 'critical')) return 'critical';
    if (list.some(a => a.severity === 'warning'))  return 'warning';
    return 'info';
  };

  const cellSize = Math.max(16, Math.min(32, Math.floor(400 / epochCount)));

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        Anomaly Heatmap — layers × epochs
      </div>

      {/* Epoch column headers */}
      <div style={{ display: 'flex', marginLeft: 88, marginBottom: 4, gap: 2 }}>
        {Array.from({ length: epochCount }, (_, e) => (
          <div key={e} style={{
            width: cellSize, textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-dim)',
          }}>
            {e}
          </div>
        ))}
      </div>

      {/* Rows */}
      {layerEntries.map(({ nodeId, nodeType }) => (
        <div key={nodeId} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
          {/* Row label */}
          <div style={{
            width: 84, flexShrink: 0,
            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textAlign: 'right', paddingRight: 6,
          }}>
            {nodeType} {nodeId}
          </div>

          {/* Cells */}
          {Array.from({ length: epochCount }, (_, e) => {
            const sev = getCellSeverity(nodeId, e);
            return (
              <div
                key={e}
                title={`${nodeId} — Epoch ${e} — ${sev}`}
                style={{
                  width: cellSize, height: cellSize,
                  borderRadius: 2,
                  background: SEVERITY_BG[sev] ?? SEVERITY_BG.none,
                  border: '1px solid rgba(255,255,255,0.04)',
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
        {[
          { label: 'Clean',    sev: 'ok'       },
          { label: 'Warning',  sev: 'warning'  },
          { label: 'Critical', sev: 'critical' },
        ].map(({ label, sev }) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: SEVERITY_BG[sev], border: '1px solid rgba(255,255,255,0.06)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function EpochPanel() {
  const { nodes, runMetrics } = useGraphStore();

  const epochCount   = runMetrics.n_epochs;
  const anomalies    = runMetrics.anomalies;
  const hasData      = epochCount > 0;

  // Build layer entries: only layers that have any metric data
  const layerEntries = useMemo(() => {
    const entries = [];
    let colorIdx = 0;
    nodes
      .filter(n => n.data.kind === 'layer' && n.data.type !== 'inputlayer')
      .forEach(n => {
        const hasAnyData = Object.values(runMetrics.epochs).some(ep => ep[n.id]);
        if (hasAnyData) {
          entries.push({
            nodeId:   n.id,
            nodeType: n.data.type,
            epochs:   runMetrics.epochs,   // all epoch snapshots
            colorIdx: colorIdx++,
          });
        }
      });
    return entries;
  }, [nodes, runMetrics]);

  const CHARTS = [
    { key: 'activation_mean', title: 'Activation Mean / Epoch' },
    { key: 'activation_std',  title: 'Activation Std / Epoch'  },
    { key: 'grad_in_norm',    title: 'Gradient-In Norm / Epoch' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)',
        }}>
          Epoch Trends
        </div>
        {hasData && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)', marginTop: 4 }}>
            {epochCount} epoch{epochCount !== 1 ? 's' : ''} · {layerEntries.length} tracked layer{layerEntries.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {!hasData ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '60%', fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.8,
          }}>
            Run the network for one or more epochs<br />to see trends.
          </div>
        ) : epochCount < 2 ? (
          <>
            <div style={{
              padding: '8px 12px', marginBottom: 14,
              background: 'var(--accent-faint)', border: '1px solid var(--accent-dim)',
              borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)',
              fontSize: 9, color: 'var(--accent-dim)', lineHeight: 1.6,
            }}>
              Epoch trends require at least 2 epochs. Showing anomaly heatmap for epoch 0.
            </div>
            <AnomalyHeatmap layerEntries={layerEntries} epochCount={epochCount} anomalies={anomalies} />
          </>
        ) : (
          <>
            {CHARTS.map(c => (
              <EpochLineChart
                key={c.key}
                title={c.title}
                metricKey={c.key}
                layerEntries={layerEntries}
                epochCount={epochCount}
              />
            ))}
            <AnomalyHeatmap layerEntries={layerEntries} epochCount={epochCount} anomalies={anomalies} />
          </>
        )}
      </div>
    </div>
  );
}