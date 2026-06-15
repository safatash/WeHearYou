'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { SignOutButton } from '@/components/sign-out-button';

export function UserDropdown({ userName, userEmail }: { userName: string; userEmail: string }) {
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

  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--ink-200)',
          background: 'var(--white)',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            minWidth: '220px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--ink-200)',
            background: 'var(--white)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ink-200)', background: 'var(--ink-50)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', margin: 0 }}>Signed in as</p>
            <p style={{ fontSize: 12, color: 'var(--ink-600)', margin: '2px 0 0 0', wordBreak: 'break-all' }}>{userEmail}</p>
          </div>

          {/* Menu items */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-700)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.background = 'var(--ink-50)')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.background = 'transparent')}
            >
              ⚙️ My Account
            </Link>

            <Link
              href="/billing"
              onClick={() => setOpen(false)}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-700)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.background = 'var(--ink-50)')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.background = 'transparent')}
            >
              💳 Billing
            </Link>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--ink-200)' }} />

          {/* Sign out */}
          <div style={{ padding: '8px' }}>
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
