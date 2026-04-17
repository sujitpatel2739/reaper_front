<<<<<<< HEAD
<<<<<<< HEAD
const BASE = 'http://localhost:8000';

// ── Registry ─────────────────────────────────────────────────────────────────

export async function fetchLayerTypes() {
  const r = await fetch(`${BASE}/layers`);
  return r.json();
}

export async function fetchNodeTypes() {
  const r = await fetch(`${BASE}/nodes`);
  return r.json();
}

// ── Network ───────────────────────────────────────────────────────────────────

export async function buildNetwork(graph, runConfig) {
  const r = await fetch(`${BASE}/network/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph, run_config: runConfig }),
  });
  return r.json();
}

export async function importModel(file) {
  const fd = new FormData();
  fd.append('model_file', file);
  const r = await fetch(`${BASE}/network/import`, { method: 'POST', body: fd });
  return r.json();
}

export async function saveNetwork(graph) {
  const r = await fetch(`${BASE}/network/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  });
  const blob = await r.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'network.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadNetwork(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try   { resolve(JSON.parse(e.target.result)); }
      catch { reject(new Error('Invalid network file')); }
    };
    reader.readAsText(file);
  });
}

// ── Dataset ───────────────────────────────────────────────────────────────────

export async function uploadDatasetInput(name, file) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('data_file', file);
  const r = await fetch(`${BASE}/dataset/upload`, { method: 'POST', body: fd });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Upload failed'); }
  return r.json();
}

// ── Run ───────────────────────────────────────────────────────────────────────

export async function resetNetwork() {
  const r = await fetch(`${BASE}/run/reset`, { method: 'POST' });
  return r.json();
}

export async function validateSyntheticSpec(spec) {
  const r = await fetch(`${BASE}/dataset/validate-synthetic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Validation failed'); }
  return r.json();
}

export async function validateUploadedFile(name, file) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('data_file', file);
  const r = await fetch(`${BASE}/dataset/validate-upload`, { method: 'POST', body: fd });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Validation failed'); }
  return r.json();
}

export async function deleteDatasetValidation(validationId) {
  const r = await fetch(`${BASE}/dataset/validation/${validationId}`, { method: 'DELETE' });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Delete failed'); }
  return r.json();
}

// ── WebSocket factory — shared internals ─────────────────────────────────────

function _makeSession(url, handlers) {
  const ws = new WebSocket(url);

  ws.onopen    = ()  => handlers.onOpen?.();
  ws.onclose   = ()  => handlers.onClose?.();
  ws.onerror   = (e) => handlers.onError?.(e);
  ws.onmessage = (e) => {
    try { handlers.onMessage?.(JSON.parse(e.data)); }
    catch {}
  };

  return {
    send:  (action, payload = {}) => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ action, ...payload }));
    },
    close: () => ws.close(),
  };
}

// ── WebSocket: step mode (/run/step) ─────────────────────────────────────────

/**
 * Manual step-mode session.
 * Sends: start { build_id, run_config, dataset_spec } | next | prev | follow { branch } | stop
 * Receives: ready | step_done | branch_point | branch_done | branches_complete |
 *           forward_complete | backward_complete | error
 */
export function createStepSession(handlers) {
  return _makeSession('ws://localhost:8000/run/step', handlers);
}

// ── WebSocket: full run (/run/full) ──────────────────────────────────────────

/**
 * Full multi-epoch streaming run session.
 * Sends: start { build_id, run_config, validation_ids } | stop
 * Receives:
 *   run_started  { run_id, n_epochs, n_batches, total_samples }
 *   epoch_start  { epoch }
 *   batch_done   { epoch, batch, n_batches }          ← only if batch took > ~100ms
 *   epoch_done   { epoch, snapshot, anomalies }
 *   run_done     { n_epochs }
 *   error        { message }
 */
export function createFullRunSession(handlers) {
  return _makeSession('ws://localhost:8000/run/full', handlers);
=======
const BASE = 'http://localhost:8000';

// ── Registry ─────────────────────────────────────────────────────────────────

export async function fetchLayerTypes() {
  const r = await fetch(`${BASE}/layers`);
  return r.json();
}

export async function fetchNodeTypes() {
  const r = await fetch(`${BASE}/nodes`);
  return r.json();
}

// ── Network ───────────────────────────────────────────────────────────────────

export async function buildNetwork(graph, runConfig) {
  const r = await fetch(`${BASE}/network/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph, run_config: runConfig }),
  });
  return r.json();
}

export async function importModel(file) {
  const fd = new FormData();
  fd.append('model_file', file);
  const r = await fetch(`${BASE}/network/import`, { method: 'POST', body: fd });
  return r.json();
}

export async function saveNetwork(graph) {
  const r = await fetch(`${BASE}/network/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  });
  const blob = await r.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'network.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadNetwork(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try   { resolve(JSON.parse(e.target.result)); }
      catch { reject(new Error('Invalid network file')); }
    };
    reader.readAsText(file);
  });
}

// ── Dataset ───────────────────────────────────────────────────────────────────

export async function uploadDatasetInput(name, file) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('data_file', file);
  const r = await fetch(`${BASE}/dataset/upload`, { method: 'POST', body: fd });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Upload failed'); }
  return r.json();
}

// ── Run ───────────────────────────────────────────────────────────────────────

export async function resetNetwork() {
  const r = await fetch(`${BASE}/run/reset`, { method: 'POST' });
  return r.json();
}

export async function validateSyntheticSpec(spec) {
  const r = await fetch(`${BASE}/dataset/validate-synthetic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Validation failed'); }
  return r.json();
}

export async function validateUploadedFile(name, file) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('data_file', file);
  const r = await fetch(`${BASE}/dataset/validate-upload`, { method: 'POST', body: fd });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Validation failed'); }
  return r.json();
}

export async function deleteDatasetValidation(validationId) {
  const r = await fetch(`${BASE}/dataset/validation/${validationId}`, { method: 'DELETE' });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Delete failed'); }
  return r.json();
}

// ── WebSocket factory — shared internals ─────────────────────────────────────

function _makeSession(url, handlers) {
  const ws = new WebSocket(url);

  ws.onopen    = ()  => handlers.onOpen?.();
  ws.onclose   = ()  => handlers.onClose?.();
  ws.onerror   = (e) => handlers.onError?.(e);
  ws.onmessage = (e) => {
    try { handlers.onMessage?.(JSON.parse(e.data)); }
    catch {}
  };

  return {
    send:  (action, payload = {}) => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ action, ...payload }));
    },
    close: () => ws.close(),
  };
}

// ── WebSocket: step mode (/run/step) ─────────────────────────────────────────

/**
 * Manual step-mode session.
 * Sends: start { build_id, run_config, dataset_spec } | next | prev | follow { branch } | stop
 * Receives: ready | step_done | branch_point | branch_done | branches_complete |
 *           forward_complete | backward_complete | error
 */
export function createStepSession(handlers) {
  return _makeSession('ws://localhost:8000/run/step', handlers);
}

// ── WebSocket: full run (/run/full) ──────────────────────────────────────────

/**
 * Full multi-epoch streaming run session.
 * Sends: start { build_id, run_config, validation_ids } | stop
 * Receives:
 *   run_started  { run_id, n_epochs, n_batches, total_samples }
 *   epoch_start  { epoch }
 *   batch_done   { epoch, batch, n_batches }          ← only if batch took > ~100ms
 *   epoch_done   { epoch, snapshot, anomalies }
 *   run_done     { n_epochs }
 *   error        { message }
 */
export function createFullRunSession(handlers) {
  return _makeSession('ws://localhost:8000/run/full', handlers);
>>>>>>> 3b424f8 (feat: sync package files for cloudflare)
=======
const BASE = 'http://localhost:8000';

// ── Registry ─────────────────────────────────────────────────────────────────

export async function fetchLayerTypes() {
  const r = await fetch(`${BASE}/layers`);
  return r.json();
}

export async function fetchNodeTypes() {
  const r = await fetch(`${BASE}/nodes`);
  return r.json();
}

// ── Network ───────────────────────────────────────────────────────────────────

export async function buildNetwork(graph, runConfig) {
  const r = await fetch(`${BASE}/network/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph, run_config: runConfig }),
  });
  return r.json();
}

export async function importModel(file) {
  const fd = new FormData();
  fd.append('model_file', file);
  const r = await fetch(`${BASE}/network/import`, { method: 'POST', body: fd });
  return r.json();
}

export async function saveNetwork(graph) {
  const r = await fetch(`${BASE}/network/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  });
  const blob = await r.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'network.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadNetwork(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try   { resolve(JSON.parse(e.target.result)); }
      catch { reject(new Error('Invalid network file')); }
    };
    reader.readAsText(file);
  });
}

// ── Dataset ───────────────────────────────────────────────────────────────────

export async function uploadDatasetInput(name, file) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('data_file', file);
  const r = await fetch(`${BASE}/dataset/upload`, { method: 'POST', body: fd });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Upload failed'); }
  return r.json();
}

// ── Run ───────────────────────────────────────────────────────────────────────

export async function resetNetwork() {
  const r = await fetch(`${BASE}/run/reset`, { method: 'POST' });
  return r.json();
}

export async function validateSyntheticSpec(spec) {
  const r = await fetch(`${BASE}/dataset/validate-synthetic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Validation failed'); }
  return r.json();
}

export async function validateUploadedFile(name, file) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('data_file', file);
  const r = await fetch(`${BASE}/dataset/validate-upload`, { method: 'POST', body: fd });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Validation failed'); }
  return r.json();
}

export async function deleteDatasetValidation(validationId) {
  const r = await fetch(`${BASE}/dataset/validation/${validationId}`, { method: 'DELETE' });
  if (!r.ok) { const err = await r.json(); throw new Error(err.detail ?? 'Delete failed'); }
  return r.json();
}

// ── WebSocket factory — shared internals ─────────────────────────────────────

function _makeSession(url, handlers) {
  const ws = new WebSocket(url);

  ws.onopen    = ()  => handlers.onOpen?.();
  ws.onclose   = ()  => handlers.onClose?.();
  ws.onerror   = (e) => handlers.onError?.(e);
  ws.onmessage = (e) => {
    try { handlers.onMessage?.(JSON.parse(e.data)); }
    catch {}
  };

  return {
    send:  (action, payload = {}) => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ action, ...payload }));
    },
    close: () => ws.close(),
  };
}

// ── WebSocket: step mode (/run/step) ─────────────────────────────────────────

/**
 * Manual step-mode session.
 * Sends: start { build_id, run_config, dataset_spec } | next | prev | follow { branch } | stop
 * Receives: ready | step_done | branch_point | branch_done | branches_complete |
 *           forward_complete | backward_complete | error
 */
export function createStepSession(handlers) {
  return _makeSession('ws://localhost:8000/run/step', handlers);
}

// ── WebSocket: full run (/run/full) ──────────────────────────────────────────

/**
 * Full multi-epoch streaming run session.
 * Sends: start { build_id, run_config, validation_ids } | stop
 * Receives:
 *   run_started  { run_id, n_epochs, n_batches, total_samples }
 *   epoch_start  { epoch }
 *   batch_done   { epoch, batch, n_batches }          ← only if batch took > ~100ms
 *   epoch_done   { epoch, snapshot, anomalies }
 *   run_done     { n_epochs }
 *   error        { message }
 */
export function createFullRunSession(handlers) {
  return _makeSession('ws://localhost:8000/run/full', handlers);
>>>>>>> dcaed53 (feat: sync package files for cloudflare)
}