import React from 'react';
import { useStore } from './store';

export function TelemetryHUD() {
  const telemetry = useStore(s => s.streamingTelemetry);

  if (!telemetry) return null;

  const totalReqs = telemetry.cacheHits + telemetry.cacheMisses;
  const hitRate = totalReqs > 0
    ? (telemetry.cacheHits / totalReqs * 100).toFixed(1)
    : '0.0';

  const mbTransferred = (telemetry.bytesTransferred / 1024 / 1024).toFixed(2);
  const mbCacheSize = (telemetry.cacheSize / 1024 / 1024).toFixed(2);

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      borderLeft: '4px solid #0ff',
      padding: '12px 16px',
      color: '#e5e2e1',
      fontFamily: 'monospace',
      fontSize: 12,
      zIndex: 200,
      pointerEvents: 'none',
      textTransform: 'uppercase',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 220,
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        color: '#0ff', 
        letterSpacing: '0.1em', 
        borderBottom: '1px solid rgba(0,255,255,0.2)',
        paddingBottom: 4,
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>query_stats</span>
        TELEMETRY HUD
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 16px' }}>
        <span style={{ opacity: 0.7 }}>Network Egress:</span>
        <span style={{ color: '#0ff', fontWeight: 600 }}>{mbTransferred} MB</span>
        
        <span style={{ opacity: 0.7 }}>LRU Cache Size:</span>
        <span style={{ color: '#0ff', fontWeight: 600 }}>{mbCacheSize} MB</span>
        
        <span style={{ opacity: 0.7 }}>Cache Hits:</span>
        <span style={{ color: '#0ff', fontWeight: 600 }}>{telemetry.cacheHits}</span>
        
        <span style={{ opacity: 0.7 }}>Cache Misses:</span>
        <span style={{ color: '#0ff', fontWeight: 600 }}>{telemetry.cacheMisses}</span>
        
        <span style={{ opacity: 0.7 }}>Efficiency:</span>
        <span style={{ color: '#0ff', fontWeight: 600 }}>{hitRate}%</span>
      </div>
    </div>
  );
}
