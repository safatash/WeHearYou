'use client';

import { useState } from 'react';

// Widget type definitions
interface WidgetType {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

const WIDGET_TYPES: WidgetType[] = [
  { id: 'grid', label: 'Wall of Love', icon: '📋', desc: 'Masonry of reviews & videos' },
  { id: 'carousel', label: 'Review carousel', icon: '📜', desc: 'Scrolling row of reviews' },
  { id: 'single', label: 'Single testimonial', icon: '🎬', desc: 'One video or text quote' },
  { id: 'badge', label: 'Rating badge', icon: '⭐', desc: 'Compact score + stars' },
  { id: 'floating', label: 'Floating badge', icon: '💬', desc: 'Sticky corner pill' },
  { id: 'cta', label: 'Collect reviews', icon: '📤', desc: 'Ask customers to review' },
];

// Source metadata
const SOURCE_META: Record<string, { color: string; letter: string }> = {
  Google: { color: '#4285f4', letter: 'G' },
  Facebook: { color: '#1877f2', letter: 'F' },
  Yelp: { color: '#af0606', letter: 'Y' },
  Trustpilot: { color: '#00b800', letter: 'T' },
};

// Mock reviews data
const MOCK_REVIEWS = [
  { id: 1, name: 'Sarah Johnson', rating: 5, text: 'Excellent service and attention to detail. Highly recommend!', time: '2 weeks ago', source: 'Google' },
  { id: 2, name: 'Michael Chen', rating: 5, text: 'Great experience from start to finish. Very professional team.', time: '1 month ago', source: 'Facebook' },
  { id: 3, name: 'Emma Davis', rating: 4, text: 'Good quality work. Minor delays but overall satisfied.', time: '1 month ago', source: 'Yelp' },
  { id: 4, name: 'James Wilson', rating: 5, text: 'Best in the business. Will definitely come back!', time: '2 months ago', source: 'Google' },
  { id: 5, name: 'Lisa Anderson', rating: 5, text: 'Outstanding customer service. They really care about their clients.', time: '2 months ago', source: 'Trustpilot' },
  { id: 6, name: 'Robert Martinez', rating: 4, text: 'Solid performance. Would recommend to friends and family.', time: '3 months ago', source: 'Facebook' },
];

// Widget theme tokens
const getThemeTokens = (theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    return {
      bg: '#17171b',
      card: '#212126',
      line: '#2e2e35',
      text: '#f4f4f5',
      sub: '#a1a1aa',
      muted: '#71717a',
    };
  }
  return {
    bg: '#ffffff',
    card: '#ffffff',
    line: '#e6e6ea',
    text: '#18181b',
    sub: '#52525b',
    muted: '#a1a1aa',
  };
};

// Rating stars component
const Stars = ({ value, size }: { value: number; size: number }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg
        key={i}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={i <= Math.round(value) ? '#fbbf24' : '#e5e7eb'}
        style={{ flex: 'none' }}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

// Review card component
const ReviewCard = ({ review, settings, tokens }: any) => (
  <div
    style={{
      background: tokens.card,
      border: `1px solid ${tokens.line}`,
      borderRadius: settings.radius,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: settings.accent,
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {review.name.charAt(0)}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 620, color: tokens.text }}>{review.name}</div>
        {settings.showDates && <div style={{ fontSize: 11.5, color: tokens.muted }}>{review.time}</div>}
      </div>
      {settings.showSources && (
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            background: SOURCE_META[review.source]?.color,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 10.5,
            fontWeight: 800,
            fontFamily: 'monospace',
          }}
        >
          {SOURCE_META[review.source]?.letter}
        </span>
      )}
    </div>
    <Stars value={review.rating} size={15} />
    <p
      style={{
        fontSize: 13,
        lineHeight: 1.55,
        color: tokens.sub,
        margin: 0,
      }}
    >
      {review.text}
    </p>
  </div>
);

// Widget preview component
const WidgetPreview = ({ settings }: any) => {
  const tokens = getThemeTokens(settings.theme);
  const reviews = MOCK_REVIEWS.filter((r) => r.rating >= settings.minRating).slice(0, settings.maxReviews);

  const Header = () =>
    settings.showHeader ? (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 34, fontWeight: 720, color: tokens.text, fontFamily: 'monospace' }}>4.6</span>
          <Stars value={4.6} size={18} />
        </div>
        <div style={{ height: 30, width: 1, background: tokens.line }} />
        <div style={{ fontSize: 13, color: tokens.sub }}>
          Based on <b style={{ color: tokens.text }}>1,284</b> verified reviews
        </div>
      </div>
    ) : null;

  if (settings.type === 'floating') {
    return (
      <div
        style={{
          position: 'absolute',
          right: 22,
          bottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          background: tokens.card,
          border: `1px solid ${tokens.line}`,
          borderRadius: 999,
          padding: '9px 16px 9px 11px',
          boxShadow: '0 12px 30px -8px rgba(0,0,0,.28)',
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: settings.accent,
            display: 'grid',
            placeItems: 'center',
            flex: 'none',
          }}
        >
          💬
        </span>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 720, color: tokens.text, fontFamily: 'monospace' }}>4.6</span>
            <Stars value={4.6} size={13} />
          </div>
          <div style={{ fontSize: 11, color: tokens.muted }}>1,284 reviews</div>
        </div>
      </div>
    );
  }

  if (settings.type === 'badge') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          background: tokens.card,
          border: `1px solid ${tokens.line}`,
          borderRadius: settings.radius,
          padding: '12px 18px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 720, color: tokens.text, fontFamily: 'monospace' }}>4.6</span>
        <div style={{ lineHeight: 1.3 }}>
          <Stars value={4.6} size={16} />
          <div style={{ fontSize: 11.5, color: tokens.muted, marginTop: 2 }}>1,284 reviews · Excellent</div>
        </div>
      </div>
    );
  }

  if (settings.type === 'cta') {
    return (
      <div
        style={{
          maxWidth: 460,
          margin: '0 auto',
          background: tokens.card,
          border: `1px solid ${tokens.line}`,
          borderRadius: settings.radius,
          padding: 26,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            margin: '0 auto 14px',
            display: 'grid',
            placeItems: 'center',
            background: `color-mix(in srgb, ${settings.accent} 14%, ${tokens.bg})`,
            color: settings.accent,
            fontSize: 24,
          }}
        >
          💬
        </div>
        <h3 style={{ fontSize: 19, fontWeight: 680, color: tokens.text }}>How was your visit?</h3>
        <p style={{ fontSize: 13.5, color: tokens.sub, margin: '8px 0 18px' }}>
          Your feedback helps others find great care.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {Object.keys(SOURCE_META).map((src) => (
            <button
              key={src}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                border: `1px solid ${tokens.line}`,
                background: tokens.bg,
                color: tokens.text,
                borderRadius: 8,
                padding: '9px 13px',
                fontSize: 13,
                fontWeight: 560,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: SOURCE_META[src]?.color,
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 9.5,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                }}
              >
                {SOURCE_META[src]?.letter}
              </span>
              {src}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Grid/Carousel default
  return (
    <div>
      <Header />
      {settings.type === 'grid' ? (
        <div style={{ columns: settings.device === 'mobile' ? '1' : '240px', columnGap: 14 }}>
          {reviews.map((review) => (
            <div key={review.id} style={{ breakInside: 'avoid', marginBottom: 14 }}>
              <ReviewCard review={review} settings={settings} tokens={tokens} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
          {reviews.map((review) => (
            <div key={review.id} style={{ width: 270, flex: 'none' }}>
              <ReviewCard review={review} settings={settings} tokens={tokens} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Site frame component
const SiteFrame = ({ device, children }: any) => {
  const mobile = device === 'mobile';
  return (
    <div
      style={{
        width: mobile ? 390 : '100%',
        maxWidth: mobile ? 390 : 'none',
        margin: '0 auto',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        background: '#fff',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Browser bar */}
      <div
        style={{
          height: 38,
          background: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 14px',
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f0625a' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f5bd4f' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#62c554' }} />
        <div
          style={{
            marginLeft: 10,
            flex: 1,
            maxWidth: 280,
            height: 22,
            borderRadius: 6,
            background: '#fff',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 9px',
            fontSize: 11,
            color: '#9ca3af',
          }}
        >
          🔌 brightsmile.com
        </div>
      </div>
      {children}
    </div>
  );
};

// Control components
const Field = ({ label, hint, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12.5, fontWeight: 580, color: '#374151' }}>{label}</span>
      {hint && <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Segmented = ({ value, options, onChange }: any) => (
  <div style={{ display: 'flex', gap: 3, padding: 3, background: '#f3f4f6', borderRadius: 6 }}>
    {options.map((o: any) => {
      const active = value === o.value;
      return (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            flex: 1,
            border: 0,
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: 5,
            fontSize: 12.5,
            fontWeight: 560,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: active ? '#fff' : 'transparent',
            color: active ? '#111827' : '#6b7280',
            boxShadow: active ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
            transition: 'all .14s',
          }}
        >
          {o.icon && <span>{o.icon}</span>}
          {o.label}
        </button>
      );
    })}
  </div>
);

const Toggle = ({ checked, onChange, label }: any) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: label ? 'space-between' : 'center',
      gap: label ? 12 : 0,
      width: label ? '100%' : 'auto',
      flex: 'none',
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      padding: 0,
    }}
  >
    {label && <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>}
    <span
      style={{
        width: 36,
        height: 21,
        borderRadius: 999,
        flex: 'none',
        background: checked ? '#4f46e5' : '#d1d5db',
        transition: 'background .16s',
        position: 'relative',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 17 : 2,
          width: 17,
          height: 17,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          transition: 'left .16s',
        }}
      />
    </span>
  </button>
);

const Slider = ({ value, min, max, step = 1, onChange }: any) => (
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    style={{ width: '100%', accentColor: '#4f46e5' }}
  />
);

const Swatches = ({ value, options, onChange }: any) => (
  <div style={{ display: 'flex', gap: 8 }}>
    {options.map((c: string) => (
      <button
        key={c}
        onClick={() => onChange(c)}
        aria-label={c}
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          cursor: 'pointer',
          background: c,
          border: value === c ? '2px solid #111827' : '2px solid transparent',
          boxShadow: value === c ? '0 0 0 2px #fff inset' : 'inset 0 0 0 1px rgba(0,0,0,.08)',
          transition: 'all .12s',
        }}
      />
    ))}
  </div>
);

const EmbedCode = ({ settings }: any) => {
  const [copied, setCopied] = useState(false);
  const code = `<!-- WeHearYou ${settings.type} widget -->
<div
  data-wehearyou="wgt_8f2a3c"
  data-type="${settings.type}"
  data-theme="${settings.theme}"
  data-min-rating="${settings.minRating}">
</div>
<script async src="https://cdn.wehearyou.com/v1/embed.js"><\/script>`;

  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontSize: 14, fontWeight: 620, color: '#111827' }}>💻 Embed code</span>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: 6,
            background: '#f3f4f6',
            fontSize: 11,
            fontWeight: 600,
            color: '#6b7280',
            marginLeft: 4,
          }}
        >
          Paste before &lt;/body&gt;
        </span>
        <button
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: copied ? '#dcfce7' : '#f3f4f6',
            color: copied ? '#166534' : '#374151',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={copy}
        >
          {copied ? '✓ Copied' : '📋 Copy code'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '16px 18px',
          background: '#0f0f13',
          color: '#e4e4e7',
          fontSize: 12.5,
          lineHeight: 1.7,
          fontFamily: 'monospace',
          overflowX: 'auto',
        }}
      >
        {code}
      </pre>
    </div>
  );
};

export function WidgetStudio() {
  const [settings, setSettings] = useState({
    type: 'grid',
    theme: 'light' as 'light' | 'dark',
    accent: '#4f46e5',
    radius: 12,
    device: 'desktop' as 'desktop' | 'mobile',
    content: 'mixed',
    minRating: 4,
    maxReviews: 6,
    showAvatars: true,
    showDates: true,
    showSources: true,
    showHeader: true,
    showBranding: true,
  });

  const set = (k: string, v: any) => setSettings((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '28px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Widgets · Mini-sites
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: '-.025em', marginBottom: 8 }}>Widget Studio</h1>
          <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: 0 }}>
            Design a review widget for your site, then copy the embed code. Changes preview live.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            👁️ Preview page
          </button>
          <button style={{ padding: '8px 16px', borderRadius: 8, border: 0, background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ✓ Publish widget
          </button>
        </div>
      </div>

      {/* Type selector */}
      <div className="wtype-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
        {WIDGET_TYPES.map((w) => {
          const active = settings.type === w.id;
          return (
            <button
              key={w.id}
              onClick={() => set('type', w.id)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                padding: 15,
                borderRadius: 12,
                border: active ? '1.5px solid #4f46e5' : '1px solid #e5e7eb',
                background: active ? '#eef2ff' : '#fff',
                boxShadow: active ? '0 0 0 3px rgba(79, 70, 229, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: 11,
                  background: active ? '#4f46e5' : '#f3f4f6',
                  color: active ? '#fff' : '#6b7280',
                  fontSize: 18,
                }}
              >
                {w.icon}
              </span>
              <div style={{ fontSize: 13.5, fontWeight: 620 }}>{w.label}</div>
              <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>{w.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Main: controls + preview */}
      <div className="wstudio-grid" style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: 28, alignItems: 'start' }}>
        {/* Controls */}
        <div style={{ padding: 22, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 640, color: '#111827' }}>⚙️ Customize</span>
          </div>

          {(settings.type === 'grid' || settings.type === 'carousel') && (
            <Field label="Content">
              <Segmented
                value={settings.content}
                onChange={(v: string) => set('content', v)}
                options={[
                  { value: 'reviews', label: 'Reviews' },
                  { value: 'videos', label: 'Videos' },
                  { value: 'mixed', label: 'Mixed' },
                ]}
              />
            </Field>
          )}

          <Field label="Appearance">
            <Segmented
              value={settings.theme}
              onChange={(v: string) => set('theme', v)}
              options={[
                { value: 'light', label: 'Light', icon: '☀️' },
                { value: 'dark', label: 'Dark', icon: '🌙' },
              ]}
            />
          </Field>

          <Field label="Accent">
            <Swatches
              value={settings.accent}
              onChange={(v: string) => set('accent', v)}
              options={['#4f46e5', '#2563eb', '#0e9488', '#7c3aed', '#e0533d', '#18181b']}
            />
          </Field>

          <Field label="Corner radius" hint={`${settings.radius}px`}>
            <Slider value={settings.radius} min={0} max={22} onChange={(v: number) => set('radius', v)} />
          </Field>

          <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />

          <Field label="Minimum rating" hint={`${settings.minRating}★ and up`}>
            <Slider value={settings.minRating} min={1} max={5} onChange={(v: number) => set('minRating', v)} />
          </Field>

          {(settings.type === 'carousel' || settings.type === 'grid') && (
            <Field label="Max reviews shown" hint={`${settings.maxReviews}`}>
              <Slider value={settings.maxReviews} min={1} max={6} onChange={(v: number) => set('maxReviews', v)} />
            </Field>
          )}

          <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />

          <Field label="Display">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(settings.type === 'carousel' || settings.type === 'grid') && (
                <Toggle checked={settings.showHeader} onChange={(v: boolean) => set('showHeader', v)} label="Summary header" />
              )}
              {(settings.type === 'carousel' || settings.type === 'grid') && (
                <Toggle checked={settings.showAvatars} onChange={(v: boolean) => set('showAvatars', v)} label="Reviewer avatars" />
              )}
              {(settings.type === 'carousel' || settings.type === 'grid') && (
                <Toggle checked={settings.showDates} onChange={(v: boolean) => set('showDates', v)} label="Review dates" />
              )}
              {(settings.type === 'carousel' || settings.type === 'grid') && (
                <Toggle checked={settings.showSources} onChange={(v: boolean) => set('showSources', v)} label="Source logos" />
              )}
              <Toggle checked={settings.showBranding} onChange={(v: boolean) => set('showBranding', v)} label={'"Verified by WeHearYou"'} />
            </div>
          </Field>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: '1px solid #e5e7eb' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: '#dcfce7',
                  color: '#166534',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ● Live preview
              </span>
              <span style={{ fontSize: 12.5, color: '#9ca3af' }}>Updates as you edit</span>
              <div style={{ marginLeft: 'auto' }}>
                <Segmented
                  value={settings.device}
                  onChange={(v: string) => set('device', v)}
                  options={[
                    { value: 'desktop', label: '', icon: '🖥️' },
                    { value: 'mobile', label: '', icon: '📱' },
                  ]}
                />
              </div>
            </div>
            <div
              style={{
                padding: 28,
                background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 10px, #fafafa 10px, #fafafa 20px)',
              }}
            >
              <SiteFrame device={settings.device}>
                <div style={{ position: 'relative', background: getThemeTokens(settings.theme).bg, minHeight: 320, padding: settings.device === 'mobile' ? '20px 16px' : '26px 30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 7, background: settings.accent }} />
                      <span style={{ fontWeight: 700, fontSize: 15, color: getThemeTokens(settings.theme).text }}>Bright Smile</span>
                    </div>
                    {settings.device === 'desktop' && (
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: getThemeTokens(settings.theme).sub }}>
                        <span>Services</span>
                        <span>About</span>
                        <span>Book</span>
                      </div>
                    )}
                  </div>
                  {settings.type !== 'badge' && settings.type !== 'cta' && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: settings.device === 'mobile' ? 22 : 30, fontWeight: 720, letterSpacing: '-.03em', color: getThemeTokens(settings.theme).text, maxWidth: 440 }}>
                        Trusted by thousands of happy patients
                      </div>
                      <div style={{ fontSize: 14, color: getThemeTokens(settings.theme).sub, marginTop: 8 }}>See what our community is saying.</div>
                    </div>
                  )}
                  <WidgetPreview settings={settings} />
                </div>
              </SiteFrame>
            </div>
          </div>

          <EmbedCode settings={settings} />
        </div>
      </div>
    </div>
  );
}
