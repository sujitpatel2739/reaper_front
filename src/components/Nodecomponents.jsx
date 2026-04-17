/**
 * NodeComponent.jsx
 *
 * Renders operation-kind components as styled circles.
 * Types: add, sub, mul, div, sq, neg, sqrt, scale, clip, concat, split
 */

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { useGraphStore } from '../store/Usegraphstore';

const S_COLOR = {
  idle:    'var(--border-bright)',
  pending: 'var(--amber)',
  running: 'var(--accent)',
  done:    'var(--blue-dim)',
  error:   'var(--red)',
  locked:  'var(--text-muted)',
  branch:  'var(--blue)',
};

const NodeComponent = memo(({ id, data, selected }) => {
  const { updateComponentConfig, setSelected, runMode, nodeTypes } = useGraphStore();
  const locked  = runMode !== 'idle';
  const color   = S_COLOR[data.status] ?? S_COLOR.idle;
  const typeDef = nodeTypes[data.type] ?? { fields: [], symbol: '?', label: data.type };
  const symbol  = typeDef.symbol ?? data.type.toUpperCase();
  const label   = typeDef.label ?? data.type;

  const isMultiInput = typeDef.inputs === 'N' || typeDef.inputs > 1;

  return (
    <div
      onClick={() => setSelected(id)}
      style={{
        width: 68, height: 68,
        borderRadius: '50%',
        background: selected
          ? `radial-gradient(circle at 40% 35%, var(--bg-hover), var(--bg-elevated))`
          : `radial-gradient(circle at 40% 35%, var(--bg-elevated), var(--bg-surface))`,
        border: `1.5px solid ${selected ? color : 'var(--border-mid)'}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: locked ? 'default' : 'pointer',
        opacity: data.status === 'locked' ? 0.4 : 1,
        boxShadow: selected
          ? `0 0 18px ${color}44, inset 0 1px 0 rgba(255,255,255,0.06)`
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        transition: 'all 0.15s',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Operation symbol */}
      <span style={{
        fontSize: 20, fontFamily: 'var(--font-mono)',
        fontWeight: 500, color, lineHeight: 1,
        textShadow: data.status === 'running' ? `0 0 12px ${color}` : 'none',
      }}>
        {symbol}
      </span>

      {/* Type label */}
      <span style={{
        fontSize: 7, fontFamily: 'var(--font-display)',
        color: 'var(--text-muted)', letterSpacing: '0.1em',
        marginTop: 2, textTransform: 'uppercase',
      }}>
        {label}
      </span>

      {/* Component ID — below circle */}
      <span style={{
        position: 'absolute', bottom: -17,
        fontSize: 8, fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)', whiteSpace: 'nowrap',
        letterSpacing: '0.04em',
      }}>
        {id}
      </span>

      {/* Inline config — below ID */}
      {(typeDef.fields ?? []).length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 20px)',
          left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 8px',
          whiteSpace: 'nowrap', zIndex: 10,
          boxShadow: 'var(--shadow-sm)',
        }}>
          {typeDef.fields.map(f => (
            <div key={f.name} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {f.name}
              </span>
              <input
                type="number"
                step={f.type === 'float' ? '0.1' : '1'}
                value={data.config?.[f.name] ?? ''}
                disabled={locked}
                onChange={e => updateComponentConfig(
                  id, f.name,
                  f.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
                )}
                style={{ width: 56, fontSize: 10, padding: '2px 5px' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Handles */}
      {isMultiInput ? (
        <>
          <Handle type="target" position={Position.Left} id="in_0"
            style={{ left: -5, top: '33%', transform: 'translateY(-50%)' }} />
          <Handle type="target" position={Position.Left} id="in_1"
            style={{ left: -5, top: '67%', transform: 'translateY(-50%)' }} />
        </>
      ) : (
        <Handle type="target" position={Position.Left} id="in_0"
          style={{ left: -5, top: '50%', transform: 'translateY(-50%)' }} />
      )}
      <Handle type="source" position={Position.Right} id="out_0"
        style={{ right: -5, top: '50%', transform: 'translateY(-50%)' }} />

      {/* Warning dot */}
      {data.warnings?.length > 0 && (
        <div style={{
          position: 'absolute', top: -3, right: -3,
          width: 9, height: 9, borderRadius: '50%',
          background: 'var(--amber)',
          border: '1.5px solid var(--bg-void)',
          boxShadow: '0 0 6px var(--amber-glow)',
        }} />
      )}
    </div>
  );
});

export default NodeComponent;