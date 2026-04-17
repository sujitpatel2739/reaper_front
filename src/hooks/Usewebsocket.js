<<<<<<< HEAD
<<<<<<< HEAD
import { useCallback, useRef } from 'react';
import { useGraphStore } from '../store/Usegraphstore';
import { createStepSession, createFullRunSession } from '../api/api';

// ---------------------------------------------------------------------------
// Full-run session (WS /run/full)
// ---------------------------------------------------------------------------

export function useFullRunSession() {
  const sessionRef = useRef(null);
  const {
    setRunMode, setAllStatuses, setRunProgress,
    initRunMetrics, receiveEpochSnapshot, clearRunMetrics,
    setStepSession,
  } = useGraphStore();

  const handleMessage = useCallback((msg) => {
    switch (msg.event) {

      case 'run_started':
        initRunMetrics(
          msg.run_id,
          msg.n_epochs,
          msg.n_batches ?? 0,
          msg.total_samples ?? 0,
        );
        setRunMode('running');
        setAllStatuses('locked');
        break;

      case 'epoch_start':
        setRunProgress({ epoch: msg.epoch, batch: 0 });
        break;

      case 'batch_done':
        setRunProgress({ epoch: msg.epoch, batch: msg.batch });
        break;

      case 'epoch_done':
        receiveEpochSnapshot(msg.epoch, msg.snapshot ?? {}, msg.anomalies ?? {});
        setRunProgress({ epoch: msg.epoch });
        break;

      case 'run_done':
        setRunMode('done');
        setAllStatuses('done');
        break;

      case 'error':
        setRunMode('error');
        break;

      default:
        break;
    }
  }, []);

  const start = useCallback((buildId, runConfig, dataset) => {
    if (!buildId) { alert('Build the network first.'); return; }
    if (sessionRef.current) sessionRef.current.close();

    clearRunMetrics();

    const session = createFullRunSession({
      onOpen: () => session.send('start', {
        build_id:       buildId,
        run_config:     { ...runConfig },
        validation_ids: dataset.map(d => d.validation_id).filter(Boolean),
      }),
      onMessage: handleMessage,
      onClose:   () => { setStepSession(null); sessionRef.current = null; },
      onError:   () => setRunMode('error'),
    });

    sessionRef.current = session;
    setStepSession(session);
    setRunMode('connecting');
  }, [handleMessage]);

  const stop = useCallback(() => {
    sessionRef.current?.send('stop');
    sessionRef.current?.close();
    setRunMode('idle');
    setAllStatuses('idle');
  }, []);

  return { start, stop };
}

// ---------------------------------------------------------------------------
// Step session (WS /run/step) — unchanged protocol
// ---------------------------------------------------------------------------

export function useStepSession() {
  const sessionRef = useRef(null);
  const {
    setRunMode, setStepPhase, setCurrentStep,
    setComponentStatus, setComponentMetrics, setAllStatuses,
    setPendingBranches, setCompletedBranches,
    setStepSession,
  } = useGraphStore();

  const handleMessage = useCallback((msg) => {
    switch (msg.event) {
      case 'ready':
        setRunMode('stepping');
        setStepPhase('forward');
        setCurrentStep(msg.layer_id);
        setComponentStatus(msg.layer_id, 'pending');
        break;
      case 'step_done':
        setComponentStatus(msg.layer_id, 'done');
        if (msg.metrics) setComponentMetrics(msg.layer_id, msg.metrics);
        setCurrentStep(msg.next_layer_id ?? null);
        if (msg.next_layer_id) setComponentStatus(msg.next_layer_id, 'pending');
        break;
      case 'branch_point':
        setCurrentStep(msg.layer_id);
        setPendingBranches(msg.branches);
        setCompletedBranches([]);
        setComponentStatus(msg.layer_id, 'branch');
        break;
      case 'branch_done':
        setCompletedBranches(prev => [...prev, msg.branch]);
        break;
      case 'branches_complete':
        setPendingBranches([]);
        setComponentStatus(msg.layer_id, 'done');
        break;
      case 'forward_complete':
        setStepPhase('backward');
        setCurrentStep(null);
        break;
      case 'backward_complete':
        setRunMode('done');
        setCurrentStep(null);
        setAllStatuses('done');
        break;
      case 'error':
        setRunMode('error');
        if (msg.layer_id) setComponentStatus(msg.layer_id, 'error');
        break;
      default:
        break;
    }
  }, []);

  const start = useCallback((buildId, runConfig, dataset) => {
    if (!buildId) { alert('Build the network first.'); return; }
    if (sessionRef.current) sessionRef.current.close();

    const specs = (dataset ?? [])
      .filter(d => d.kind === 'synthetic')
      .map(({ name, n_samples, sample_shape, batch_size, distribution, seed }) =>
        ({ name, n_samples, sample_shape, batch_size, distribution, seed }));

    if (specs.length === 0) {
      (dataset ?? []).filter(d => d.kind === 'upload').forEach(d => {
        specs.push({ name: d.name, n_samples: d.n_samples ?? 32,
          sample_shape: d.shape?.slice(1) ?? [128], batch_size: 32, distribution: 'normal', seed: 42 });
      });
    }
    if (specs.length === 0) {
      specs.push({ name: 'input_0', n_samples: 32, sample_shape: [128], batch_size: 32, distribution: 'normal', seed: 42 });
    }

    const session = createStepSession({
      onOpen: () => session.send('start', {
        build_id:     buildId,
        run_config:   runConfig,
        dataset_spec: { synthetic_inputs: specs },
      }),
      onMessage: handleMessage,
      onClose:   () => { setStepSession(null); sessionRef.current = null; },
      onError:   () => setRunMode('error'),
    });

    sessionRef.current = session;
    setStepSession(session);
    setRunMode('connecting');
    setAllStatuses('locked');
  }, [handleMessage]);

  const next         = useCallback(() => sessionRef.current?.send('next'),                  []);
  const prev         = useCallback(() => sessionRef.current?.send('prev'),                  []);
  const followBranch = useCallback(b  => sessionRef.current?.send('follow', { branch: b }), []);
  const stop         = useCallback(() => {
    sessionRef.current?.send('stop');
    sessionRef.current?.close();
    setRunMode('idle');
    setAllStatuses('idle');
  }, []);

  return { start, next, prev, followBranch, stop };
=======
import { useCallback, useRef } from 'react';
import { useGraphStore } from '../store/Usegraphstore';
import { createStepSession, createFullRunSession } from '../api/api';

// ---------------------------------------------------------------------------
// Full-run session (WS /run/full)
// ---------------------------------------------------------------------------

export function useFullRunSession() {
  const sessionRef = useRef(null);
  const {
    setRunMode, setAllStatuses, setRunProgress,
    initRunMetrics, receiveEpochSnapshot, clearRunMetrics,
    setStepSession,
  } = useGraphStore();

  const handleMessage = useCallback((msg) => {
    switch (msg.event) {

      case 'run_started':
        initRunMetrics(
          msg.run_id,
          msg.n_epochs,
          msg.n_batches ?? 0,
          msg.total_samples ?? 0,
        );
        setRunMode('running');
        setAllStatuses('locked');
        break;

      case 'epoch_start':
        setRunProgress({ epoch: msg.epoch, batch: 0 });
        break;

      case 'batch_done':
        setRunProgress({ epoch: msg.epoch, batch: msg.batch });
        break;

      case 'epoch_done':
        receiveEpochSnapshot(msg.epoch, msg.snapshot ?? {}, msg.anomalies ?? {});
        setRunProgress({ epoch: msg.epoch });
        break;

      case 'run_done':
        setRunMode('done');
        setAllStatuses('done');
        break;

      case 'error':
        setRunMode('error');
        break;

      default:
        break;
    }
  }, []);

  const start = useCallback((buildId, runConfig, dataset) => {
    if (!buildId) { alert('Build the network first.'); return; }
    if (sessionRef.current) sessionRef.current.close();

    clearRunMetrics();

    const session = createFullRunSession({
      onOpen: () => session.send('start', {
        build_id:       buildId,
        run_config:     { ...runConfig },
        validation_ids: dataset.map(d => d.validation_id).filter(Boolean),
      }),
      onMessage: handleMessage,
      onClose:   () => { setStepSession(null); sessionRef.current = null; },
      onError:   () => setRunMode('error'),
    });

    sessionRef.current = session;
    setStepSession(session);
    setRunMode('connecting');
  }, [handleMessage]);

  const stop = useCallback(() => {
    sessionRef.current?.send('stop');
    sessionRef.current?.close();
    setRunMode('idle');
    setAllStatuses('idle');
  }, []);

  return { start, stop };
}

// ---------------------------------------------------------------------------
// Step session (WS /run/step) — unchanged protocol
// ---------------------------------------------------------------------------

export function useStepSession() {
  const sessionRef = useRef(null);
  const {
    setRunMode, setStepPhase, setCurrentStep,
    setComponentStatus, setComponentMetrics, setAllStatuses,
    setPendingBranches, setCompletedBranches,
    setStepSession,
  } = useGraphStore();

  const handleMessage = useCallback((msg) => {
    switch (msg.event) {
      case 'ready':
        setRunMode('stepping');
        setStepPhase('forward');
        setCurrentStep(msg.layer_id);
        setComponentStatus(msg.layer_id, 'pending');
        break;
      case 'step_done':
        setComponentStatus(msg.layer_id, 'done');
        if (msg.metrics) setComponentMetrics(msg.layer_id, msg.metrics);
        setCurrentStep(msg.next_layer_id ?? null);
        if (msg.next_layer_id) setComponentStatus(msg.next_layer_id, 'pending');
        break;
      case 'branch_point':
        setCurrentStep(msg.layer_id);
        setPendingBranches(msg.branches);
        setCompletedBranches([]);
        setComponentStatus(msg.layer_id, 'branch');
        break;
      case 'branch_done':
        setCompletedBranches(prev => [...prev, msg.branch]);
        break;
      case 'branches_complete':
        setPendingBranches([]);
        setComponentStatus(msg.layer_id, 'done');
        break;
      case 'forward_complete':
        setStepPhase('backward');
        setCurrentStep(null);
        break;
      case 'backward_complete':
        setRunMode('done');
        setCurrentStep(null);
        setAllStatuses('done');
        break;
      case 'error':
        setRunMode('error');
        if (msg.layer_id) setComponentStatus(msg.layer_id, 'error');
        break;
      default:
        break;
    }
  }, []);

  const start = useCallback((buildId, runConfig, dataset) => {
    if (!buildId) { alert('Build the network first.'); return; }
    if (sessionRef.current) sessionRef.current.close();

    const specs = (dataset ?? [])
      .filter(d => d.kind === 'synthetic')
      .map(({ name, n_samples, sample_shape, batch_size, distribution, seed }) =>
        ({ name, n_samples, sample_shape, batch_size, distribution, seed }));

    if (specs.length === 0) {
      (dataset ?? []).filter(d => d.kind === 'upload').forEach(d => {
        specs.push({ name: d.name, n_samples: d.n_samples ?? 32,
          sample_shape: d.shape?.slice(1) ?? [128], batch_size: 32, distribution: 'normal', seed: 42 });
      });
    }
    if (specs.length === 0) {
      specs.push({ name: 'input_0', n_samples: 32, sample_shape: [128], batch_size: 32, distribution: 'normal', seed: 42 });
    }

    const session = createStepSession({
      onOpen: () => session.send('start', {
        build_id:     buildId,
        run_config:   runConfig,
        dataset_spec: { synthetic_inputs: specs },
      }),
      onMessage: handleMessage,
      onClose:   () => { setStepSession(null); sessionRef.current = null; },
      onError:   () => setRunMode('error'),
    });

    sessionRef.current = session;
    setStepSession(session);
    setRunMode('connecting');
    setAllStatuses('locked');
  }, [handleMessage]);

  const next         = useCallback(() => sessionRef.current?.send('next'),                  []);
  const prev         = useCallback(() => sessionRef.current?.send('prev'),                  []);
  const followBranch = useCallback(b  => sessionRef.current?.send('follow', { branch: b }), []);
  const stop         = useCallback(() => {
    sessionRef.current?.send('stop');
    sessionRef.current?.close();
    setRunMode('idle');
    setAllStatuses('idle');
  }, []);

  return { start, next, prev, followBranch, stop };
>>>>>>> 3b424f8 (feat: sync package files for cloudflare)
=======
import { useCallback, useRef } from 'react';
import { useGraphStore } from '../store/Usegraphstore';
import { createStepSession, createFullRunSession } from '../api/api';

// ---------------------------------------------------------------------------
// Full-run session (WS /run/full)
// ---------------------------------------------------------------------------

export function useFullRunSession() {
  const sessionRef = useRef(null);
  const {
    setRunMode, setAllStatuses, setRunProgress,
    initRunMetrics, receiveEpochSnapshot, clearRunMetrics,
    setStepSession,
  } = useGraphStore();

  const handleMessage = useCallback((msg) => {
    switch (msg.event) {

      case 'run_started':
        initRunMetrics(
          msg.run_id,
          msg.n_epochs,
          msg.n_batches ?? 0,
          msg.total_samples ?? 0,
        );
        setRunMode('running');
        setAllStatuses('locked');
        break;

      case 'epoch_start':
        setRunProgress({ epoch: msg.epoch, batch: 0 });
        break;

      case 'batch_done':
        setRunProgress({ epoch: msg.epoch, batch: msg.batch });
        break;

      case 'epoch_done':
        receiveEpochSnapshot(msg.epoch, msg.snapshot ?? {}, msg.anomalies ?? {});
        setRunProgress({ epoch: msg.epoch });
        break;

      case 'run_done':
        setRunMode('done');
        setAllStatuses('done');
        break;

      case 'error':
        setRunMode('error');
        break;

      default:
        break;
    }
  }, []);

  const start = useCallback((buildId, runConfig, dataset) => {
    if (!buildId) { alert('Build the network first.'); return; }
    if (sessionRef.current) sessionRef.current.close();

    clearRunMetrics();

    const session = createFullRunSession({
      onOpen: () => session.send('start', {
        build_id:       buildId,
        run_config:     { ...runConfig },
        validation_ids: dataset.map(d => d.validation_id).filter(Boolean),
      }),
      onMessage: handleMessage,
      onClose:   () => { setStepSession(null); sessionRef.current = null; },
      onError:   () => setRunMode('error'),
    });

    sessionRef.current = session;
    setStepSession(session);
    setRunMode('connecting');
  }, [handleMessage]);

  const stop = useCallback(() => {
    sessionRef.current?.send('stop');
    sessionRef.current?.close();
    setRunMode('idle');
    setAllStatuses('idle');
  }, []);

  return { start, stop };
}

// ---------------------------------------------------------------------------
// Step session (WS /run/step) — unchanged protocol
// ---------------------------------------------------------------------------

export function useStepSession() {
  const sessionRef = useRef(null);
  const {
    setRunMode, setStepPhase, setCurrentStep,
    setComponentStatus, setComponentMetrics, setAllStatuses,
    setPendingBranches, setCompletedBranches,
    setStepSession,
  } = useGraphStore();

  const handleMessage = useCallback((msg) => {
    switch (msg.event) {
      case 'ready':
        setRunMode('stepping');
        setStepPhase('forward');
        setCurrentStep(msg.layer_id);
        setComponentStatus(msg.layer_id, 'pending');
        break;
      case 'step_done':
        setComponentStatus(msg.layer_id, 'done');
        if (msg.metrics) setComponentMetrics(msg.layer_id, msg.metrics);
        setCurrentStep(msg.next_layer_id ?? null);
        if (msg.next_layer_id) setComponentStatus(msg.next_layer_id, 'pending');
        break;
      case 'branch_point':
        setCurrentStep(msg.layer_id);
        setPendingBranches(msg.branches);
        setCompletedBranches([]);
        setComponentStatus(msg.layer_id, 'branch');
        break;
      case 'branch_done':
        setCompletedBranches(prev => [...prev, msg.branch]);
        break;
      case 'branches_complete':
        setPendingBranches([]);
        setComponentStatus(msg.layer_id, 'done');
        break;
      case 'forward_complete':
        setStepPhase('backward');
        setCurrentStep(null);
        break;
      case 'backward_complete':
        setRunMode('done');
        setCurrentStep(null);
        setAllStatuses('done');
        break;
      case 'error':
        setRunMode('error');
        if (msg.layer_id) setComponentStatus(msg.layer_id, 'error');
        break;
      default:
        break;
    }
  }, []);

  const start = useCallback((buildId, runConfig, dataset) => {
    if (!buildId) { alert('Build the network first.'); return; }
    if (sessionRef.current) sessionRef.current.close();

    const specs = (dataset ?? [])
      .filter(d => d.kind === 'synthetic')
      .map(({ name, n_samples, sample_shape, batch_size, distribution, seed }) =>
        ({ name, n_samples, sample_shape, batch_size, distribution, seed }));

    if (specs.length === 0) {
      (dataset ?? []).filter(d => d.kind === 'upload').forEach(d => {
        specs.push({ name: d.name, n_samples: d.n_samples ?? 32,
          sample_shape: d.shape?.slice(1) ?? [128], batch_size: 32, distribution: 'normal', seed: 42 });
      });
    }
    if (specs.length === 0) {
      specs.push({ name: 'input_0', n_samples: 32, sample_shape: [128], batch_size: 32, distribution: 'normal', seed: 42 });
    }

    const session = createStepSession({
      onOpen: () => session.send('start', {
        build_id:     buildId,
        run_config:   runConfig,
        dataset_spec: { synthetic_inputs: specs },
      }),
      onMessage: handleMessage,
      onClose:   () => { setStepSession(null); sessionRef.current = null; },
      onError:   () => setRunMode('error'),
    });

    sessionRef.current = session;
    setStepSession(session);
    setRunMode('connecting');
    setAllStatuses('locked');
  }, [handleMessage]);

  const next         = useCallback(() => sessionRef.current?.send('next'),                  []);
  const prev         = useCallback(() => sessionRef.current?.send('prev'),                  []);
  const followBranch = useCallback(b  => sessionRef.current?.send('follow', { branch: b }), []);
  const stop         = useCallback(() => {
    sessionRef.current?.send('stop');
    sessionRef.current?.close();
    setRunMode('idle');
    setAllStatuses('idle');
  }, []);

  return { start, next, prev, followBranch, stop };
>>>>>>> dcaed53 (feat: sync package files for cloudflare)
}