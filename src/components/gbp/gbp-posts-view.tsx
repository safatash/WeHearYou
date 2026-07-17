"use client";

import { useState } from "react";
import { GbpPublishStatus, GbpPostType } from "@prisma/client";
import { PostComposer } from "./post-composer";

interface Location {
  id: string;
  name: string;
}

interface Post {
  id: string;
  postType: GbpPostType;
  content: string;
  imageUrl: string | null;
  status: GbpPublishStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  location: { id: string; name: string };
}

interface Stats {
  live: number;
  scheduled: number;
  drafts: number;
  failed: number;
}

interface GbpPostsViewProps {
  posts: Post[];
  locations: Location[];
  stats: Stats;
}

const STATUS_META: Record<GbpPublishStatus, { label: string; dot: string; pill: string }> = {
  PUBLISHED: { label: "Live", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  SCHEDULED: { label: "Scheduled", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700" },
  DRAFT: { label: "Draft", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600" },
  FAILED: { label: "Failed", dot: "bg-red-500", pill: "bg-red-50 text-red-700" },
};

const TYPE_META: Record<GbpPostType, { label: string; icon: string }> = {
  WHATS_NEW: { label: "Update", icon: "📣" },
  EVENT: { label: "Event", icon: "📅" },
  OFFER: { label: "Offer", icon: "🏷️" },
};

const TYPE_GRADIENT: Record<GbpPostType, string> = {
  WHATS_NEW: "linear-gradient(135deg, hsl(188 48% 38%), hsl(200 52% 26%))",
  EVENT: "linear-gradient(135deg, hsl(150 48% 38%), hsl(165 52% 24%))",
  OFFER: "linear-gradient(135deg, hsl(40 60% 40%), hsl(25 55% 28%))",
};

const FILTERS = ["All", "Live", "Scheduled", "Draft", "Failed"] as const;
type Filter = (typeof FILTERS)[number];

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PostCard({ post }: { post: Post }) {
  const sm = STATUS_META[post.status];
  const tm = TYPE_META[post.postType];

  const lines = post.content.split("\n").filter(Boolean);
  const title = lines[0]?.length > 70 ? lines[0].slice(0, 68) + "…" : (lines[0] ?? "");
  const summary = lines.length > 1 ? lines.slice(1).join(" ") : post.content;

  const timeLabel =
    post.status === "PUBLISHED" && post.publishedAt
      ? `Published ${timeAgo(post.publishedAt)}`
      : post.status === "SCHEDULED" && post.scheduledAt
      ? `Scheduled ${new Date(post.scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
      : post.status === "DRAFT"
      ? `Draft · ${timeAgo(post.createdAt)}`
      : post.failureReason ?? "Failed";

  return (
    <div className="card flex flex-col overflow-hidden p-0">
      {/* Image area */}
      <div
        className="relative flex h-[110px] items-center justify-center text-white/50"
        style={{ background: post.imageUrl ? `url(${post.imageUrl}) center/cover` : TYPE_GRADIENT[post.postType] }}
      >
        {!post.imageUrl && (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        )}
        {/* Status badge top-left */}
        <span className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${sm.pill}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
          {sm.label}
        </span>
        {/* Type badge top-right */}
        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 backdrop-blur-sm">
          {tm.icon} {tm.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3.5">
        {/* Location */}
        <div className="mb-2 flex items-center gap-1.5">
          <svg className="h-3 w-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span className="text-[12px] font-medium text-slate-500">{post.location.name}</span>
        </div>

        {title && <p className="text-[13.8px] font-[640] tracking-tight text-slate-900 mb-1">{title}</p>}
        <p className="line-clamp-3 flex-1 text-[12.6px] leading-[1.5] text-slate-500">{summary}</p>

        {/* Footer */}
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="flex-1 text-[11.5px] text-slate-400 truncate">{timeLabel}</span>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition" title="Edit">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition" title="More">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function GbpPostsView({ posts, locations, stats }: GbpPostsViewProps) {
  const [filter, setFilter] = useState<Filter>("All");
  const [composerOpen, setComposerOpen] = useState(false);

  const STATUS_MAP: Partial<Record<Filter, GbpPublishStatus>> = {
    Live: "PUBLISHED",
    Scheduled: "SCHEDULED",
    Draft: "DRAFT",
    Failed: "FAILED",
  };

  const filtered = filter === "All" ? posts : posts.filter((p) => p.status === STATUS_MAP[filter]);

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">CONTENT</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Google Posts</h1>
            <p className="mt-1.5 max-w-lg text-sm text-slate-500">
              Updates, events, and offers that show on your Business Profile in Search and Maps.
            </p>
          </div>
          <div className="mt-1 flex shrink-0 gap-2">
            <a
              href="/gbp/posts/scheduler"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Scheduler
            </a>
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#37aeb7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a8a92] transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New post
            </button>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Live posts", value: stats.live, icon: "megaphone" },
            { label: "Scheduled", value: stats.scheduled, icon: "calendar" },
            { label: "Drafts", value: stats.drafts, icon: "file" },
            { label: "Failed", value: stats.failed, icon: "alert" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e0f2f4] text-[#2a8a92]">
                {icon === "megaphone" && <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>}
                {icon === "calendar" && <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                {icon === "file" && <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                {icon === "alert" && <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              </span>
              <div>
                <p className="text-xl font-bold tabular-nums text-slate-950">{value}</p>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                filter === f ? "bg-[#37aeb7] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No posts yet</p>
            <p className="mt-1 text-sm text-slate-400">Create your first Google post to get started.</p>
            <button
              onClick={() => setComposerOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#37aeb7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a8a92] transition"
            >
              + New post
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </div>

      {composerOpen && (
        <PostComposer locations={locations} onClose={() => setComposerOpen(false)} />
      )}
    </>
  );
}
