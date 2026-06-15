'use client';

import { useState, useRef, useEffect } from 'react';

interface Location {
  id: string;
  name: string;
}

export function LocationSwitcher({ locations }: { locations: Location[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const currentLocation = locations[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--ink-200)',
          background: 'var(--white)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          color: 'var(--ink-900)',
        }}
      >
        📍 {currentLocation?.name || 'No location'}
        <span style={{ marginLeft: 4, fontSize: 12, transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            minWidth: '200px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--ink-200)',
            background: 'var(--white)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {locations.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-500)' }}>
              No locations
            </div>
          ) : (
            <div>
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    setOpen(false);
                    // TODO: Handle location switch
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    border: 'none',
                    background: location.id === currentLocation?.id ? 'var(--accent-soft)' : 'transparent',
                    color: location.id === currentLocation?.id ? 'var(--accent-strong)' : 'var(--ink-900)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {location.id === currentLocation?.id && <span>✓</span>}
                  {location.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
