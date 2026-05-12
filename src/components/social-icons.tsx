import type { ReactNode } from "react";

function IconWrapper({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-slate-900" aria-hidden="true">
      {children}
    </span>
  );
}

export function InstagramIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    </IconWrapper>
  );
}

export function FacebookIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.2c0-.9.3-1.5 1.6-1.5H16V5.1c-.5-.1-1.3-.1-2.1-.1-2.1 0-3.4 1.3-3.4 3.7V11H8v3h2.4v7h3.1Z" />
      </svg>
    </IconWrapper>
  );
}

export function XIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M18.9 4H21l-4.6 5.2L22 20h-4.4l-3.5-4.6L10 20H7.9l4.9-5.6L2 4h4.5L9.7 8.3 13.5 4h2.1l-4.9 5.5L18.9 20h-1.4l-8-10.6L18.9 4Z" />
      </svg>
    </IconWrapper>
  );
}

export function LinkedInIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M6.8 8.3a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6ZM5.2 9.8h3.1V19H5.2V9.8Zm5 0h3v1.3h.1c.4-.8 1.5-1.6 3.2-1.6 3.4 0 4 2.1 4 4.9V19h-3.1v-4c0-.9 0-2.2-1.4-2.2s-1.6 1-1.6 2.1V19h-3.1V9.8Z" />
      </svg>
    </IconWrapper>
  );
}

export function YouTubeIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M21.6 8.3a2.8 2.8 0 0 0-2-2c-1.8-.5-7.6-.5-7.6-.5s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C2 10.1 2 12 2 12s0 1.9.4 3.7a2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2c.4-1.8.4-3.7.4-3.7s0-1.9-.4-3.7ZM10 15.2V8.8L15.5 12 10 15.2Z" />
      </svg>
    </IconWrapper>
  );
}

export function TikTokIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M14.4 4c.5 1.5 1.4 2.5 2.8 3.2.8.4 1.6.6 2.4.6v2.7c-1 0-2-.2-2.9-.6v5.4a5 5 0 1 1-5-5h.5v2.7h-.5a2.3 2.3 0 1 0 2.3 2.3V4h.4Z" />
      </svg>
    </IconWrapper>
  );
}
