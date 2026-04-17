/**
 * Components.jsx
 *
 * Rect card renderer for all layer-kind components.
 * Handles: inputlayer, linear, relu, layernorm, and any future layer type.
 *
 * health indicator — corner dot driven by data.health: 'ok' | 'warn' | 'crit' | null
 * Shape display — reads from runMetrics (via Metricspanel) not from data.metrics
 */

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useGraphStore } from '../store/Usegraphstore';

const S_COLOR = {
  idle:    'var(--border-bright)',
  pending: 'var(--amber)',
  running: 'var(--accent)',
  done:    'var(--accent-dim)',
  error:   'var(--red)',
  locked:  'var(--text-muted)',
  branch:  'var(--blue)',
};

const S_GLOW = {
  running: '0 0 20px rgba(0,229,160,0.35)',
  pending: '0 0 14px rgba(240,165,0,0.3)',
  error:   '0 0 14px rgba(240,40,85,0.3)',
  branch:  '0 0 14px rgba(33,150,243,0.3)',
};

const HEALTH_COLOR = {
  ok:   'var(--health-ok)',
  warn: 'var(--health-warn)',
  crit: 'var(--health-crit)',
};

// ---------------------------------------------------------------------------
// Inline config field
// ---------------------------------------------------------------------------

function ConfigField({ field, value, onChange, locked }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)', minWidth: 76, flexShrink: 0 }}>
        {field.name}
      </span>
      <input
        type="number"
        step={field.type === 'float' ? '0.00001' : '1'}
        value={value ?? ''}
        disabled={locked}
        onChange={e => onChange(
          field.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
        )}
        style={{ width: 72, fontSize: 11, padding: '2px 6px' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// InputLayer port row
// ---------------------------------------------------------------------------

function PortRow({ label, idx, nodeId, locked, canRemove }) {
  const { updateInputPortLabel, removeInputPort } = useGraphStore();
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(label);

  const commit = useCallback(() => {
    const t = draft.trim();
    if (t && t !== label) updateInputPortLabel(nodeId, idx, t);
    else setDraft(label);
    setEditing(false);
  }, [draft, label, nodeId, idx, updateInputPortLabel]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 12px', borderTop: '1px solid var(--border)',
      position: 'relative', minHeight: 30, gap: 6,
    }}>
      {editing ? (
        <input
          autoFocus value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(label); setEditing(false); } }}
          onClick={e => e.stopPropagation()}
          style={{ flex: 1, fontSize: 10, padding: '1px 4px' }}
        />
      ) : (
        <span
          onClick={e => { if (!locked) { e.stopPropagation(); setEditing(true); } }}
          title={locked ? label : 'Click to rename'}
          style={{
            flex: 1, fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--accent-dim)',
            cursor: locked ? 'default' : 'text',
            borderBottom: locked ? 'none' : '1px dashed var(--border-bright)',
            paddingBottom: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}

      {!locked && canRemove && (
        <button
          onClick={e => { e.stopPropagation(); removeInputPort(nodeId, idx); }}
          style={{
            width: 14, height: 14, borderRadius: 2, flexShrink: 0,
            border: '1px solid var(--border-mid)', color: 'var(--text-muted)',
            fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          −
        </button>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id={`port-${idx}`}
        style={{ right: -5, top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Component = memo(({ id, data, selected }) => {
  const {
    updateComponentConfig, setSelected,
    addInputPort, updateComponentName,
    runMode, layerTypes,
  } = useGraphStore();

  const locked   = runMode !== 'idle';
  const color    = S_COLOR[data.status] ?? S_COLOR.idle;
  const glow     = S_GLOW[data.status]  ?? 'none';
  const typeDef  = layerTypes[data.type] ?? { fields: [] };
  const isInput  = data.type === 'inputlayer';
  const ports    = data.ports ?? ['port_0'];
  const typeLabel = typeDef.label ?? data.type.toUpperCase();

  // Health indicator
  const healthColor = data.health ? HEALTH_COLOR[data.health] : null;

  // Editable name
  const [editingName, setEditingName] = useState(false);
  const [nameDraft,   setNameDraft]   = useState(data.name ?? data.type);

  const commitName = useCallback(() => {
    const t = nameDraft.trim();
    if (t) updateComponentName(id, t);
    else setNameDraft(data.name ?? data.type);
    setEditingName(false);
  }, [nameDraft, data.name, data.type, id, updateComponentName]);

  return (
    <div
      onClick={() => setSelected(id)}
      style={{
        minWidth: 172,
        background: selected
          ? 'linear-gradient(135deg, var(--bg-elevated), var(--bg-hover))'
          : 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))',
        border: `1px solid ${selected ? color : 'var(--border-mid)'}`,
        borderRadius: 'var(--radius)',
        boxShadow: selected
          ? `${glow}, inset 0 1px 0 rgba(255,255,255,0.04)`
          : 'inset 0 1px 0 rgba(255,255,255,0.02)',
        transition: 'all 0.15s',
        cursor: locked ? 'default' : 'pointer',
        opacity: data.status === 'locked' ? 0.4 : 1,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Health badge — top-right corner dot */}
      {healthColor && data.health !== 'ok' && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 10, height: 10, borderRadius: '50%',
          background: healthColor,
          border: '1.5px solid var(--bg-void)',
          boxShadow: `0 0 6px ${healthColor}`,
          zIndex: 1,
        }} />
      )}

      {/* Status accent bar */}
      <div style={{
        height: 2,
        background: color,
        borderRadius: 'var(--radius) var(--radius) 0 0',
        opacity: data.status === 'idle' ? 0.25 : 1,
        boxShadow: data.status === 'running' ? `0 0 10px ${color}` : 'none',
        transition: 'all 0.25s',
      }} />

      {/* Header */}
      <div style={{
        padding: '7px 12px 6px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Type badge */}
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.14em',
          color: isInput ? 'var(--accent)' : color,
          textTransform: 'uppercase', flexShrink: 0,
          padding: '1px 5px',
          background: isInput ? 'var(--accent-faint)' : 'transparent',
          borderRadius: 2,
          border: isInput ? '1px solid var(--accent-faint)' : 'none',
        }}>
          {typeLabel}
        </span>

        {/* Editable name */}
        {editingName ? (
          <input
            autoFocus value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameDraft(data.name ?? ''); setEditingName(false); } }}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, fontSize: 10, minWidth: 0, padding: '1px 4px' }}
          />
        ) : (
          <span
            onClick={e => { if (!locked) { e.stopPropagation(); setEditingName(true); } }}
            style={{
              flex: 1, fontSize: 10, fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              cursor: locked ? 'default' : 'text',
              borderBottom: locked ? 'none' : '1px dashed var(--border-bright)',
              minWidth: 0,
            }}
          >
            {data.name ?? data.type}
          </span>
        )}

        {/* Component ID */}
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', flexShrink: 0 }}>
          {id}
        </span>
      </div>

      {/* InputLayer: port rows */}
      {isInput && ports.map((label, i) => (
        <PortRow key={i} label={label} idx={i} nodeId={id} locked={locked} canRemove={ports.length > 1} />
      ))}

      {/* InputLayer: add port button */}
      {isInput && !locked && (
        <div style={{ padding: '5px 12px' }}>
          <button
            onClick={e => { e.stopPropagation(); addInputPort(id); }}
            style={{
              fontSize: 9, fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)', padding: '2px 8px',
              border: '1px dashed var(--border-mid)', borderRadius: 2,
              cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            + port
          </button>
        </div>
      )}

      {/* Config fields (non-inputlayer layers) */}
      {!isInput && (
        <div style={{ padding: '7px 12px 9px' }}>
          {(typeDef.fields ?? []).length === 0 && (
            <span style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>—</span>
          )}
          {(typeDef.fields ?? []).map(f => (
            <ConfigField
              key={f.name}
              field={f}
              value={data.config?.[f.name]}
              onChange={v => updateComponentConfig(id, f.name, v)}
              locked={locked}
            />
          ))}

          {/* Warnings */}
          {data.warnings?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {data.warnings.map((w, i) => (
                <div key={i} style={{
                  fontSize: 9, color: 'var(--amber)', fontFamily: 'var(--font-mono)',
                  display: 'flex', gap: 4, alignItems: 'flex-start', marginTop: 3,
                  background: 'var(--amber-glow)', padding: '3px 5px',
                  borderRadius: 2, border: '1px solid rgba(240,165,0,0.2)',
                }}>
                  <span>⚠</span><span style={{ opacity: 0.9 }}>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Handles */}
      {!isInput && (
        <Handle type="target" position={Position.Left}
          style={{ left: -5, top: '50%', transform: 'translateY(-50%)' }} />
      )}
      {!isInput && (
        <Handle type="source" position={Position.Right}
          style={{ right: -5, top: '50%', transform: 'translateY(-50%)' }} />
      )}
    </div>
  );
});

export default Component;