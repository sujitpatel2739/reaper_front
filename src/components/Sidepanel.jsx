/**
 * Sidepanel.jsx
 *
 * Content panel — right side of the main workspace.
 * Width and content are driven by activeView from the store.
 *
 * Views map:
 *   network  → 300px  MetricsPanel (selected component detail)
 *   overview → 520px  OverviewPanel (cross-layer dashboard)
 *   layer    → 380px  MetricsPanel (same component, wider context)
 *   epoch    → 560px  EpochPanel (cross-epoch trends)
 *   step     → 300px  StepControls
 *
 * Utility drawers (dataset / config) open as an overlay on top of the
 * content panel, closing when clicking outside or pressing Escape.
 */

import React, { useEffect, useCallback } from 'react';
import MetricsPanel   from './Metricspanel';
import OverviewPanel  from './Overviewpanel';
import EpochPanel     from './Epochpanel';
import StepControls   from './Stepcontrols';
import DatasetConfig  from './Dataconfig';
import ObserverConfig from './Observerconfig';
import { useGraphStore } from '../store/Usegraphstore';

const PANEL_WIDTHS = {
  network:  300,
  overview: 520,
  layer:    380,
  epoch:    560,
  step:     300,
};

// ---------------------------------------------------------------------------
// Drawer overlay (dataset / config)
// ---------------------------------------------------------------------------

function Drawer({ title, children, onClose }) {
  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose(); }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(3,4,10,0.45)',
          zIndex: 40,
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0,
        width: 320, height: '100%',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-mid)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.18s ease',
      }}>
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 44, flexShrink: 0,
          borderBottom: '1px solid var(--border-mid)',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-primary)',
          }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)', fontSize: 14, padding: '0 4px' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------
// Panel header — shows view name + epoch indicator where relevant
// ---------------------------------------------------------------------------

function PanelHeader({ view, selectedEpoch, nEpochs }) {
  const titles = {
    network:  'Component Detail',
    overview: 'Overview',
    layer:    'Layer Detail',
    epoch:    'Epoch Trends',
    step:     'Step Mode',
  };

  return (
    <div style={{
      height: 36, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 14px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>
        {titles[view] ?? view}
      </span>

      {/* Epoch badge — shown when metrics are available */}
      {nEpochs > 0 && view !== 'step' && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 8,
          color: 'var(--accent-dim)', background: 'var(--accent-faint)',
          border: '1px solid var(--accent-faint)',
          padding: '1px 6px', borderRadius: 'var(--radius-xs)',
        }}>
          E{selectedEpoch} / {nEpochs}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function SidePanel({ openUtility, onCloseUtility }) {
  const { activeView, selectedId, nodes, runMetrics, selectedEpoch } = useGraphStore();
  const selectedNode = nodes.find(n => n.id === selectedId);
  const width = PANEL_WIDTHS[activeView] ?? 300;

  const drawerTitle = openUtility === 'dataset' ? 'Dataset' : openUtility === 'config' ? 'Config' : '';

  return (
    <>
      <div style={{
        width, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-mid)',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>
        <PanelHeader
          view={activeView}
          selectedEpoch={selectedEpoch}
          nEpochs={runMetrics.n_epochs}
        />

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeView === 'network'  && <MetricsPanel node={selectedNode} />}
          {activeView === 'overview' && <OverviewPanel />}
          {activeView === 'layer'    && <MetricsPanel node={selectedNode} />}
          {activeView === 'epoch'    && <EpochPanel />}
          {activeView === 'step'     && <StepControls />}
        </div>
      </div>

      {/* Utility drawers */}
      {openUtility === 'dataset' && (
        <Drawer title="Dataset" onClose={onCloseUtility}>
          <DatasetConfig />
        </Drawer>
      )}
      {openUtility === 'config' && (
        <Drawer title="Config" onClose={onCloseUtility}>
          <ObserverConfig />
        </Drawer>
      )}
    </>
  );
}