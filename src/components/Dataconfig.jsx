import React, { useRef, useState } from 'react';
import { useGraphStore } from '../store/Usegraphstore';
import { validateSyntheticSpec, validateUploadedFile } from '../api/api';

const MAX_SAMPLES = 100;

const DISTRIBUTIONS = ['normal', 'uniform', 'zeros', 'ones'];

// ---------------------------------------------------------------------------
// Synthetic input creator
// ---------------------------------------------------------------------------

function SyntheticCreator({ onAdd, locked }) {
  const [name,         setName]         = useState('');
  const [nSamples,     setNSamples]     = useState(32);
  const [shapeStr,     setShapeStr]     = useState('128');
  const [batchSize,    setBatchSize]    = useState(32);
  const [distribution, setDistribution] = useState('normal');
  const [seed,         setSeed]         = useState(42);
  const [error,        setError]        = useState('');
  const [validating,   setValidating]   = useState(false);

  const handleAdd = async () => {
    setError('');
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required'); return; }

    let sample_shape;
    try {
      sample_shape = shapeStr.split(',').map(s => {
        const v = parseInt(s.trim(), 10);
        if (isNaN(v) || v < 1) throw new Error();
        return v;
      });
    } catch {
      setError('Invalid shape. Use comma-separated integers, e.g. 128 or 3,32,32');
      return;
    }

    setValidating(true);
    try {
      const result = await validateSyntheticSpec({
        name: trimmed,
        n_samples: nSamples,
        sample_shape,
        batch_size: batchSize,
        distribution,
        seed,
      });
      onAdd({ name: trimmed, n_samples: nSamples, sample_shape, batch_size: batchSize, distribution, seed }, result.validation_id);
      setName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 10, marginBottom: 8,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)', marginBottom: 8, letterSpacing: '0.1em' }}>
        + SYNTHETIC INPUT
      </div>

      {error && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)', marginBottom: 6 }}>
          ✗ {error}
        </div>
      )}

      <Row label="name">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. image" disabled={locked}
          style={{ width: '100%' }} />
      </Row>
      <Row label="n_samples">
        <input type="number" min={1} max={MAX_SAMPLES}
          value={nSamples} onChange={e => setNSamples(Math.min(MAX_SAMPLES, parseInt(e.target.value) || 1))}
          disabled={locked} style={{ width: '100%' }} />
      </Row>
      <Row label="sample_shape">
        <input value={shapeStr} onChange={e => setShapeStr(e.target.value)}
          placeholder="128 or 3,32,32" disabled={locked} style={{ width: '100%' }} />
      </Row>
      <Row label="batch_size">
        <input type="number" min={1} max={MAX_SAMPLES}
          value={batchSize} onChange={e => setBatchSize(Math.min(MAX_SAMPLES, parseInt(e.target.value) || 1))}
          disabled={locked} style={{ width: '100%' }} />
      </Row>
      <Row label="distribution">
        <select value={distribution} onChange={e => setDistribution(e.target.value)} disabled={locked}
          style={{ width: '100%' }}>
          {DISTRIBUTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </Row>
      <Row label="seed">
        <input type="number" value={seed} onChange={e => setSeed(parseInt(e.target.value) || 0)}
          disabled={locked} style={{ width: '100%' }} />
      </Row>

      <button
        onClick={handleAdd} disabled={locked || validating}
        style={{
          marginTop: 8, width: '100%', padding: '5px 0',
          background: 'var(--accent-faint)', border: '1px solid var(--accent-dim)',
          borderRadius: 'var(--radius-sm)', color: 'var(--accent)',
          fontFamily: 'var(--font-mono)', fontSize: 9, cursor: locked || validating ? 'default' : 'pointer',
          opacity: locked || validating ? 0.5 : 1,
        }}
      >
        {validating ? 'validating…' : '+ add'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload input creator
// ---------------------------------------------------------------------------

function UploadCreator({ onAdd, locked }) {
  const fileRef = useRef();
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');

    const trimmed = name.trim();
    if (!trimmed) { setError('Enter a name before uploading'); return; }

    setLoading(true);
    try {
      const info = await validateUploadedFile(trimmed, file);
      onAdd(trimmed, file, info.shape, info.n_samples, info.validation_id);
      setName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 10, marginBottom: 8,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--blue)', marginBottom: 8, letterSpacing: '0.1em' }}>
        + UPLOAD INPUT
      </div>

      {error && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)', marginBottom: 6 }}>
          ✗ {error}
        </div>
      )}

      <Row label="name">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. labels" disabled={locked || loading} style={{ width: '100%' }} />
      </Row>

      <button
        onClick={() => fileRef.current?.click()} disabled={locked || loading}
        style={{
          marginTop: 8, width: '100%', padding: '5px 0',
          background: 'rgba(0,153,255,0.06)', border: '1px solid var(--blue-dim)',
          borderRadius: 'var(--radius-sm)', color: 'var(--blue)',
          fontFamily: 'var(--font-mono)', fontSize: 9, cursor: locked ? 'default' : 'pointer',
        }}
      >
        {loading ? 'uploading…' : '↑ choose .npy / .csv (max 100 samples)'}
      </button>
      <input ref={fileRef} type="file" accept=".npy,.csv" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dataset entry row
// ---------------------------------------------------------------------------

function DatasetEntry({ entry, onRemove, locked }) {
  const isSynthetic = entry.kind === 'synthetic';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '7px 10px', marginBottom: 4,
      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
      border: `1px solid ${isSynthetic ? 'var(--border)' : 'var(--blue-dim)'}`,
      gap: 8,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-primary)', marginBottom: 2 }}>
          {entry.name}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
          {isSynthetic
            ? `synthetic · ${entry.n_samples}×[${entry.sample_shape.join(',')}] · ${entry.distribution}`
            : `upload · ${entry.n_samples} samples · [${entry.shape?.join(',') ?? '?'}]`
          }
        </div>
      </div>
      {!locked && (
        <button
          onClick={async () => await onRemove(entry.id)}
          style={{
            flexShrink: 0, width: 16, height: 16,
            border: '1px solid var(--border)', borderRadius: 2,
            color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DatasetConfig component
// ---------------------------------------------------------------------------

export default function DatasetConfig() {
  const {
    dataset, datasetMode, setDatasetMode,
    addSyntheticInput, addUploadedInput, removeDatasetEntry,
    runMode,
  } = useGraphStore();
  const locked = runMode !== 'idle';

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>

      <SectionLabel>Dataset Inputs</SectionLabel>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
        Choose ONE method per run. Max 100 samples per input.
      </div>

      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.5 : 1 }}>
          <input
            type="radio"
            checked={datasetMode === 'synthetic'}
            onChange={() => setDatasetMode('synthetic')}
            disabled={locked}
            style={{ cursor: locked ? 'default' : 'pointer' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>Synthetic</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.5 : 1 }}>
          <input
            type="radio"
            checked={datasetMode === 'upload'}
            onChange={() => setDatasetMode('upload')}
            disabled={locked}
            style={{ cursor: locked ? 'default' : 'pointer' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--blue)' }}>Upload</span>
        </label>
      </div>

      {/* Existing entries */}
      {dataset.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {dataset.map(entry => (
            <DatasetEntry
              key={entry.id}
              entry={entry}
              onRemove={removeDatasetEntry}
              locked={locked}
            />
          ))}
        </div>
      )}

      {/* Creators — show only selected mode, hidden during run */}
      {!locked && datasetMode === 'synthetic' && (
        <SyntheticCreator
          onAdd={(spec, validation_id) => addSyntheticInput(spec, validation_id)}
          locked={locked}
        />
      )}
      {!locked && datasetMode === 'upload' && (
        <UploadCreator
          onAdd={(name, file, shape, n, validation_id) => addUploadedInput(name, file, shape, n, validation_id)}
          locked={locked}
        />
      )}
      {!locked && !datasetMode && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          Select Synthetic or Upload to begin.
        </div>
      )}

      {locked && dataset.length === 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 20 }}>
          No inputs configured.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', minWidth: 72, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 9,
      color: 'var(--text-muted)', textTransform: 'uppercase',
      letterSpacing: '0.12em', marginBottom: 6,
    }}>
      {children}
    </div>
  );
}