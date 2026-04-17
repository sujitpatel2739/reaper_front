<<<<<<< HEAD
/**
 * Viewrail.jsx
 *
 * Left 44px icon-only navigation rail.
 * Top section: 5 diagnostic views.
 * Bottom section: Dataset + Config utility drawers.
 *
 * Icons are pure SVG inline — no icon library dependency.
 * Active view gets accent left-border and tinted background.
 * Inactive items have tooltip on hover.
 */

import React from 'react';
import { useGraphStore } from '../store/Usegraphstore';

// ---------------------------------------------------------------------------
// Icon definitions — pure SVG paths, 20×20 viewBox
// ---------------------------------------------------------------------------

const ICONS = {
  network: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="7" width="5" height="4" rx="1" />
      <rect x="7.5" y="2" width="5" height="4" rx="1" />
      <rect x="7.5" y="14" width="5" height="4" rx="1" />
      <rect x="13" y="7" width="5" height="4" rx="1" />
      <line x1="7" y1="9" x2="7.5" y2="4" />
      <line x1="7" y1="11" x2="7.5" y2="16" />
      <line x1="12.5" y1="4" x2="13" y2="9" />
      <line x1="12.5" y1="16" x2="13" y2="11" />
    </svg>
  ),
  overview: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="7" height="7" rx="1" />
      <rect x="11" y="2" width="7" height="7" rx="1" />
      <rect x="2" y="11" width="7" height="7" rx="1" />
      <rect x="11" y="11" width="7" height="7" rx="1" />
    </svg>
  ),
  layer: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="4" y1="6" x2="16" y2="6" />
      <line x1="4" y1="10" x2="16" y2="10" />
      <line x1="4" y1="14" x2="12" y2="14" />
      <circle cx="15" cy="14" r="2.5" />
    </svg>
  ),
  epoch: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polyline points="2,14 6,9 9,12 13,6 18,8" />
      <line x1="2" y1="17" x2="18" y2="17" />
    </svg>
  ),
  step: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polygon points="6,4 16,10 6,16" />
      <line x1="3" y1="4" x2="3" y2="16" />
    </svg>
  ),
  dataset: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="10" cy="5" rx="7" ry="2.5" />
      <path d="M3 5v5c0 1.38 3.13 2.5 7 2.5S17 11.38 17 10V5" />
      <path d="M3 10v5c0 1.38 3.13 2.5 7 2.5S17 16.38 17 15v-5" />
    </svg>
  ),
  config: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// View definitions
// ---------------------------------------------------------------------------

const VIEWS = [
  { id: 'network',  label: 'Network',       icon: ICONS.network  },
  { id: 'overview', label: 'Overview',      icon: ICONS.overview },
  { id: 'layer',    label: 'Layer Detail',  icon: ICONS.layer    },
  { id: 'epoch',    label: 'Epoch Trends',  icon: ICONS.epoch    },
  { id: 'step',     label: 'Step Mode',     icon: ICONS.step     },
];

const UTILITY = [
  { id: 'dataset',  label: 'Dataset',    icon: ICONS.dataset },
  { id: 'config',   label: 'Config',     icon: ICONS.config  },
];

// ---------------------------------------------------------------------------
// Rail button
// ---------------------------------------------------------------------------

function RailBtn({ id, label, icon, active, onClick, isUtility = false }) {
  const accent = isUtility ? 'var(--text-secondary)' : 'var(--accent)';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Active indicator — left border */}
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: '50%',
          transform: 'translateY(-50%)',
          width: 2, height: 22, borderRadius: 1,
          background: accent,
          boxShadow: `0 0 8px ${accent}`,
        }} />
      )}

      <button
        onClick={onClick}
        title={label}
        style={{
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 0,
          background: active ? `${accent}10` : 'transparent',
          color: active ? accent : 'var(--text-muted)',
          transition: 'all 0.15s',
          position: 'relative',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = `${accent}08`;
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <div style={{ width: 18, height: 18 }}>
          {icon}
        </div>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ViewRail({ onUtilityClick, activeUtility }) {
  const { activeView, setActiveView } = useGraphStore();

  return (
    <div style={{
      width: 'var(--rail-w)',
      height: '100%',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-mid)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Top: diagnostic views */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 6 }}>
        {VIEWS.map(v => (
          <RailBtn
            key={v.id}
            id={v.id}
            label={v.label}
            icon={v.icon}
            active={activeView === v.id}
            onClick={() => setActiveView(v.id)}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{
        height: 1, margin: '0 10px',
        background: 'linear-gradient(to right, transparent, var(--border-mid), transparent)',
      }} />

      {/* Bottom: utility drawers */}
      <div style={{ paddingBottom: 6 }}>
        {UTILITY.map(u => (
          <RailBtn
            key={u.id}
            id={u.id}
            label={u.label}
            icon={u.icon}
            active={activeUtility === u.id}
            onClick={() => onUtilityClick(u.id)}
            isUtility
          />
        ))}
      </div>
    </div>
  );
=======
/**
 * Viewrail.jsx
 *
 * Left 44px icon-only navigation rail.
 * Top section: 5 diagnostic views.
 * Bottom section: Dataset + Config utility drawers.
 *
 * Icons are pure SVG inline — no icon library dependency.
 * Active view gets accent left-border and tinted background.
 * Inactive items have tooltip on hover.
 */

import React from 'react';
import { useGraphStore } from '../store/Usegraphstore';

// ---------------------------------------------------------------------------
// Icon definitions — pure SVG paths, 20×20 viewBox
// ---------------------------------------------------------------------------

const ICONS = {
  network: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="7" width="5" height="4" rx="1" />
      <rect x="7.5" y="2" width="5" height="4" rx="1" />
      <rect x="7.5" y="14" width="5" height="4" rx="1" />
      <rect x="13" y="7" width="5" height="4" rx="1" />
      <line x1="7" y1="9" x2="7.5" y2="4" />
      <line x1="7" y1="11" x2="7.5" y2="16" />
      <line x1="12.5" y1="4" x2="13" y2="9" />
      <line x1="12.5" y1="16" x2="13" y2="11" />
    </svg>
  ),
  overview: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="7" height="7" rx="1" />
      <rect x="11" y="2" width="7" height="7" rx="1" />
      <rect x="2" y="11" width="7" height="7" rx="1" />
      <rect x="11" y="11" width="7" height="7" rx="1" />
    </svg>
  ),
  layer: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="4" y1="6" x2="16" y2="6" />
      <line x1="4" y1="10" x2="16" y2="10" />
      <line x1="4" y1="14" x2="12" y2="14" />
      <circle cx="15" cy="14" r="2.5" />
    </svg>
  ),
  epoch: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polyline points="2,14 6,9 9,12 13,6 18,8" />
      <line x1="2" y1="17" x2="18" y2="17" />
    </svg>
  ),
  step: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polygon points="6,4 16,10 6,16" />
      <line x1="3" y1="4" x2="3" y2="16" />
    </svg>
  ),
  dataset: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="10" cy="5" rx="7" ry="2.5" />
      <path d="M3 5v5c0 1.38 3.13 2.5 7 2.5S17 11.38 17 10V5" />
      <path d="M3 10v5c0 1.38 3.13 2.5 7 2.5S17 16.38 17 15v-5" />
    </svg>
  ),
  config: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// View definitions
// ---------------------------------------------------------------------------

const VIEWS = [
  { id: 'network',  label: 'Network',       icon: ICONS.network  },
  { id: 'overview', label: 'Overview',      icon: ICONS.overview },
  { id: 'layer',    label: 'Layer Detail',  icon: ICONS.layer    },
  { id: 'epoch',    label: 'Epoch Trends',  icon: ICONS.epoch    },
  { id: 'step',     label: 'Step Mode',     icon: ICONS.step     },
];

const UTILITY = [
  { id: 'dataset',  label: 'Dataset',    icon: ICONS.dataset },
  { id: 'config',   label: 'Config',     icon: ICONS.config  },
];

// ---------------------------------------------------------------------------
// Rail button
// ---------------------------------------------------------------------------

function RailBtn({ id, label, icon, active, onClick, isUtility = false }) {
  const accent = isUtility ? 'var(--text-secondary)' : 'var(--accent)';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Active indicator — left border */}
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: '50%',
          transform: 'translateY(-50%)',
          width: 2, height: 22, borderRadius: 1,
          background: accent,
          boxShadow: `0 0 8px ${accent}`,
        }} />
      )}

      <button
        onClick={onClick}
        title={label}
        style={{
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 0,
          background: active ? `${accent}10` : 'transparent',
          color: active ? accent : 'var(--text-muted)',
          transition: 'all 0.15s',
          position: 'relative',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = `${accent}08`;
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <div style={{ width: 18, height: 18 }}>
          {icon}
        </div>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ViewRail({ onUtilityClick, activeUtility }) {
  const { activeView, setActiveView } = useGraphStore();

  return (
    <div style={{
      width: 'var(--rail-w)',
      height: '100%',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-mid)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Top: diagnostic views */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 6 }}>
        {VIEWS.map(v => (
          <RailBtn
            key={v.id}
            id={v.id}
            label={v.label}
            icon={v.icon}
            active={activeView === v.id}
            onClick={() => setActiveView(v.id)}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{
        height: 1, margin: '0 10px',
        background: 'linear-gradient(to right, transparent, var(--border-mid), transparent)',
      }} />

      {/* Bottom: utility drawers */}
      <div style={{ paddingBottom: 6 }}>
        {UTILITY.map(u => (
          <RailBtn
            key={u.id}
            id={u.id}
            label={u.label}
            icon={u.icon}
            active={activeUtility === u.id}
            onClick={() => onUtilityClick(u.id)}
            isUtility
          />
        ))}
      </div>
    </div>
  );
>>>>>>> dcaed53 (feat: sync package files for cloudflare)
}