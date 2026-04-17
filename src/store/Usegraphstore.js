<<<<<<< HEAD
<<<<<<< HEAD
/**
 * Usegraphstore.js
 *
 * Terminology
 * -----------
 * Everything on the canvas is a "component".
 *   kind='layer'  → rect card  (inputlayer, linear, relu, layernorm, …)
 *   kind='node'   → circle     (add, sub, mul, div, …)
 *
 * data.type  — 'inputlayer' | 'linear' | 'relu' | 'add' | …  (lowercase)
 * data.kind  — 'layer' | 'node'
 *
 * React Flow renderer keys:
 *   'component'     → rect card
 *   'nodeComponent' → circle
 *
 * Views
 * -----
 *   'network'   — graph canvas + 300px component detail panel
 *   'overview'  — graph canvas + 520px cross-layer dashboard
 *   'layer'     — graph canvas + 380px per-layer deep metrics
 *   'epoch'     — graph canvas + 560px cross-epoch trends + anomaly heatmap
 *   'step'      — graph canvas + 300px step controls
 *
 * Metric storage
 * --------------
 * runMetrics.epochs[epoch][nodeId] = {
 *   output_shape:    [N, D],
 *   activation_mean: { mean, std, min, max, count },
 *   activation_std:  { mean, std, min, max, count },
 *   grad_in_norm:    { mean, std, min, max, count },
 *   grad_in_std:     { mean, std, min, max, count },
 * }
 * runMetrics.anomalies[epoch][nodeId] = [
 *   { kind, severity, frequency, sample_value }
 * ]
 *
 * data.health on each node is kept light — just 'ok' | 'warn' | 'crit' | null
 * so canvas nodes can show a health indicator without reading runMetrics.
 */

import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { deleteDatasetValidation } from '../api/api';

// ---------------------------------------------------------------------------
// Default type registries
// ---------------------------------------------------------------------------

const DEFAULT_LAYER_TYPES = {
  inputlayer: { label: 'Input Layer', fields: [], entry: true },
  linear:     { label: 'Linear',      fields: [
    { name: 'in_features',  type: 'int', min: 1, default: 128 },
    { name: 'out_features', type: 'int', min: 1, default: 64  },
  ]},
  relu:       { label: 'ReLU',      fields: [] },
  layernorm:  { label: 'LayerNorm', fields: [
    { name: 'in_features', type: 'int',   min: 1, default: 64   },
    { name: 'eps',         type: 'float',         default: 1e-5  },
  ]},
};

const DEFAULT_NODE_TYPES = {
  add:    { label: 'Add',    symbol: '+',   fields: [{ name: 'axis', type: 'int_or_null', default: null }], inputs: 'N' },
  sub:    { label: 'Sub',    symbol: '−',   fields: [], inputs: 2 },
  mul:    { label: 'Mul',    symbol: '×',   fields: [], inputs: 'N' },
  div:    { label: 'Div',    symbol: '÷',   fields: [], inputs: 2 },
  sq:     { label: 'Sq',     symbol: 'x²',  fields: [], inputs: 1 },
  neg:    { label: 'Neg',    symbol: '−x',  fields: [], inputs: 1 },
  sqrt:   { label: 'Sqrt',   symbol: '√',   fields: [], inputs: 1 },
  scale:  { label: 'Scale',  symbol: '·α',  fields: [{ name: 'scalar',   type: 'float', default: 1.0  }], inputs: 1 },
  clip:   { label: 'Clip',   symbol: '[ ]', fields: [{ name: 'min_val',  type: 'float', default: -1.0 }, { name: 'max_val', type: 'float', default: 1.0 }], inputs: 1 },
  concat: { label: 'Concat', symbol: '⊕',   fields: [{ name: 'axis',     type: 'int',   default: 1    }], inputs: 'N' },
  split:  { label: 'Split',  symbol: '⊘',   fields: [{ name: 'n_splits', type: 'int',   default: 2    }, { name: 'axis', type: 'int', default: 1 }], inputs: 1 },
};

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _nodeCounter = 0;
function newNodeId() { return `${++_nodeCounter}`; }
let _nameCounter = 0;
function newUniqueName(type) { return `${type}_${++_nameCounter}`; }

function _freshPortLabel(existing) {
  let i = existing.length;
  let c = `port_${i}`;
  const s = new Set(existing);
  while (s.has(c)) { i++; c = `port_${i}`; }
  return c;
}

// ---------------------------------------------------------------------------
// Empty runMetrics shape
// ---------------------------------------------------------------------------

function emptyRunMetrics() {
  return {
    run_id:        null,
    n_epochs:      0,
    n_batches:     0,
    total_samples: 0,
    // epochs[epochIdx][nodeId] = { output_shape, activation_mean, ... }
    epochs:    {},
    // anomalies[epochIdx][nodeId] = [ { kind, severity, frequency, sample_value } ]
    anomalies: {},
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGraphStore = create((set, get) => ({

  // ── Graph ──────────────────────────────────────────────────────────────
  nodes: [],
  edges: [],

  onNodesChange: changes => set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: changes => set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect:     conn    => set(s => ({ edges: addEdge({ ...conn, animated: false }, s.edges) })),

  // -- Add layer (rect card) ------------------------------------------------
  addLayer: (type, position = { x: 200, y: 200 }) => {
    const id      = newNodeId();
    const typeDef = get().layerTypes[type] ?? DEFAULT_LAYER_TYPES[type] ?? { fields: [] };
    const config  = Object.fromEntries((typeDef.fields ?? []).map(f => [f.name, f.default ?? '']));
    const isInput = type === 'inputlayer';
    set(s => ({
      nodes: [...s.nodes, {
        id, type: 'component', position,
        data: {
          kind: 'layer', type, config,
          ...(isInput ? { name: 'input', ports: ['port_0'] } : {}),
          status: 'idle', health: null, metrics: null, warnings: [],
        },
      }],
    }));
    return id;
  },

  // -- Add op node (circle) -------------------------------------------------
  addNode: (type, position = { x: 300, y: 300 }) => {
    const id      = newNodeId();
    const typeDef = get().nodeTypes[type] ?? DEFAULT_NODE_TYPES[type] ?? { fields: [] };
    const config  = Object.fromEntries((typeDef.fields ?? []).map(f => [f.name, f.default ?? '']));
    set(s => ({
      nodes: [...s.nodes, {
        id, type: 'nodeComponent', position,
        data: { kind: 'node', type, config, status: 'idle', health: null, metrics: null, warnings: [] },
      }],
    }));
    return id;
  },

  // -- InputLayer port management -------------------------------------------
  addInputPort: nodeId =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur = n.data.ports ?? [];
      return { ...n, data: { ...n.data, ports: [...cur, _freshPortLabel(cur)] } };
    })})),

  removeInputPort: (nodeId, idx) =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur = n.data.ports ?? [];
      if (cur.length <= 1) return n;
      return { ...n, data: { ...n.data, ports: cur.filter((_, i) => i !== idx) } };
    })})),

  updateInputPortLabel: (nodeId, idx, label) =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur   = [...(n.data.ports ?? [])];
      if (cur.some((l, i) => i !== idx && l === label) || !label.trim()) return n;
      cur[idx] = label.trim();
      return { ...n, data: { ...n.data, ports: cur } };
    })})),

  updateComponentName: (nodeId, name) =>
    set(s => ({ nodes: s.nodes.map(n =>
      n.id !== nodeId ? n : { ...n, data: { ...n.data, name } }
    )})),

  // -- Generic component ops ------------------------------------------------
  updateComponentConfig: (id, field, value) =>
    set(s => ({ nodes: s.nodes.map(n =>
      n.id !== id ? n : { ...n, data: { ...n.data, config: { ...n.data.config, [field]: value } } }
    )})),

  setComponentStatus:   (id, status)   => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, status   } }) })),
  setComponentHealth:   (id, health)   => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, health   } }) })),
  setComponentMetrics:  (id, metrics)  => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, metrics  } }) })),
  setComponentWarnings: (id, warnings) => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, warnings } }) })),
  setAllStatuses:  status => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, status  } })) })),
  setAllHealths:   health => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, health  } })) })),
  resetMetrics:    ()     => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, metrics: null, status: 'idle', health: null } })) })),

  loadGraph: graph => {
    if (!graph?.nodes || !graph?.edges) return;
    // Update the global node counter to avoid ID conflicts
    const maxId = Math.max(0, ...graph.nodes.map(n => parseInt(n.id) || 0));
    _nodeCounter = Math.max(_nodeCounter, maxId);
    set({ nodes: graph.nodes, edges: graph.edges });
  },

  clearGraph: () => set({ nodes: [], edges: [], buildId: null, buildValid: false }),

  // ── Selection ──────────────────────────────────────────────────────────
  selectedId: null,
  setSelected: id => set({ selectedId: id }),

  // ── Layout ─────────────────────────────────────────────────────────────
  layoutDirection: 'LR',
  toggleLayout: () => set(s => ({ layoutDirection: s.layoutDirection === 'LR' ? 'TB' : 'LR' })),

  // ── View ───────────────────────────────────────────────────────────────
  // 'network' | 'overview' | 'layer' | 'epoch' | 'step'
  activeView: 'network',
  setActiveView: view => set({ activeView: view }),

  // ── Build state ─────────────────────────────────────────────────────────
  buildId:    null,
  buildValid: false,
  setBuild:        (id, valid) => set({ buildId: id, buildValid: valid }),
  invalidateBuild: ()          => set({ buildId: null, buildValid: false }),

  // ── Run state ──────────────────────────────────────────────────────────
  runMode:           'idle',   // 'idle'|'running'|'stepping'|'connecting'|'done'|'error'
  stepPhase:         'forward',
  currentStepId:     null,
  pendingBranches:   [],
  completedBranches: [],
  stepSession:       null,

  // Run progress (for live progress bar during full run)
  runProgress: { epoch: 0, batch: 0, n_epochs: 1, n_batches: 0 },

  setRunMode:           mode    => set({ runMode: mode }),
  setStepPhase:         phase   => set({ stepPhase: phase }),
  setCurrentStep:       id      => set({ currentStepId: id }),
  setPendingBranches:   bs      => set({ pendingBranches: bs }),
  setCompletedBranches: bs      => set({ completedBranches: bs }),
  setStepSession:       session => set({ stepSession: session }),
  setRunProgress: progress =>
    set(s => ({ runProgress: { ...s.runProgress, ...progress } })),

  // ── Run config ─────────────────────────────────────────────────────────
  runConfig: {
    run_id:    0,
    n_epochs:  1,
    observers: ['SignalStatsObserver'],
  },
  setRunConfig: cfg => set(s => ({ runConfig: { ...s.runConfig, ...cfg } })),

  // ── Run Metrics ────────────────────────────────────────────────────────
  // Full multi-epoch stats — NOT stored on individual nodes.
  // Shape: see emptyRunMetrics() above.
  runMetrics:    emptyRunMetrics(),
  selectedEpoch: 0,

  setSelectedEpoch: epoch => set({ selectedEpoch: epoch }),

  // Called when an epoch_done event arrives from the WebSocket.
  // snapshot = { nodeId: { output_shape, activation_mean, activation_std,
  //                         grad_in_norm, grad_in_std }, ... }
  // anomalies = { nodeId: [ { kind, severity, frequency, sample_value } ], ... }
  receiveEpochSnapshot: (epoch, snapshot, anomalies) =>
    set(s => {
      const rm = s.runMetrics;
      const newEpochs    = { ...rm.epochs,    [epoch]: snapshot  };
      const newAnomalies = { ...rm.anomalies, [epoch]: anomalies };

      // Derive per-node health from worst anomaly in this epoch
      const healthUpdates = {};
      const allNodes = Object.keys(snapshot);
      allNodes.forEach(nodeId => {
        const layerAnomalies = (anomalies[nodeId] ?? []);
        if (layerAnomalies.some(a => a.severity === 'critical')) {
          healthUpdates[nodeId] = 'crit';
        } else if (layerAnomalies.some(a => a.severity === 'warning')) {
          healthUpdates[nodeId] = 'warn';
        } else {
          healthUpdates[nodeId] = 'ok';
        }
      });

      const nodes = s.nodes.map(n =>
        healthUpdates[n.id] !== undefined
          ? { ...n, data: { ...n.data, health: healthUpdates[n.id] } }
          : n
      );

      return {
        nodes,
        selectedEpoch: epoch,
        runMetrics: { ...rm, epochs: newEpochs, anomalies: newAnomalies, n_epochs: epoch + 1 },
      };
    }),

  // Called when run_started arrives — set metadata.
  initRunMetrics: (runId, nEpochs, nBatches, totalSamples) =>
    set({
      runMetrics: { ...emptyRunMetrics(), run_id: runId, n_epochs: nEpochs, n_batches: nBatches, total_samples: totalSamples },
      runProgress: { epoch: 0, batch: 0, n_epochs: nEpochs, n_batches: nBatches },
    }),

  clearRunMetrics: () => set({ runMetrics: emptyRunMetrics(), selectedEpoch: 0 }),

  // ── Dataset ────────────────────────────────────────────────────────────
  dataset:     [],
  datasetMode: null,
  setDatasetMode: mode => set({ datasetMode: mode, dataset: [] }),

  addSyntheticInput: (spec, validation_id) =>
    set(s => ({ dataset: [...s.dataset, {
      id: `ds_${Date.now()}`, kind: 'synthetic', validation_id,
      name: spec.name || `input_${s.dataset.length}`,
      n_samples: Math.min(spec.n_samples ?? 32, 100),
      sample_shape: spec.sample_shape ?? [128],
      batch_size:   spec.batch_size   ?? 32,
      distribution: spec.distribution ?? 'normal',
      seed:         spec.seed         ?? 42,
    }]})),

  addUploadedInput: (name, file, shape, n_samples, validation_id) =>
    set(s => ({ dataset: [...s.dataset, {
      id: `ds_${Date.now()}`, kind: 'upload', validation_id, name, file, shape, n_samples,
    }]})),

  removeDatasetEntry: async (id) => {
    const entry = get().dataset.find(d => d.id === id);
    if (entry?.validation_id) {
      try { await deleteDatasetValidation(entry.validation_id); }
      catch (e) { console.error('Failed to delete validation:', e); }
    }
    set(s => ({ dataset: s.dataset.filter(d => d.id !== id) }));
  },

  updateDatasetEntry: (id, changes) =>
    set(s => ({ dataset: s.dataset.map(d => d.id !== id ? d : { ...d, ...changes }) })),

  clearDataset: () => set({ dataset: [], datasetMode: null }),

  // ── Type registries ────────────────────────────────────────────────────
  layerTypes: DEFAULT_LAYER_TYPES,
  nodeTypes:  DEFAULT_NODE_TYPES,
  setLayerTypes: t => set({ layerTypes: { ...DEFAULT_LAYER_TYPES, ...t } }),
  setNodeTypes:  t => set({ nodeTypes:  { ...DEFAULT_NODE_TYPES,  ...t } }),
=======
/**
 * Usegraphstore.js
 *
 * Terminology
 * -----------
 * Everything on the canvas is a "component".
 *   kind='layer'  → rect card  (inputlayer, linear, relu, layernorm, …)
 *   kind='node'   → circle     (add, sub, mul, div, …)
 *
 * data.type  — 'inputlayer' | 'linear' | 'relu' | 'add' | …  (lowercase)
 * data.kind  — 'layer' | 'node'
 *
 * React Flow renderer keys:
 *   'component'     → rect card
 *   'nodeComponent' → circle
 *
 * Views
 * -----
 *   'network'   — graph canvas + 300px component detail panel
 *   'overview'  — graph canvas + 520px cross-layer dashboard
 *   'layer'     — graph canvas + 380px per-layer deep metrics
 *   'epoch'     — graph canvas + 560px cross-epoch trends + anomaly heatmap
 *   'step'      — graph canvas + 300px step controls
 *
 * Metric storage
 * --------------
 * runMetrics.epochs[epoch][nodeId] = {
 *   output_shape:    [N, D],
 *   activation_mean: { mean, std, min, max, count },
 *   activation_std:  { mean, std, min, max, count },
 *   grad_in_norm:    { mean, std, min, max, count },
 *   grad_in_std:     { mean, std, min, max, count },
 * }
 * runMetrics.anomalies[epoch][nodeId] = [
 *   { kind, severity, frequency, sample_value }
 * ]
 *
 * data.health on each node is kept light — just 'ok' | 'warn' | 'crit' | null
 * so canvas nodes can show a health indicator without reading runMetrics.
 */

import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { deleteDatasetValidation } from '../api/api';

// ---------------------------------------------------------------------------
// Default type registries
// ---------------------------------------------------------------------------

const DEFAULT_LAYER_TYPES = {
  inputlayer: { label: 'Input Layer', fields: [], entry: true },
  linear:     { label: 'Linear',      fields: [
    { name: 'in_features',  type: 'int', min: 1, default: 128 },
    { name: 'out_features', type: 'int', min: 1, default: 64  },
  ]},
  relu:       { label: 'ReLU',      fields: [] },
  layernorm:  { label: 'LayerNorm', fields: [
    { name: 'in_features', type: 'int',   min: 1, default: 64   },
    { name: 'eps',         type: 'float',         default: 1e-5  },
  ]},
};

const DEFAULT_NODE_TYPES = {
  add:    { label: 'Add',    symbol: '+',   fields: [{ name: 'axis', type: 'int_or_null', default: null }], inputs: 'N' },
  sub:    { label: 'Sub',    symbol: '−',   fields: [], inputs: 2 },
  mul:    { label: 'Mul',    symbol: '×',   fields: [], inputs: 'N' },
  div:    { label: 'Div',    symbol: '÷',   fields: [], inputs: 2 },
  sq:     { label: 'Sq',     symbol: 'x²',  fields: [], inputs: 1 },
  neg:    { label: 'Neg',    symbol: '−x',  fields: [], inputs: 1 },
  sqrt:   { label: 'Sqrt',   symbol: '√',   fields: [], inputs: 1 },
  scale:  { label: 'Scale',  symbol: '·α',  fields: [{ name: 'scalar',   type: 'float', default: 1.0  }], inputs: 1 },
  clip:   { label: 'Clip',   symbol: '[ ]', fields: [{ name: 'min_val',  type: 'float', default: -1.0 }, { name: 'max_val', type: 'float', default: 1.0 }], inputs: 1 },
  concat: { label: 'Concat', symbol: '⊕',   fields: [{ name: 'axis',     type: 'int',   default: 1    }], inputs: 'N' },
  split:  { label: 'Split',  symbol: '⊘',   fields: [{ name: 'n_splits', type: 'int',   default: 2    }, { name: 'axis', type: 'int', default: 1 }], inputs: 1 },
};

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _nodeCounter = 0;
function newNodeId() { return `${++_nodeCounter}`; }
let _nameCounter = 0;
function newUniqueName(type) { return `${type}_${++_nameCounter}`; }

function _freshPortLabel(existing) {
  let i = existing.length;
  let c = `port_${i}`;
  const s = new Set(existing);
  while (s.has(c)) { i++; c = `port_${i}`; }
  return c;
}

// ---------------------------------------------------------------------------
// Empty runMetrics shape
// ---------------------------------------------------------------------------

function emptyRunMetrics() {
  return {
    run_id:        null,
    n_epochs:      0,
    n_batches:     0,
    total_samples: 0,
    // epochs[epochIdx][nodeId] = { output_shape, activation_mean, ... }
    epochs:    {},
    // anomalies[epochIdx][nodeId] = [ { kind, severity, frequency, sample_value } ]
    anomalies: {},
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGraphStore = create((set, get) => ({

  // ── Graph ──────────────────────────────────────────────────────────────
  nodes: [],
  edges: [],

  onNodesChange: changes => set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: changes => set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect:     conn    => set(s => ({ edges: addEdge({ ...conn, animated: false }, s.edges) })),

  // -- Add layer (rect card) ------------------------------------------------
  addLayer: (type, position = { x: 200, y: 200 }) => {
    const id      = newNodeId();
    const typeDef = get().layerTypes[type] ?? DEFAULT_LAYER_TYPES[type] ?? { fields: [] };
    const config  = Object.fromEntries((typeDef.fields ?? []).map(f => [f.name, f.default ?? '']));
    const isInput = type === 'inputlayer';
    set(s => ({
      nodes: [...s.nodes, {
        id, type: 'component', position,
        data: {
          kind: 'layer', type, config,
          ...(isInput ? { name: 'input', ports: ['port_0'] } : {}),
          status: 'idle', health: null, metrics: null, warnings: [],
        },
      }],
    }));
    return id;
  },

  // -- Add op node (circle) -------------------------------------------------
  addNode: (type, position = { x: 300, y: 300 }) => {
    const id      = newNodeId();
    const typeDef = get().nodeTypes[type] ?? DEFAULT_NODE_TYPES[type] ?? { fields: [] };
    const config  = Object.fromEntries((typeDef.fields ?? []).map(f => [f.name, f.default ?? '']));
    set(s => ({
      nodes: [...s.nodes, {
        id, type: 'nodeComponent', position,
        data: { kind: 'node', type, config, status: 'idle', health: null, metrics: null, warnings: [] },
      }],
    }));
    return id;
  },

  // -- InputLayer port management -------------------------------------------
  addInputPort: nodeId =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur = n.data.ports ?? [];
      return { ...n, data: { ...n.data, ports: [...cur, _freshPortLabel(cur)] } };
    })})),

  removeInputPort: (nodeId, idx) =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur = n.data.ports ?? [];
      if (cur.length <= 1) return n;
      return { ...n, data: { ...n.data, ports: cur.filter((_, i) => i !== idx) } };
    })})),

  updateInputPortLabel: (nodeId, idx, label) =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur   = [...(n.data.ports ?? [])];
      if (cur.some((l, i) => i !== idx && l === label) || !label.trim()) return n;
      cur[idx] = label.trim();
      return { ...n, data: { ...n.data, ports: cur } };
    })})),

  updateComponentName: (nodeId, name) =>
    set(s => ({ nodes: s.nodes.map(n =>
      n.id !== nodeId ? n : { ...n, data: { ...n.data, name } }
    )})),

  // -- Generic component ops ------------------------------------------------
  updateComponentConfig: (id, field, value) =>
    set(s => ({ nodes: s.nodes.map(n =>
      n.id !== id ? n : { ...n, data: { ...n.data, config: { ...n.data.config, [field]: value } } }
    )})),

  setComponentStatus:   (id, status)   => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, status   } }) })),
  setComponentHealth:   (id, health)   => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, health   } }) })),
  setComponentMetrics:  (id, metrics)  => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, metrics  } }) })),
  setComponentWarnings: (id, warnings) => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, warnings } }) })),
  setAllStatuses:  status => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, status  } })) })),
  setAllHealths:   health => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, health  } })) })),
  resetMetrics:    ()     => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, metrics: null, status: 'idle', health: null } })) })),

  loadGraph: graph => {
    if (!graph?.nodes || !graph?.edges) return;
    // Update the global node counter to avoid ID conflicts
    const maxId = Math.max(0, ...graph.nodes.map(n => parseInt(n.id) || 0));
    _nodeCounter = Math.max(_nodeCounter, maxId);
    set({ nodes: graph.nodes, edges: graph.edges });
  },

  clearGraph: () => set({ nodes: [], edges: [], buildId: null, buildValid: false }),

  // ── Selection ──────────────────────────────────────────────────────────
  selectedId: null,
  setSelected: id => set({ selectedId: id }),

  // ── Layout ─────────────────────────────────────────────────────────────
  layoutDirection: 'LR',
  toggleLayout: () => set(s => ({ layoutDirection: s.layoutDirection === 'LR' ? 'TB' : 'LR' })),

  // ── View ───────────────────────────────────────────────────────────────
  // 'network' | 'overview' | 'layer' | 'epoch' | 'step'
  activeView: 'network',
  setActiveView: view => set({ activeView: view }),

  // ── Build state ─────────────────────────────────────────────────────────
  buildId:    null,
  buildValid: false,
  setBuild:        (id, valid) => set({ buildId: id, buildValid: valid }),
  invalidateBuild: ()          => set({ buildId: null, buildValid: false }),

  // ── Run state ──────────────────────────────────────────────────────────
  runMode:           'idle',   // 'idle'|'running'|'stepping'|'connecting'|'done'|'error'
  stepPhase:         'forward',
  currentStepId:     null,
  pendingBranches:   [],
  completedBranches: [],
  stepSession:       null,

  // Run progress (for live progress bar during full run)
  runProgress: { epoch: 0, batch: 0, n_epochs: 1, n_batches: 0 },

  setRunMode:           mode    => set({ runMode: mode }),
  setStepPhase:         phase   => set({ stepPhase: phase }),
  setCurrentStep:       id      => set({ currentStepId: id }),
  setPendingBranches:   bs      => set({ pendingBranches: bs }),
  setCompletedBranches: bs      => set({ completedBranches: bs }),
  setStepSession:       session => set({ stepSession: session }),
  setRunProgress: progress =>
    set(s => ({ runProgress: { ...s.runProgress, ...progress } })),

  // ── Run config ─────────────────────────────────────────────────────────
  runConfig: {
    run_id:    0,
    n_epochs:  1,
    observers: ['SignalStatsObserver'],
  },
  setRunConfig: cfg => set(s => ({ runConfig: { ...s.runConfig, ...cfg } })),

  // ── Run Metrics ────────────────────────────────────────────────────────
  // Full multi-epoch stats — NOT stored on individual nodes.
  // Shape: see emptyRunMetrics() above.
  runMetrics:    emptyRunMetrics(),
  selectedEpoch: 0,

  setSelectedEpoch: epoch => set({ selectedEpoch: epoch }),

  // Called when an epoch_done event arrives from the WebSocket.
  // snapshot = { nodeId: { output_shape, activation_mean, activation_std,
  //                         grad_in_norm, grad_in_std }, ... }
  // anomalies = { nodeId: [ { kind, severity, frequency, sample_value } ], ... }
  receiveEpochSnapshot: (epoch, snapshot, anomalies) =>
    set(s => {
      const rm = s.runMetrics;
      const newEpochs    = { ...rm.epochs,    [epoch]: snapshot  };
      const newAnomalies = { ...rm.anomalies, [epoch]: anomalies };

      // Derive per-node health from worst anomaly in this epoch
      const healthUpdates = {};
      const allNodes = Object.keys(snapshot);
      allNodes.forEach(nodeId => {
        const layerAnomalies = (anomalies[nodeId] ?? []);
        if (layerAnomalies.some(a => a.severity === 'critical')) {
          healthUpdates[nodeId] = 'crit';
        } else if (layerAnomalies.some(a => a.severity === 'warning')) {
          healthUpdates[nodeId] = 'warn';
        } else {
          healthUpdates[nodeId] = 'ok';
        }
      });

      const nodes = s.nodes.map(n =>
        healthUpdates[n.id] !== undefined
          ? { ...n, data: { ...n.data, health: healthUpdates[n.id] } }
          : n
      );

      return {
        nodes,
        selectedEpoch: epoch,
        runMetrics: { ...rm, epochs: newEpochs, anomalies: newAnomalies, n_epochs: epoch + 1 },
      };
    }),

  // Called when run_started arrives — set metadata.
  initRunMetrics: (runId, nEpochs, nBatches, totalSamples) =>
    set({
      runMetrics: { ...emptyRunMetrics(), run_id: runId, n_epochs: nEpochs, n_batches: nBatches, total_samples: totalSamples },
      runProgress: { epoch: 0, batch: 0, n_epochs: nEpochs, n_batches: nBatches },
    }),

  clearRunMetrics: () => set({ runMetrics: emptyRunMetrics(), selectedEpoch: 0 }),

  // ── Dataset ────────────────────────────────────────────────────────────
  dataset:     [],
  datasetMode: null,
  setDatasetMode: mode => set({ datasetMode: mode, dataset: [] }),

  addSyntheticInput: (spec, validation_id) =>
    set(s => ({ dataset: [...s.dataset, {
      id: `ds_${Date.now()}`, kind: 'synthetic', validation_id,
      name: spec.name || `input_${s.dataset.length}`,
      n_samples: Math.min(spec.n_samples ?? 32, 100),
      sample_shape: spec.sample_shape ?? [128],
      batch_size:   spec.batch_size   ?? 32,
      distribution: spec.distribution ?? 'normal',
      seed:         spec.seed         ?? 42,
    }]})),

  addUploadedInput: (name, file, shape, n_samples, validation_id) =>
    set(s => ({ dataset: [...s.dataset, {
      id: `ds_${Date.now()}`, kind: 'upload', validation_id, name, file, shape, n_samples,
    }]})),

  removeDatasetEntry: async (id) => {
    const entry = get().dataset.find(d => d.id === id);
    if (entry?.validation_id) {
      try { await deleteDatasetValidation(entry.validation_id); }
      catch (e) { console.error('Failed to delete validation:', e); }
    }
    set(s => ({ dataset: s.dataset.filter(d => d.id !== id) }));
  },

  updateDatasetEntry: (id, changes) =>
    set(s => ({ dataset: s.dataset.map(d => d.id !== id ? d : { ...d, ...changes }) })),

  clearDataset: () => set({ dataset: [], datasetMode: null }),

  // ── Type registries ────────────────────────────────────────────────────
  layerTypes: DEFAULT_LAYER_TYPES,
  nodeTypes:  DEFAULT_NODE_TYPES,
  setLayerTypes: t => set({ layerTypes: { ...DEFAULT_LAYER_TYPES, ...t } }),
  setNodeTypes:  t => set({ nodeTypes:  { ...DEFAULT_NODE_TYPES,  ...t } }),
>>>>>>> 3b424f8 (feat: sync package files for cloudflare)
=======
/**
 * Usegraphstore.js
 *
 * Terminology
 * -----------
 * Everything on the canvas is a "component".
 *   kind='layer'  → rect card  (inputlayer, linear, relu, layernorm, …)
 *   kind='node'   → circle     (add, sub, mul, div, …)
 *
 * data.type  — 'inputlayer' | 'linear' | 'relu' | 'add' | …  (lowercase)
 * data.kind  — 'layer' | 'node'
 *
 * React Flow renderer keys:
 *   'component'     → rect card
 *   'nodeComponent' → circle
 *
 * Views
 * -----
 *   'network'   — graph canvas + 300px component detail panel
 *   'overview'  — graph canvas + 520px cross-layer dashboard
 *   'layer'     — graph canvas + 380px per-layer deep metrics
 *   'epoch'     — graph canvas + 560px cross-epoch trends + anomaly heatmap
 *   'step'      — graph canvas + 300px step controls
 *
 * Metric storage
 * --------------
 * runMetrics.epochs[epoch][nodeId] = {
 *   output_shape:    [N, D],
 *   activation_mean: { mean, std, min, max, count },
 *   activation_std:  { mean, std, min, max, count },
 *   grad_in_norm:    { mean, std, min, max, count },
 *   grad_in_std:     { mean, std, min, max, count },
 * }
 * runMetrics.anomalies[epoch][nodeId] = [
 *   { kind, severity, frequency, sample_value }
 * ]
 *
 * data.health on each node is kept light — just 'ok' | 'warn' | 'crit' | null
 * so canvas nodes can show a health indicator without reading runMetrics.
 */

import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { deleteDatasetValidation } from '../api/api';

// ---------------------------------------------------------------------------
// Default type registries
// ---------------------------------------------------------------------------

const DEFAULT_LAYER_TYPES = {
  inputlayer: { label: 'Input Layer', fields: [], entry: true },
  linear:     { label: 'Linear',      fields: [
    { name: 'in_features',  type: 'int', min: 1, default: 128 },
    { name: 'out_features', type: 'int', min: 1, default: 64  },
  ]},
  relu:       { label: 'ReLU',      fields: [] },
  layernorm:  { label: 'LayerNorm', fields: [
    { name: 'in_features', type: 'int',   min: 1, default: 64   },
    { name: 'eps',         type: 'float',         default: 1e-5  },
  ]},
};

const DEFAULT_NODE_TYPES = {
  add:    { label: 'Add',    symbol: '+',   fields: [{ name: 'axis', type: 'int_or_null', default: null }], inputs: 'N' },
  sub:    { label: 'Sub',    symbol: '−',   fields: [], inputs: 2 },
  mul:    { label: 'Mul',    symbol: '×',   fields: [], inputs: 'N' },
  div:    { label: 'Div',    symbol: '÷',   fields: [], inputs: 2 },
  sq:     { label: 'Sq',     symbol: 'x²',  fields: [], inputs: 1 },
  neg:    { label: 'Neg',    symbol: '−x',  fields: [], inputs: 1 },
  sqrt:   { label: 'Sqrt',   symbol: '√',   fields: [], inputs: 1 },
  scale:  { label: 'Scale',  symbol: '·α',  fields: [{ name: 'scalar',   type: 'float', default: 1.0  }], inputs: 1 },
  clip:   { label: 'Clip',   symbol: '[ ]', fields: [{ name: 'min_val',  type: 'float', default: -1.0 }, { name: 'max_val', type: 'float', default: 1.0 }], inputs: 1 },
  concat: { label: 'Concat', symbol: '⊕',   fields: [{ name: 'axis',     type: 'int',   default: 1    }], inputs: 'N' },
  split:  { label: 'Split',  symbol: '⊘',   fields: [{ name: 'n_splits', type: 'int',   default: 2    }, { name: 'axis', type: 'int', default: 1 }], inputs: 1 },
};

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _nodeCounter = 0;
function newNodeId() { return `${++_nodeCounter}`; }
let _nameCounter = 0;
function newUniqueName(type) { return `${type}_${++_nameCounter}`; }

function _freshPortLabel(existing) {
  let i = existing.length;
  let c = `port_${i}`;
  const s = new Set(existing);
  while (s.has(c)) { i++; c = `port_${i}`; }
  return c;
}

// ---------------------------------------------------------------------------
// Empty runMetrics shape
// ---------------------------------------------------------------------------

function emptyRunMetrics() {
  return {
    run_id:        null,
    n_epochs:      0,
    n_batches:     0,
    total_samples: 0,
    // epochs[epochIdx][nodeId] = { output_shape, activation_mean, ... }
    epochs:    {},
    // anomalies[epochIdx][nodeId] = [ { kind, severity, frequency, sample_value } ]
    anomalies: {},
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGraphStore = create((set, get) => ({

  // ── Graph ──────────────────────────────────────────────────────────────
  nodes: [],
  edges: [],

  onNodesChange: changes => set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: changes => set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect:     conn    => set(s => ({ edges: addEdge({ ...conn, animated: false }, s.edges) })),

  // -- Add layer (rect card) ------------------------------------------------
  addLayer: (type, position = { x: 200, y: 200 }) => {
    const id      = newNodeId();
    const typeDef = get().layerTypes[type] ?? DEFAULT_LAYER_TYPES[type] ?? { fields: [] };
    const config  = Object.fromEntries((typeDef.fields ?? []).map(f => [f.name, f.default ?? '']));
    const isInput = type === 'inputlayer';
    set(s => ({
      nodes: [...s.nodes, {
        id, type: 'component', position,
        data: {
          kind: 'layer', type, config,
          ...(isInput ? { name: 'input', ports: ['port_0'] } : {}),
          status: 'idle', health: null, metrics: null, warnings: [],
        },
      }],
    }));
    return id;
  },

  // -- Add op node (circle) -------------------------------------------------
  addNode: (type, position = { x: 300, y: 300 }) => {
    const id      = newNodeId();
    const typeDef = get().nodeTypes[type] ?? DEFAULT_NODE_TYPES[type] ?? { fields: [] };
    const config  = Object.fromEntries((typeDef.fields ?? []).map(f => [f.name, f.default ?? '']));
    set(s => ({
      nodes: [...s.nodes, {
        id, type: 'nodeComponent', position,
        data: { kind: 'node', type, config, status: 'idle', health: null, metrics: null, warnings: [] },
      }],
    }));
    return id;
  },

  // -- InputLayer port management -------------------------------------------
  addInputPort: nodeId =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur = n.data.ports ?? [];
      return { ...n, data: { ...n.data, ports: [...cur, _freshPortLabel(cur)] } };
    })})),

  removeInputPort: (nodeId, idx) =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur = n.data.ports ?? [];
      if (cur.length <= 1) return n;
      return { ...n, data: { ...n.data, ports: cur.filter((_, i) => i !== idx) } };
    })})),

  updateInputPortLabel: (nodeId, idx, label) =>
    set(s => ({ nodes: s.nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cur   = [...(n.data.ports ?? [])];
      if (cur.some((l, i) => i !== idx && l === label) || !label.trim()) return n;
      cur[idx] = label.trim();
      return { ...n, data: { ...n.data, ports: cur } };
    })})),

  updateComponentName: (nodeId, name) =>
    set(s => ({ nodes: s.nodes.map(n =>
      n.id !== nodeId ? n : { ...n, data: { ...n.data, name } }
    )})),

  // -- Generic component ops ------------------------------------------------
  updateComponentConfig: (id, field, value) =>
    set(s => ({ nodes: s.nodes.map(n =>
      n.id !== id ? n : { ...n, data: { ...n.data, config: { ...n.data.config, [field]: value } } }
    )})),

  setComponentStatus:   (id, status)   => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, status   } }) })),
  setComponentHealth:   (id, health)   => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, health   } }) })),
  setComponentMetrics:  (id, metrics)  => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, metrics  } }) })),
  setComponentWarnings: (id, warnings) => set(s => ({ nodes: s.nodes.map(n => n.id !== id ? n : { ...n, data: { ...n.data, warnings } }) })),
  setAllStatuses:  status => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, status  } })) })),
  setAllHealths:   health => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, health  } })) })),
  resetMetrics:    ()     => set(s => ({ nodes: s.nodes.map(n => ({ ...n, data: { ...n.data, metrics: null, status: 'idle', health: null } })) })),

  loadGraph: graph => {
    if (!graph?.nodes || !graph?.edges) return;
    // Update the global node counter to avoid ID conflicts
    const maxId = Math.max(0, ...graph.nodes.map(n => parseInt(n.id) || 0));
    _nodeCounter = Math.max(_nodeCounter, maxId);
    set({ nodes: graph.nodes, edges: graph.edges });
  },

  clearGraph: () => set({ nodes: [], edges: [], buildId: null, buildValid: false }),

  // ── Selection ──────────────────────────────────────────────────────────
  selectedId: null,
  setSelected: id => set({ selectedId: id }),

  // ── Layout ─────────────────────────────────────────────────────────────
  layoutDirection: 'LR',
  toggleLayout: () => set(s => ({ layoutDirection: s.layoutDirection === 'LR' ? 'TB' : 'LR' })),

  // ── View ───────────────────────────────────────────────────────────────
  // 'network' | 'overview' | 'layer' | 'epoch' | 'step'
  activeView: 'network',
  setActiveView: view => set({ activeView: view }),

  // ── Build state ─────────────────────────────────────────────────────────
  buildId:    null,
  buildValid: false,
  setBuild:        (id, valid) => set({ buildId: id, buildValid: valid }),
  invalidateBuild: ()          => set({ buildId: null, buildValid: false }),

  // ── Run state ──────────────────────────────────────────────────────────
  runMode:           'idle',   // 'idle'|'running'|'stepping'|'connecting'|'done'|'error'
  stepPhase:         'forward',
  currentStepId:     null,
  pendingBranches:   [],
  completedBranches: [],
  stepSession:       null,

  // Run progress (for live progress bar during full run)
  runProgress: { epoch: 0, batch: 0, n_epochs: 1, n_batches: 0 },

  setRunMode:           mode    => set({ runMode: mode }),
  setStepPhase:         phase   => set({ stepPhase: phase }),
  setCurrentStep:       id      => set({ currentStepId: id }),
  setPendingBranches:   bs      => set({ pendingBranches: bs }),
  setCompletedBranches: bs      => set({ completedBranches: bs }),
  setStepSession:       session => set({ stepSession: session }),
  setRunProgress: progress =>
    set(s => ({ runProgress: { ...s.runProgress, ...progress } })),

  // ── Run config ─────────────────────────────────────────────────────────
  runConfig: {
    run_id:    0,
    n_epochs:  1,
    observers: ['SignalStatsObserver'],
  },
  setRunConfig: cfg => set(s => ({ runConfig: { ...s.runConfig, ...cfg } })),

  // ── Run Metrics ────────────────────────────────────────────────────────
  // Full multi-epoch stats — NOT stored on individual nodes.
  // Shape: see emptyRunMetrics() above.
  runMetrics:    emptyRunMetrics(),
  selectedEpoch: 0,

  setSelectedEpoch: epoch => set({ selectedEpoch: epoch }),

  // Called when an epoch_done event arrives from the WebSocket.
  // snapshot = { nodeId: { output_shape, activation_mean, activation_std,
  //                         grad_in_norm, grad_in_std }, ... }
  // anomalies = { nodeId: [ { kind, severity, frequency, sample_value } ], ... }
  receiveEpochSnapshot: (epoch, snapshot, anomalies) =>
    set(s => {
      const rm = s.runMetrics;
      const newEpochs    = { ...rm.epochs,    [epoch]: snapshot  };
      const newAnomalies = { ...rm.anomalies, [epoch]: anomalies };

      // Derive per-node health from worst anomaly in this epoch
      const healthUpdates = {};
      const allNodes = Object.keys(snapshot);
      allNodes.forEach(nodeId => {
        const layerAnomalies = (anomalies[nodeId] ?? []);
        if (layerAnomalies.some(a => a.severity === 'critical')) {
          healthUpdates[nodeId] = 'crit';
        } else if (layerAnomalies.some(a => a.severity === 'warning')) {
          healthUpdates[nodeId] = 'warn';
        } else {
          healthUpdates[nodeId] = 'ok';
        }
      });

      const nodes = s.nodes.map(n =>
        healthUpdates[n.id] !== undefined
          ? { ...n, data: { ...n.data, health: healthUpdates[n.id] } }
          : n
      );

      return {
        nodes,
        selectedEpoch: epoch,
        runMetrics: { ...rm, epochs: newEpochs, anomalies: newAnomalies, n_epochs: epoch + 1 },
      };
    }),

  // Called when run_started arrives — set metadata.
  initRunMetrics: (runId, nEpochs, nBatches, totalSamples) =>
    set({
      runMetrics: { ...emptyRunMetrics(), run_id: runId, n_epochs: nEpochs, n_batches: nBatches, total_samples: totalSamples },
      runProgress: { epoch: 0, batch: 0, n_epochs: nEpochs, n_batches: nBatches },
    }),

  clearRunMetrics: () => set({ runMetrics: emptyRunMetrics(), selectedEpoch: 0 }),

  // ── Dataset ────────────────────────────────────────────────────────────
  dataset:     [],
  datasetMode: null,
  setDatasetMode: mode => set({ datasetMode: mode, dataset: [] }),

  addSyntheticInput: (spec, validation_id) =>
    set(s => ({ dataset: [...s.dataset, {
      id: `ds_${Date.now()}`, kind: 'synthetic', validation_id,
      name: spec.name || `input_${s.dataset.length}`,
      n_samples: Math.min(spec.n_samples ?? 32, 100),
      sample_shape: spec.sample_shape ?? [128],
      batch_size:   spec.batch_size   ?? 32,
      distribution: spec.distribution ?? 'normal',
      seed:         spec.seed         ?? 42,
    }]})),

  addUploadedInput: (name, file, shape, n_samples, validation_id) =>
    set(s => ({ dataset: [...s.dataset, {
      id: `ds_${Date.now()}`, kind: 'upload', validation_id, name, file, shape, n_samples,
    }]})),

  removeDatasetEntry: async (id) => {
    const entry = get().dataset.find(d => d.id === id);
    if (entry?.validation_id) {
      try { await deleteDatasetValidation(entry.validation_id); }
      catch (e) { console.error('Failed to delete validation:', e); }
    }
    set(s => ({ dataset: s.dataset.filter(d => d.id !== id) }));
  },

  updateDatasetEntry: (id, changes) =>
    set(s => ({ dataset: s.dataset.map(d => d.id !== id ? d : { ...d, ...changes }) })),

  clearDataset: () => set({ dataset: [], datasetMode: null }),

  // ── Type registries ────────────────────────────────────────────────────
  layerTypes: DEFAULT_LAYER_TYPES,
  nodeTypes:  DEFAULT_NODE_TYPES,
  setLayerTypes: t => set({ layerTypes: { ...DEFAULT_LAYER_TYPES, ...t } }),
  setNodeTypes:  t => set({ nodeTypes:  { ...DEFAULT_NODE_TYPES,  ...t } }),
>>>>>>> dcaed53 (feat: sync package files for cloudflare)
}));