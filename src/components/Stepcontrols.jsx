<<<<<<< HEAD
<<<<<<< HEAD
import React from 'react';
import { useGraphStore } from '../store/Usegraphstore';
import { useStepSession } from '../hooks/Usewebsocket';

export default function StepControls() {
  const {
    runMode, stepPhase, currentStepId,
    pendingBranches, completedBranches,
    nodes,
    runConfig, dataset,
    buildId, buildValid,
  } = useGraphStore();

  const { start, next, prev, followBranch, stop } = useStepSession();

  const isStepping = runMode === 'stepping';
  const isIdle     = runMode === 'idle';
  const isDone     = runMode === 'done';
  const isError    = runMode === 'error';
  const atBranch   = pendingBranches.length > 0;
  const isBuilt    = !!buildId;

  const currentNode = nodes.find(n => n.id === currentStepId);

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>

      {/* Build gate warning */}
      {!isBuilt && (
        <div style={{
          padding: '8px 12px', marginBottom: 14,
          background: 'var(--amber-glow)',
          border: '1px solid rgba(240,165,0,0.25)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--amber)',
          lineHeight: 1.6,
        }}>
          ⚠ Network not built.<br />Click <strong>Build</strong> in the toolbar first.
        </div>
      )}

      {/* Status card */}
      <div style={{
        padding: '10px 12px', marginBottom: 14,
        background: 'var(--bg-elevated)',
        border: `1px solid ${modeColor(runMode)}`,
        borderRadius: 'var(--radius)',
        boxShadow: isStepping ? `0 0 18px ${modeColor(runMode)}28` : 'var(--shadow-sm)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: modeColor(runMode), marginBottom: 5,
        }}>
          {modeLabel(runMode, stepPhase)}
        </div>

        {currentNode && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
            {/* Use data.type — the unified type field */}
            {currentNode.data.type} — {currentStepId}
          </div>
        )}
        {!currentNode && isStepping && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            awaiting next action
          </div>
        )}

        {isBuilt && (
          <div style={{
            marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--text-dim)', letterSpacing: '0.04em',
          }}>
            build: {buildId}{buildValid ? '' : ' ⚠'}
          </div>
        )}
      </div>

      {/* Branch panel */}
      {atBranch && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--blue)', textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 8,
          }}>
            Fork — follow each branch
          </div>
          {pendingBranches.map(b => {
            const done = completedBranches.includes(b);
            return (
              <button
                key={b}
                disabled={done}
                onClick={() => followBranch(b)}
                style={{
                  display: 'block', width: '100%', marginBottom: 5,
                  padding: '7px 12px',
                  background: done ? 'var(--bg-surface)' : 'var(--blue-glow)',
                  border: `1px solid ${done ? 'var(--border-mid)' : 'var(--blue-dim)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: done ? 'var(--text-muted)' : 'var(--blue)',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  textAlign: 'left',
                  cursor: done ? 'default' : 'pointer',
                  transition: 'all 0.12s',
                  opacity: done ? 0.6 : 1,
                }}
              >
                {done ? '✓' : '▶'} {b}
              </button>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

        {(isIdle || isDone || isError) && (
          <Btn
            color="var(--accent)"
            disabled={!isBuilt}
            onClick={() => start(buildId, runConfig, dataset)}
          >
            ▶ START STEP MODE
          </Btn>
        )}

        {isStepping && stepPhase === 'forward' && !atBranch && (
          <Btn color="var(--accent)" onClick={next}>
            NEXT →
          </Btn>
        )}

        {isStepping && stepPhase === 'backward' && (
          <Btn color="var(--amber)" onClick={prev}>
            ← PREV
          </Btn>
        )}

        {isStepping && (
          <Btn color="var(--red)" onClick={stop} outline>
            ■ STOP
          </Btn>
        )}

        {isDone && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--accent-faint)',
            border: '1px solid var(--accent-dim)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--accent)', textAlign: 'center', letterSpacing: '0.04em',
          }}>
            ✓ Run complete
          </div>
        )}

        {isError && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--red-glow)',
            border: '1px solid var(--red-dim)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)',
          }}>
            ✗ Error — inspect the highlighted component, fix config, then rebuild.
          </div>
        )}
      </div>

      {/* Hints */}
      <div style={{ marginTop: 18 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--text-dim)', lineHeight: 1.8,
        }}>
          {isIdle && !isBuilt && 'Build the network first, then start stepping.'}
          {isIdle && isBuilt  && '← Click START STEP MODE to begin.\nPrevious components must have run at least once to start mid-network.'}
          {isStepping && stepPhase === 'forward'  && 'Click NEXT to advance one component.\nAt fork points, follow all branches before continuing.'}
          {isStepping && stepPhase === 'backward' && 'Click PREV to step backward.\nAll branches must complete before the merge.'}
        </div>
      </div>
    </div>
  );
}

function Btn({ children, color, onClick, outline, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 14px',
        background: outline ? 'transparent' : `${color}14`,
        border: `1.5px solid ${disabled ? 'var(--border-mid)' : color}`,
        borderRadius: 'var(--radius-sm)',
        color: disabled ? 'var(--text-dim)' : color,
        fontFamily: 'var(--font-display)', fontSize: 8,
        fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', width: '100%',
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = `${color}26`; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = outline ? 'transparent' : `${color}14`; }}
    >
      {children}
    </button>
  );
}

function modeColor(mode) {
  return {
    idle:       'var(--border-bright)',
    connecting: 'var(--amber)',
    stepping:   'var(--accent)',
    running:    'var(--accent)',
    done:       'var(--accent-dim)',
    error:      'var(--red)',
  }[mode] ?? 'var(--border-bright)';
}

function modeLabel(mode, phase) {
  if (mode === 'idle')       return 'Idle';
  if (mode === 'connecting') return 'Connecting…';
  if (mode === 'stepping')   return phase === 'forward' ? 'Stepping — Forward' : 'Stepping — Backward';
  if (mode === 'running')    return 'Running';
  if (mode === 'done')       return 'Complete';
  if (mode === 'error')      return 'Error';
  return mode;
=======
import React from 'react';
import { useGraphStore } from '../store/Usegraphstore';
import { useStepSession } from '../hooks/Usewebsocket';

export default function StepControls() {
  const {
    runMode, stepPhase, currentStepId,
    pendingBranches, completedBranches,
    nodes,
    runConfig, dataset,
    buildId, buildValid,
  } = useGraphStore();

  const { start, next, prev, followBranch, stop } = useStepSession();

  const isStepping = runMode === 'stepping';
  const isIdle     = runMode === 'idle';
  const isDone     = runMode === 'done';
  const isError    = runMode === 'error';
  const atBranch   = pendingBranches.length > 0;
  const isBuilt    = !!buildId;

  const currentNode = nodes.find(n => n.id === currentStepId);

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>

      {/* Build gate warning */}
      {!isBuilt && (
        <div style={{
          padding: '8px 12px', marginBottom: 14,
          background: 'var(--amber-glow)',
          border: '1px solid rgba(240,165,0,0.25)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--amber)',
          lineHeight: 1.6,
        }}>
          ⚠ Network not built.<br />Click <strong>Build</strong> in the toolbar first.
        </div>
      )}

      {/* Status card */}
      <div style={{
        padding: '10px 12px', marginBottom: 14,
        background: 'var(--bg-elevated)',
        border: `1px solid ${modeColor(runMode)}`,
        borderRadius: 'var(--radius)',
        boxShadow: isStepping ? `0 0 18px ${modeColor(runMode)}28` : 'var(--shadow-sm)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: modeColor(runMode), marginBottom: 5,
        }}>
          {modeLabel(runMode, stepPhase)}
        </div>

        {currentNode && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
            {/* Use data.type — the unified type field */}
            {currentNode.data.type} — {currentStepId}
          </div>
        )}
        {!currentNode && isStepping && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            awaiting next action
          </div>
        )}

        {isBuilt && (
          <div style={{
            marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--text-dim)', letterSpacing: '0.04em',
          }}>
            build: {buildId}{buildValid ? '' : ' ⚠'}
          </div>
        )}
      </div>

      {/* Branch panel */}
      {atBranch && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--blue)', textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 8,
          }}>
            Fork — follow each branch
          </div>
          {pendingBranches.map(b => {
            const done = completedBranches.includes(b);
            return (
              <button
                key={b}
                disabled={done}
                onClick={() => followBranch(b)}
                style={{
                  display: 'block', width: '100%', marginBottom: 5,
                  padding: '7px 12px',
                  background: done ? 'var(--bg-surface)' : 'var(--blue-glow)',
                  border: `1px solid ${done ? 'var(--border-mid)' : 'var(--blue-dim)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: done ? 'var(--text-muted)' : 'var(--blue)',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  textAlign: 'left',
                  cursor: done ? 'default' : 'pointer',
                  transition: 'all 0.12s',
                  opacity: done ? 0.6 : 1,
                }}
              >
                {done ? '✓' : '▶'} {b}
              </button>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

        {(isIdle || isDone || isError) && (
          <Btn
            color="var(--accent)"
            disabled={!isBuilt}
            onClick={() => start(buildId, runConfig, dataset)}
          >
            ▶ START STEP MODE
          </Btn>
        )}

        {isStepping && stepPhase === 'forward' && !atBranch && (
          <Btn color="var(--accent)" onClick={next}>
            NEXT →
          </Btn>
        )}

        {isStepping && stepPhase === 'backward' && (
          <Btn color="var(--amber)" onClick={prev}>
            ← PREV
          </Btn>
        )}

        {isStepping && (
          <Btn color="var(--red)" onClick={stop} outline>
            ■ STOP
          </Btn>
        )}

        {isDone && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--accent-faint)',
            border: '1px solid var(--accent-dim)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--accent)', textAlign: 'center', letterSpacing: '0.04em',
          }}>
            ✓ Run complete
          </div>
        )}

        {isError && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--red-glow)',
            border: '1px solid var(--red-dim)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)',
          }}>
            ✗ Error — inspect the highlighted component, fix config, then rebuild.
          </div>
        )}
      </div>

      {/* Hints */}
      <div style={{ marginTop: 18 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--text-dim)', lineHeight: 1.8,
        }}>
          {isIdle && !isBuilt && 'Build the network first, then start stepping.'}
          {isIdle && isBuilt  && '← Click START STEP MODE to begin.\nPrevious components must have run at least once to start mid-network.'}
          {isStepping && stepPhase === 'forward'  && 'Click NEXT to advance one component.\nAt fork points, follow all branches before continuing.'}
          {isStepping && stepPhase === 'backward' && 'Click PREV to step backward.\nAll branches must complete before the merge.'}
        </div>
      </div>
    </div>
  );
}

function Btn({ children, color, onClick, outline, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 14px',
        background: outline ? 'transparent' : `${color}14`,
        border: `1.5px solid ${disabled ? 'var(--border-mid)' : color}`,
        borderRadius: 'var(--radius-sm)',
        color: disabled ? 'var(--text-dim)' : color,
        fontFamily: 'var(--font-display)', fontSize: 8,
        fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', width: '100%',
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = `${color}26`; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = outline ? 'transparent' : `${color}14`; }}
    >
      {children}
    </button>
  );
}

function modeColor(mode) {
  return {
    idle:       'var(--border-bright)',
    connecting: 'var(--amber)',
    stepping:   'var(--accent)',
    running:    'var(--accent)',
    done:       'var(--accent-dim)',
    error:      'var(--red)',
  }[mode] ?? 'var(--border-bright)';
}

function modeLabel(mode, phase) {
  if (mode === 'idle')       return 'Idle';
  if (mode === 'connecting') return 'Connecting…';
  if (mode === 'stepping')   return phase === 'forward' ? 'Stepping — Forward' : 'Stepping — Backward';
  if (mode === 'running')    return 'Running';
  if (mode === 'done')       return 'Complete';
  if (mode === 'error')      return 'Error';
  return mode;
>>>>>>> 3b424f8 (feat: sync package files for cloudflare)
=======
import React from 'react';
import { useGraphStore } from '../store/Usegraphstore';
import { useStepSession } from '../hooks/Usewebsocket';

export default function StepControls() {
  const {
    runMode, stepPhase, currentStepId,
    pendingBranches, completedBranches,
    nodes,
    runConfig, dataset,
    buildId, buildValid,
  } = useGraphStore();

  const { start, next, prev, followBranch, stop } = useStepSession();

  const isStepping = runMode === 'stepping';
  const isIdle     = runMode === 'idle';
  const isDone     = runMode === 'done';
  const isError    = runMode === 'error';
  const atBranch   = pendingBranches.length > 0;
  const isBuilt    = !!buildId;

  const currentNode = nodes.find(n => n.id === currentStepId);

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>

      {/* Build gate warning */}
      {!isBuilt && (
        <div style={{
          padding: '8px 12px', marginBottom: 14,
          background: 'var(--amber-glow)',
          border: '1px solid rgba(240,165,0,0.25)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--amber)',
          lineHeight: 1.6,
        }}>
          ⚠ Network not built.<br />Click <strong>Build</strong> in the toolbar first.
        </div>
      )}

      {/* Status card */}
      <div style={{
        padding: '10px 12px', marginBottom: 14,
        background: 'var(--bg-elevated)',
        border: `1px solid ${modeColor(runMode)}`,
        borderRadius: 'var(--radius)',
        boxShadow: isStepping ? `0 0 18px ${modeColor(runMode)}28` : 'var(--shadow-sm)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: modeColor(runMode), marginBottom: 5,
        }}>
          {modeLabel(runMode, stepPhase)}
        </div>

        {currentNode && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
            {/* Use data.type — the unified type field */}
            {currentNode.data.type} — {currentStepId}
          </div>
        )}
        {!currentNode && isStepping && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            awaiting next action
          </div>
        )}

        {isBuilt && (
          <div style={{
            marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--text-dim)', letterSpacing: '0.04em',
          }}>
            build: {buildId}{buildValid ? '' : ' ⚠'}
          </div>
        )}
      </div>

      {/* Branch panel */}
      {atBranch && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--blue)', textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 8,
          }}>
            Fork — follow each branch
          </div>
          {pendingBranches.map(b => {
            const done = completedBranches.includes(b);
            return (
              <button
                key={b}
                disabled={done}
                onClick={() => followBranch(b)}
                style={{
                  display: 'block', width: '100%', marginBottom: 5,
                  padding: '7px 12px',
                  background: done ? 'var(--bg-surface)' : 'var(--blue-glow)',
                  border: `1px solid ${done ? 'var(--border-mid)' : 'var(--blue-dim)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: done ? 'var(--text-muted)' : 'var(--blue)',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  textAlign: 'left',
                  cursor: done ? 'default' : 'pointer',
                  transition: 'all 0.12s',
                  opacity: done ? 0.6 : 1,
                }}
              >
                {done ? '✓' : '▶'} {b}
              </button>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

        {(isIdle || isDone || isError) && (
          <Btn
            color="var(--accent)"
            disabled={!isBuilt}
            onClick={() => start(buildId, runConfig, dataset)}
          >
            ▶ START STEP MODE
          </Btn>
        )}

        {isStepping && stepPhase === 'forward' && !atBranch && (
          <Btn color="var(--accent)" onClick={next}>
            NEXT →
          </Btn>
        )}

        {isStepping && stepPhase === 'backward' && (
          <Btn color="var(--amber)" onClick={prev}>
            ← PREV
          </Btn>
        )}

        {isStepping && (
          <Btn color="var(--red)" onClick={stop} outline>
            ■ STOP
          </Btn>
        )}

        {isDone && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--accent-faint)',
            border: '1px solid var(--accent-dim)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--accent)', textAlign: 'center', letterSpacing: '0.04em',
          }}>
            ✓ Run complete
          </div>
        )}

        {isError && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--red-glow)',
            border: '1px solid var(--red-dim)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)',
          }}>
            ✗ Error — inspect the highlighted component, fix config, then rebuild.
          </div>
        )}
      </div>

      {/* Hints */}
      <div style={{ marginTop: 18 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--text-dim)', lineHeight: 1.8,
        }}>
          {isIdle && !isBuilt && 'Build the network first, then start stepping.'}
          {isIdle && isBuilt  && '← Click START STEP MODE to begin.\nPrevious components must have run at least once to start mid-network.'}
          {isStepping && stepPhase === 'forward'  && 'Click NEXT to advance one component.\nAt fork points, follow all branches before continuing.'}
          {isStepping && stepPhase === 'backward' && 'Click PREV to step backward.\nAll branches must complete before the merge.'}
        </div>
      </div>
    </div>
  );
}

function Btn({ children, color, onClick, outline, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 14px',
        background: outline ? 'transparent' : `${color}14`,
        border: `1.5px solid ${disabled ? 'var(--border-mid)' : color}`,
        borderRadius: 'var(--radius-sm)',
        color: disabled ? 'var(--text-dim)' : color,
        fontFamily: 'var(--font-display)', fontSize: 8,
        fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', width: '100%',
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = `${color}26`; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = outline ? 'transparent' : `${color}14`; }}
    >
      {children}
    </button>
  );
}

function modeColor(mode) {
  return {
    idle:       'var(--border-bright)',
    connecting: 'var(--amber)',
    stepping:   'var(--accent)',
    running:    'var(--accent)',
    done:       'var(--accent-dim)',
    error:      'var(--red)',
  }[mode] ?? 'var(--border-bright)';
}

function modeLabel(mode, phase) {
  if (mode === 'idle')       return 'Idle';
  if (mode === 'connecting') return 'Connecting…';
  if (mode === 'stepping')   return phase === 'forward' ? 'Stepping — Forward' : 'Stepping — Backward';
  if (mode === 'running')    return 'Running';
  if (mode === 'done')       return 'Complete';
  if (mode === 'error')      return 'Error';
  return mode;
>>>>>>> dcaed53 (feat: sync package files for cloudflare)
}