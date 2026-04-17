/**
 * Metricspanel.jsx
 *
 * Component detail panel — used in Network and Layer Detail views.
 * Shows: identity, config, output stats, grad-in stats,
 *        cross-epoch sparklines, anomaly list.
 *
 * Reads from runMetrics.epochs[selectedEpoch][node.id]
 * and runMetrics.anomalies[selectedEpoch][node.id].
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGraphStore } from '../store/Usegraphstore';

// ---------------------------------------------------------------------------
// Shared primitive components
// ---------------------------------------------------------------------------

export function StatRow({ label, stat, color = 'var(--text-primary)', accent = false }) {
  if (!stat) return null;
  const { mean, std, min, max } = stat;
  const fmt = v => (typeof v === 'number' ? v.toFixed(5) : '—');

  // Range bar: shows [min …mean±std… max] as a proportional bar
  const range = max - min;
  const meanPos  = range > 0 ? ((mean - min) / range) * 100 : 50;
  const stdWidth = range > 0 ? (std / range) * 100 : 0;
  const stdLeft  = Math.max(0, meanPos - stdWidth / 2);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: accent ? color : 'var(--text-secondary)' }}>
          {fmt(mean)} ± {fmt(std)}
        </span>
      </div>
      {/* Range bar */}
      <div style={{
        height: 4, background: 'var(--bg-active)', borderRadius: 2,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Full range */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
          background: `${color}18`,
        }} />
        {/* Std band */}
        <div style={{
          position: 'absolute',
          left: `${stdLeft}%`,
          width: `${Math.min(stdWidth, 100 - stdLeft)}%`,
          top: 0, bottom: 0,
          background: `${color}50`,
        }} />
        {/* Mean marker */}
        <div style={{
          position: 'absolute',
          left: `calc(${meanPos}% - 1px)`,
          width: 2, top: 0, bottom: 0,
          background: color,
          boxShadow: `0 0 4px ${color}`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)' }}>{fmt(min)}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)' }}>{fmt(max)}</span>
      </div>
    </div>
  );
}

export function Section({ label, color = 'var(--text-muted)', children, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em',
        textTransform: 'uppercase', color,
        borderBottom: `1px solid ${color === 'var(--text-muted)' ? 'var(--border)' : color + '44'}`,
        paddingBottom: 4, marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export function Sparkline({ label, data, color = 'var(--accent)', height = 44 }) {
  if (!data?.length) return null;
  const pts = data.map((v, i) => ({ i, v: typeof v === 'number' ? v : 0 }));
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4,
      }}>
        {label}
      </span>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={pts} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <XAxis dataKey="i" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-primary)' }}
            formatter={v => [v?.toFixed?.(6) ?? v, '']} labelFormatter={() => ''} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnomalyBadge({ anomaly }) {
  const COLOR = { critical: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)' };
  const c = COLOR[anomaly.severity] ?? 'var(--text-muted)';
  const pct = ((anomaly.frequency ?? 0) * 100).toFixed(1);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 8px', marginBottom: 4,
      background: `${c}10`, border: `1px solid ${c}40`,
      borderRadius: 'var(--radius-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 4px ${c}` }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: c }}>
          {anomaly.kind.replace(/_/g, ' ')}
        </span>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
        {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health indicator dot
// ---------------------------------------------------------------------------

function HealthDot({ health }) {
  if (!health || health === 'ok') return null;
  const c = health === 'crit' ? 'var(--red)' : 'var(--amber)';
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
      background: c, boxShadow: `0 0 5px ${c}`,
    }} />
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function MetricsPanel({ node }) {
  const { runMetrics, selectedEpoch } = useGraphStore();

  if (!node) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          No component selected
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', lineHeight: 1.8 }}>
          Click any component on the canvas<br />to inspect its metrics.
        </div>
      </div>
    </div>
  );

  const { data } = node;
  const epochData    = runMetrics.epochs[selectedEpoch]?.[node.id];
  const anomalyData  = runMetrics.anomalies[selectedEpoch]?.[node.id] ?? [];

  // Cross-epoch sparkline data: mean of each metric per epoch
  const epochCount = runMetrics.n_epochs;
  const makeHistory = (metricKey) =>
    Array.from({ length: epochCount }, (_, e) =>
      runMetrics.epochs[e]?.[node.id]?.[metricKey]?.mean ?? null
    ).filter(v => v !== null);

  const activationHistory = makeHistory('activation_mean');
  const gradHistory       = makeHistory('grad_in_norm');

  const statusColor = {
    idle: 'var(--text-dim)', done: 'var(--accent)', running: 'var(--accent)',
    error: 'var(--red)', pending: 'var(--amber)', locked: 'var(--text-dim)', branch: 'var(--blue)',
  }[data.status] ?? 'var(--text-dim)';

  return (
    <div style={{ padding: 14, overflowY: 'auto', height: '100%' }}>

      {/* Identity card */}
      <div style={{
        marginBottom: 14, padding: '10px 12px',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)',
        borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <HealthDot health={data.health} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
            color: data.type === 'inputlayer' ? 'var(--accent)' : 'var(--text-primary)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {data.type}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{node.id}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: statusColor,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '2px 7px', background: `${statusColor}18`,
            border: `1px solid ${statusColor}44`, borderRadius: 'var(--radius-xs)',
          }}>
            {data.status}
          </span>
        </div>
      </div>

      {/* Config */}
      {data.config && Object.keys(data.config).length > 0 && (
        <Section label="Config">
          {Object.entries(data.config).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>{v}</span>
            </div>
          ))}
        </Section>
      )}

      {/* No metrics yet */}
      {!epochData && (
        <div style={{
          padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.7,
        }}>
          Run the network to collect metrics.
        </div>
      )}

      {epochData && (
        <>
          {/* Output shape */}
          {epochData.output_shape && (
            <Section label="Shape">
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-dim)' }}>
                {epochData.output_shape.join(' × ')}
              </div>
            </Section>
          )}

          {/* Output stats */}
          <Section label="Output Activation">
            <StatRow label="mean"     stat={epochData.activation_mean} color="var(--metric-activation)" accent />
            <StatRow label="std dev"  stat={epochData.activation_std}  color="var(--metric-activation)" />
          </Section>

          {/* Grad-in stats */}
          {(epochData.grad_in_norm || epochData.grad_in_std) && (
            <Section label="Gradient Input">
              <StatRow label="norm"    stat={epochData.grad_in_norm} color="var(--metric-gradient)" accent />
              <StatRow label="std dev" stat={epochData.grad_in_std}  color="var(--metric-gradient)" />
            </Section>
          )}

          {/* Cross-epoch sparklines */}
          {epochCount > 1 && (
            <Section label="Epoch Trends">
              <Sparkline label="activation mean / epoch" data={activationHistory} color="var(--metric-activation)" />
              {gradHistory.length > 0 && (
                <Sparkline label="grad-in norm / epoch"  data={gradHistory}       color="var(--metric-gradient)" />
              )}
            </Section>
          )}

          {/* Anomalies */}
          {anomalyData.length > 0 && (
            <Section label="Anomalies" color="var(--red)">
              {anomalyData.map((a, i) => <AnomalyBadge key={i} anomaly={a} />)}
            </Section>
          )}
        </>
      )}

      {/* Canvas warnings (shape mismatches from build) */}
      {data.warnings?.length > 0 && (
        <Section label="Warnings" color="var(--amber)">
          {data.warnings.map((w, i) => (
            <div key={i} style={{
              padding: '5px 8px', marginBottom: 4,
              background: 'var(--amber-glow)', border: '1px solid rgba(240,165,0,0.2)',
              borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--amber)',
              display: 'flex', gap: 5,
            }}>
              <span>⚠</span><span>{w}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}