import React from 'react';
import { useGraphStore } from '../store/Usegraphstore';

const OBSERVERS = [
  { id: 'SignalStatsObserver',    label: 'Signal Stats',    desc: 'activation mean/var, gradient norm/var' },
  { id: 'SignalShapeObserver',    label: 'Signal Shape',    desc: 'tensor shapes at each component' },
  { id: 'ResidualEnergyObserver', label: 'Residual Energy', desc: 'residual vs shortcut path energy' },
];

export default function ObserverConfig() {
  const { runConfig, setRunConfig, runMode } = useGraphStore();
  const locked = runMode !== 'idle';

  const toggle = (id) => {
    const next = runConfig.observers.includes(id)
      ? runConfig.observers.filter(o => o !== id)
      : [...runConfig.observers, id];
    setRunConfig({ observers: next });
  };

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>

      <Label>Observers</Label>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.7,
      }}>
        Only selected observers will fire. Unchecking an observer removes its metrics from the run.
      </p>

      <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {OBSERVERS.map(obs => {
          const active = runConfig.observers.includes(obs.id);
          return (
            <div
              key={obs.id}
              onClick={() => !locked && toggle(obs.id)}
              style={{
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${active ? 'var(--accent-dim)' : 'var(--border-mid)'}`,
                background: active ? 'var(--accent-faint)' : 'var(--bg-surface)',
                cursor: locked ? 'default' : 'pointer',
                opacity: locked ? 0.55 : 1,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {/* Checkbox indicator */}
                <div style={{
                  width: 9, height: 9, borderRadius: 2, flexShrink: 0,
                  background: active ? 'var(--accent)' : 'transparent',
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-bright)'}`,
                  boxShadow: active ? '0 0 6px var(--accent-glow)' : 'none',
                  transition: 'all 0.15s',
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 500 : 400,
                }}>
                  {obs.label}
                </span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'var(--text-dim)', marginTop: 3, paddingLeft: 18,
                lineHeight: 1.5,
              }}>
                {obs.desc}
              </div>
            </div>
          );
        })}
      </div>

      <Label>Run ID</Label>
      <input
        type="number"
        disabled={locked}
        value={runConfig.run_id ?? 0}
        onChange={e => setRunConfig({ run_id: parseInt(e.target.value) || 0 })}
        style={{ marginBottom: 6 }}
      />
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20,
      }}>
        Scopes metric storage. Increment between experiments to preserve previous run data.
      </p>

    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700,
      color: 'var(--text-muted)', textTransform: 'uppercase',
      letterSpacing: '0.14em', marginBottom: 7,
    }}>
      {children}
    </div>
  );
}