import React, { useEffect, useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import Toolbar     from './components/Toolbar';
import GraphCanvas from './components/Graphcanvas';
import SidePanel   from './components/Sidepanel';
import ViewRail    from './components/Viewrail';
import { useGraphStore } from './store/Usegraphstore';
import { fetchLayerTypes, fetchNodeTypes } from './api/api';
import './styles/global.css';

export default function App() {
  const { setLayerTypes, setNodeTypes } = useGraphStore();
  const [openUtility, setOpenUtility] = useState(null); // 'dataset' | 'config' | null

  const handleUtilityClick = useCallback((id) => {
    setOpenUtility(prev => prev === id ? null : id);
  }, []);

  const handleCloseUtility = useCallback(() => {
    setOpenUtility(null);
  }, []);

  useEffect(() => {
    fetchLayerTypes()
      .then(data => {
        const normalised = {};
        Object.entries(data).forEach(([k, v]) => {
          normalised[k.toLowerCase()] = v;
        });
        setLayerTypes(normalised);
      })
      .catch(() => {});

    fetchNodeTypes()
      .then(data => {
        const normalised = {};
        Object.entries(data).forEach(([k, v]) => {
          normalised[k.replace(/Node$/i, '').toLowerCase()] = v;
        });
        setNodeTypes(normalised);
      })
      .catch(() => {});
  }, []);

  return (
    <ReactFlowProvider>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', width: '100vw',
        overflow: 'hidden', background: 'var(--bg-void)',
      }}>
        <Toolbar />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          <ViewRail
            onUtilityClick={handleUtilityClick}
            activeUtility={openUtility}
          />
          <GraphCanvas />
          <SidePanel
            openUtility={openUtility}
            onCloseUtility={handleCloseUtility}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}