# Video Testimonial Thumbnail Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to upload custom thumbnail images or capture frames from videos, with flexible source selection and intelligent fallback logic.

**Architecture:** Add three new fields to VideoTestimonial (customThumbnailUrl, capturedFrameUrl, thumbnailSource) stored in Vercel Blob. Create utility functions to handle thumbnail retrieval with fallback cascading. Add admin UI component for managing thumbnails. Update all display locations to use the centralized thumbnail lookup.

**Tech Stack:** Prisma (schema), Next.js server actions, Vercel Blob (image storage), Canvas API (frame capture client-side), TypeScript

---

## File Structure

**Database & Types:**
- `prisma/schema.prisma` — Add thumbnail fields to VideoTestimonial model
- `prisma/migrations/[date]_add_video_thumbnail_fields/migration.sql` — Auto-generated migration

**Utilities & Validation:**
- `src/lib/image-validation.ts` (create) — Validate image format, size, content-type
- `src/lib/thumbnail-utils.ts` (create) — Get thumbnail URL with fallback cascade logic
- `src/lib/frame-capture-server.ts` (create) — Server-side frame extraction from video blob
- `src/app/video-testimonials/frame-capture.ts` (create) — Client-side frame capture helper

**Server Actions:**
- `src/app/video-testimonials/actions.ts` — Add: uploadCustomThumbnail, captureVideoFrame, setThumbnailSource, deleteCustomThumbnail, deleteCapturedFrame

**Admin UI:**
- `src/components/video-thumbnail-editor.tsx` (create) — Unified component for thumbnail management
- `src/app/video-testimonials/page.tsx` — Integrate thumbnail editor into video list

**Display & Rendering:**
- `src/lib/review-widgets.ts` — Add thumbnail URL to PublicWidgetVideoTestimonial type
- All components rendering video testimonials — Use getThumbnailUrl for fallback safety

---

## Tasks

### Task 1: Add Schema Fields and Create Migration

**Files:**
- Modify: `prisma/schema.prisma:653-677`
- Create: `prisma/migrations/[date]_add_video_thumbnail_fields/migration.sql`

**Enum definition (add before VideoTestimonial model):**

- [ ] **Step 1: Add ThumbnailSource enum to schema.prisma**

Add this enum before the VideoTestimonial model (around line 652):

```prisma
enum ThumbnailSource {
  DEFAULT
  CUSTOM
  CAPTURED
}
```

- [ ] **Step 2: Add thumbnail fields to VideoTestimonial model**

Update the VideoTestimonial model (lines 653-677) to add these fields after `caption`:

```prisma
model VideoTestimonial {
  id                    String                 @id @default(cuid())
  locationId            String
  token                 String                 @unique
  prompt                String?
  submitterName         String?
  submitterEmail        String?
  videoUrl              String?
  mimeType              String?
  durationSeconds       Int?
  caption               String?                // Admin-provided text accompanying the video
  customThumbnailUrl    String?                // Admin-uploaded custom thumbnail image
  capturedFrameUrl      String?                // Extracted frame from video
  capturedFrameTimestamp Float?                // Seconds into video where frame was captured
  thumbnailSource       ThumbnailSource        @default(DEFAULT) // Which thumbnail to display
  status                VideoTestimonialStatus @default(PENDING)
  publishedAt           DateTime?
  expiresAt             DateTime?
  usedAt                DateTime?
  revokedAt             DateTime?
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  location              Location               @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@index([locationId])
  @@index([token])
  @@index([status])
}
```

- [ ] **Step 3: Generate migration file**

Run: `npx prisma migrate dev --name add_video_thumbnail_fields`

Expected: Migration file created at `prisma/migrations/[timestamp]_add_video_thumbnail_fields/migration.sql`

- [ ] **Step 4: Verify migration applied**

Run: `npx prisma db push`

Expected: "Database synced" message, no errors

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add video thumbnail fields to schema"
```

---

### Task 2: Create Image Validation Utility

**Files:**
- Create: `src/lib/image-validation.ts`

- [ ] **Step 1: Create validation utility**

```typescript
// src/lib/image-validation.ts

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface ValidationError {
  field: string;
  message: string;
}

export function validateImageFile(
  file: File | null,
  fieldName: string = "image"
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!file) {
    errors.push({ field: fieldName, message: "No file provided" });
    return errors;
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push({
      field: fieldName,
      message: `Invalid file type. Allowed: JPG, PNG, WebP. Got: ${file.type}`,
    });
  }

  // Check file size
  if (file.size > MAX_SIZE_BYTES) {
    errors.push({
      field: fieldName,
      message: `File too large. Maximum ${MAX_SIZE_MB}MB. Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });
  }

  // Check file extension matches type
  const ext = file.name.split(".").pop()?.toLowerCase();
  const validExts = ["jpg", "jpeg", "png", "webp"];
  if (ext && !validExts.includes(ext)) {
    errors.push({
      field: fieldName,
      message: `Invalid file extension: .${ext}`,
    });
  }

  return errors;
}

export function getImageContentType(file: File): string {
  if (file.type === "image/webp") return "image/webp";
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/jpeg") return "image/jpeg";
  return "image/jpeg"; // default fallback
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors related to image-validation.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/image-validation.ts
git commit -m "feat: add image validation utility for thumbnail uploads"
```

---

### Task 3: Create Thumbnail Retrieval Utility with Fallback Logic

**Files:**
- Create: `src/lib/thumbnail-utils.ts`

- [ ] **Step 1: Create thumbnail utility**

```typescript
// src/lib/thumbnail-utils.ts

import { ThumbnailSource } from "@prisma/client";

interface ThumbnailUrls {
  customThumbnailUrl?: string | null;
  capturedFrameUrl?: string | null;
  videoUrl?: string | null;
  thumbnailSource: ThumbnailSource;
}

/**
 * Get the appropriate thumbnail URL based on admin's selection and availability.
 * Falls back gracefully if selected source is unavailable.
 * Cascade: selected source → other available source → default (first frame of video)
 */
export function getThumbnailUrl(thumbnails: ThumbnailUrls): string | null {
  const { customThumbnailUrl, capturedFrameUrl, videoUrl, thumbnailSource } =
    thumbnails;

  // Try the selected source first
  if (thumbnailSource === "CUSTOM" && customThumbnailUrl) {
    return customThumbnailUrl;
  }

  if (thumbnailSource === "CAPTURED" && capturedFrameUrl) {
    return capturedFrameUrl;
  }

  // Fallback 1: Try other available thumbnail sources
  if (customThumbnailUrl) {
    return customThumbnailUrl;
  }

  if (capturedFrameUrl) {
    return capturedFrameUrl;
  }

  // Fallback 2: Default to first frame of video (no separate URL needed, handled by <video> element)
  // Return null to signal "use default video thumbnail"
  return null;
}

/**
 * Get alt text for thumbnail based on available context
 */
export function getThumbnailAlt(submitterName?: string | null): string {
  if (submitterName) {
    return `Video testimonial from ${submitterName}`;
  }
  return "Video testimonial thumbnail";
}

/**
 * Check which thumbnail sources are available
 */
export function getAvailableThumbnailSources(thumbnails: ThumbnailUrls): ThumbnailSource[] {
  const available: ThumbnailSource[] = ["DEFAULT"];

  if (thumbnails.customThumbnailUrl) {
    available.push("CUSTOM");
  }

  if (thumbnails.capturedFrameUrl) {
    available.push("CAPTURED");
  }

  return available;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors related to thumbnail-utils.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/thumbnail-utils.ts
git commit -m "feat: add thumbnail retrieval utility with fallback logic"
```

---

### Task 4: Create Server-Side Frame Extraction Utility

**Files:**
- Create: `src/lib/frame-capture-server.ts`

- [ ] **Step 1: Create server-side frame utility**

```typescript
// src/lib/frame-capture-server.ts

/**
 * Extract a frame from video blob at specified timestamp.
 * Accepts base64-encoded frame data from client and returns blob URL.
 */
export async function saveFrameAsImage(
  frameBase64: string,
  format: "webp" | "png" = "webp"
): Promise<string> {
  // Convert base64 to buffer
  const base64Data = frameBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // Upload to Vercel Blob
  const { put } = await import("@vercel/blob");
  const blob = await put(
    `video-thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.${format}`,
    buffer,
    {
      access: "public",
      contentType: format === "webp" ? "image/webp" : "image/png",
    }
  );

  return blob.url;
}

/**
 * Validate that the captured frame data is valid base64-encoded image
 */
export function isValidFrameData(frameBase64: string): boolean {
  if (!frameBase64) return false;
  if (!frameBase64.startsWith("data:image/")) return false;
  if (!frameBase64.includes(";base64,")) return false;
  return true;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors related to frame-capture-server.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/frame-capture-server.ts
git commit -m "feat: add server-side frame capture utility"
```

---

### Task 5: Create Client-Side Frame Capture Helper

**Files:**
- Create: `src/app/video-testimonials/frame-capture.ts`

- [ ] **Step 1: Create client-side frame helper**

```typescript
// src/app/video-testimonials/frame-capture.ts

/**
 * Capture a frame from a video element at specified timestamp.
 * Returns base64-encoded image data.
 */
export function captureFrameFromVideo(
  videoElement: HTMLVideoElement,
  timestamp: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 360;

    // Seek to timestamp and capture frame
    videoElement.currentTime = timestamp;

    const onSeeked = () => {
      try {
        // Draw current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Convert to base64 PNG
        const imageData = canvas.toDataURL("image/png");
        resolve(imageData);
      } catch (error) {
        reject(error);
      } finally {
        videoElement.removeEventListener("seeked", onSeeked);
      }
    };

    videoElement.addEventListener("seeked", onSeeked);

    // Trigger seek
    try {
      videoElement.currentTime = timestamp;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format timestamp for display (e.g., "2.5s" or "1m 30s")
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Clamp a timestamp to valid video duration
 */
export function clampTimestamp(timestamp: number, maxDuration: number): number {
  return Math.max(0, Math.min(timestamp, Math.max(0, maxDuration - 0.1)));
}
```

- [ ] **Step 2: Verify this is client-side code (no server imports)**

The file should NOT import anything from server actions or prisma. Verify by checking the file contains only Canvas API and video element handling.

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors related to frame-capture.ts

- [ ] **Step 4: Commit**

```bash
git add src/app/video-testimonials/frame-capture.ts
git commit -m "feat: add client-side frame capture helper"
```

---

### Task 6: Add Server Actions for Thumbnail Management

**Files:**
- Modify: `src/app/video-testimonials/actions.ts`

- [ ] **Step 1: Add imports at top of file**

Add these imports after existing imports:

```typescript
import { ThumbnailSource } from "@prisma/client";
import { validateImageFile, getImageContentType } from "@/lib/image-validation";
import { isValidFrameData, saveFrameAsImage } from "@/lib/frame-capture-server";
import { del } from "@vercel/blob";
```

- [ ] **Step 2: Add uploadCustomThumbnail action**

Add this new function at the end of actions.ts:

```typescript
export async function uploadCustomThumbnail(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!id) throw new Error("ID is required");
  if (!file) throw new Error("File is required");

  // Validate image
  const validationErrors = validateImageFile(file, "thumbnail");
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.map((e) => e.message).join("; "));
  }

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true, customThumbnailUrl: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  // Delete old custom thumbnail if exists
  if (testimonial.customThumbnailUrl) {
    try {
      await del(testimonial.customThumbnailUrl);
    } catch {
      // Ignore deletion errors
    }
  }

  // Upload new thumbnail
  const { put } = await import("@vercel/blob");
  const contentType = getImageContentType(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(
    `video-thumbnails/${id}-custom-${Date.now()}.webp`,
    buffer,
    {
      access: "public",
      contentType: "image/webp",
    }
  );

  // Update database: save URL and auto-select custom source
  await prisma.videoTestimonial.update({
    where: { id },
    data: {
      customThumbnailUrl: blob.url,
      thumbnailSource: "CUSTOM",
    },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Custom+thumbnail+uploaded&tone=success");
}

export async function captureVideoFrame(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const frameData = String(formData.get("frameData") ?? "").trim();
  const timestamp = parseFloat(String(formData.get("timestamp") ?? "0"));

  if (!id) throw new Error("ID is required");
  if (!frameData) throw new Error("Frame data is required");
  if (!isValidFrameData(frameData)) {
    throw new Error("Invalid frame data format");
  }

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true, capturedFrameUrl: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  // Delete old captured frame if exists
  if (testimonial.capturedFrameUrl) {
    try {
      await del(testimonial.capturedFrameUrl);
    } catch {
      // Ignore deletion errors
    }
  }

  // Save captured frame
  const frameUrl = await saveFrameAsImage(frameData, "webp");

  // Update database: save URL, timestamp, and auto-select captured source
  await prisma.videoTestimonial.update({
    where: { id },
    data: {
      capturedFrameUrl: frameUrl,
      capturedFrameTimestamp: isNaN(timestamp) ? null : timestamp,
      thumbnailSource: "CAPTURED",
    },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Frame+captured+successfully&tone=success");
}

export async function setThumbnailSource(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim().toUpperCase();

  if (!id) throw new Error("ID is required");
  if (!["DEFAULT", "CUSTOM", "CAPTURED"].includes(source)) {
    throw new Error("Invalid thumbnail source");
  }

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  await prisma.videoTestimonial.update({
    where: { id },
    data: { thumbnailSource: source as ThumbnailSource },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Thumbnail+source+updated&tone=success");
}

export async function deleteCustomThumbnail(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) throw new Error("ID is required");

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: {
      locationId: true,
      customThumbnailUrl: true,
      thumbnailSource: true,
      capturedFrameUrl: true,
    },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  // Delete from blob storage
  if (testimonial.customThumbnailUrl) {
    try {
      await del(testimonial.customThumbnailUrl);
    } catch {
      // Ignore deletion errors
    }
  }

  // Determine fallback source
  let fallbackSource = "DEFAULT" as ThumbnailSource;
  if (testimonial.capturedFrameUrl) {
    fallbackSource = "CAPTURED";
  }

  // Update database: clear URL and fall back if needed
  const newSource =
    testimonial.thumbnailSource === "CUSTOM" ? fallbackSource : testimonial.thumbnailSource;

  await prisma.videoTestimonial.update({
    where: { id },
    data: {
      customThumbnailUrl: null,
      thumbnailSource: newSource,
    },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Custom+thumbnail+removed&tone=info");
}

export async function deleteCapturedFrame(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) throw new Error("ID is required");

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: {
      locationId: true,
      capturedFrameUrl: true,
      thumbnailSource: true,
      customThumbnailUrl: true,
    },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  // Delete from blob storage
  if (testimonial.capturedFrameUrl) {
    try {
      await del(testimonial.capturedFrameUrl);
    } catch {
      // Ignore deletion errors
    }
  }

  // Determine fallback source
  let fallbackSource = "DEFAULT" as ThumbnailSource;
  if (testimonial.customThumbnailUrl) {
    fallbackSource = "CUSTOM";
  }

  // Update database: clear URL and fall back if needed
  const newSource =
    testimonial.thumbnailSource === "CAPTURED" ? fallbackSource : testimonial.thumbnailSource;

  await prisma.videoTestimonial.update({
    where: { id },
    data: {
      capturedFrameUrl: null,
      capturedFrameTimestamp: null,
      thumbnailSource: newSource,
    },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Captured+frame+removed&tone=info");
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors in actions.ts

- [ ] **Step 4: Commit**

```bash
git add src/app/video-testimonials/actions.ts
git commit -m "feat: add server actions for thumbnail upload, capture, selection, and deletion"
```

---

### Task 7: Create Video Thumbnail Editor Component

**Files:**
- Create: `src/components/video-thumbnail-editor.tsx`

- [ ] **Step 1: Create component**

```typescript
"use client";

import { useRef, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  uploadCustomThumbnail,
  captureVideoFrame,
  setThumbnailSource,
  deleteCustomThumbnail,
  deleteCapturedFrame,
} from "@/app/video-testimonials/actions";
import {
  captureFrameFromVideo,
  formatTimestamp,
  clampTimestamp,
} from "@/app/video-testimonials/frame-capture";
import { getThumbnailUrl, getAvailableThumbnailSources, getThumbnailAlt } from "@/lib/thumbnail-utils";
import { ThumbnailSource } from "@prisma/client";

interface VideoThumbnailEditorProps {
  videoId: string;
  videoUrl: string;
  durationSeconds?: number | null;
  submitterName?: string | null;
  customThumbnailUrl?: string | null;
  capturedFrameUrl?: string | null;
  capturedFrameTimestamp?: number | null;
  thumbnailSource: ThumbnailSource;
}

export function VideoThumbnailEditor({
  videoId,
  videoUrl,
  durationSeconds,
  submitterName,
  customThumbnailUrl,
  capturedFrameUrl,
  capturedFrameTimestamp,
  thumbnailSource,
}: VideoThumbnailEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureTimestamp, setCaptureTimestamp] = useState(
    capturedFrameTimestamp ?? Math.min(1, (durationSeconds ?? 10) / 2)
  );
  const [captureError, setCaptureError] = useState<string | null>(null);

  const availableSources = getAvailableThumbnailSources({
    customThumbnailUrl,
    capturedFrameUrl,
    videoUrl,
    thumbnailSource,
  });

  const currentThumbnailUrl = getThumbnailUrl({
    customThumbnailUrl,
    capturedFrameUrl,
    videoUrl,
    thumbnailSource,
  });

  const handleCapture = async () => {
    if (!videoRef.current) {
      setCaptureError("Video element not found");
      return;
    }

    setIsCapturing(true);
    setCaptureError(null);

    try {
      const frameData = await captureFrameFromVideo(videoRef.current, captureTimestamp);

      // Submit to server action
      const form = new FormData();
      form.set("id", videoId);
      form.set("frameData", frameData);
      form.set("timestamp", String(captureTimestamp));

      await captureVideoFrame(form);
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : "Failed to capture frame"
      );
      setIsCapturing(false);
    }
  };

  const maxTimestamp = durationSeconds ? Math.max(0, durationSeconds - 0.1) : 30;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 text-sm mb-3">
          Thumbnail Settings
        </h3>

        {/* Current Thumbnail Display */}
        <div className="mb-4 p-3 rounded-lg bg-white border border-slate-200">
          <p className="text-xs font-medium text-slate-600 mb-2">
            Current Thumbnail
          </p>
          {currentThumbnailUrl ? (
            <img
              src={currentThumbnailUrl}
              alt={getThumbnailAlt(submitterName)}
              className="w-full h-32 object-cover rounded-lg bg-slate-100"
            />
          ) : (
            <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
              <span className="text-sm">No thumbnail</span>
            </div>
          )}
        </div>

        {/* Thumbnail Source Selector */}
        {availableSources.length > 1 && (
          <div className="mb-4 p-3 rounded-lg bg-white border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Use thumbnail from:
            </p>
            <div className="space-y-2">
              {availableSources.map((source) => (
                <label key={source} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`thumbnail-source-${videoId}`}
                    value={source}
                    checked={thumbnailSource === source}
                    onChange={(e) => {
                      const form = new FormData();
                      form.set("id", videoId);
                      form.set("source", e.target.value);
                      setThumbnailSource(form);
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-slate-700">
                    {source === "CUSTOM" && "Uploaded custom image"}
                    {source === "CAPTURED" && "Captured frame"}
                    {source === "DEFAULT" && "Default (first frame)"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Custom Upload */}
        <div className="mb-4 p-3 rounded-lg bg-white border border-slate-200">
          <p className="text-xs font-medium text-slate-600 mb-2">
            Upload Custom Thumbnail
          </p>
          <p className="text-xs text-slate-500 mb-2">
            JPG, PNG, or WebP. Max 5MB.
          </p>
          <form action={uploadCustomThumbnail} className="flex gap-2">
            <input type="hidden" name="id" value={videoId} />
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              className="flex-1 text-xs"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const form = new FormData();
                  form.set("id", videoId);
                  form.set("file", e.target.files[0]);
                  uploadCustomThumbnail(form);
                }
              }}
            />
            {customThumbnailUrl && (
              <form action={deleteCustomThumbnail}>
                <input type="hidden" name="id" value={videoId} />
                <FormSubmitButton
                  idleLabel="Remove"
                  pendingLabel="Removing…"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:border-rose-300"
                />
              </form>
            )}
          </form>
        </div>

        {/* Frame Capture */}
        {videoUrl && (
          <div className="p-3 rounded-lg bg-white border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Capture Frame from Video
            </p>

            {/* Video Preview */}
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-32 bg-slate-900 rounded-lg mb-2"
            />

            {/* Timestamp Slider */}
            {durationSeconds && durationSeconds > 0 && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor={`capture-slider-${videoId}`}
                    className="text-xs font-medium text-slate-600"
                  >
                    Capture at:
                  </label>
                  <span className="text-xs text-slate-500">
                    {formatTimestamp(captureTimestamp)}
                  </span>
                </div>
                <input
                  id={`capture-slider-${videoId}`}
                  type="range"
                  min="0"
                  max={maxTimestamp}
                  step="0.1"
                  value={captureTimestamp}
                  onChange={(e) => setCaptureTimestamp(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {/* Error Message */}
            {captureError && (
              <div className="mb-2 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {captureError}
              </div>
            )}

            {/* Capture Button */}
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCapturing ? "Capturing…" : "Capture Frame"}
            </button>

            {/* Remove Captured Frame */}
            {capturedFrameUrl && (
              <form action={deleteCapturedFrame} className="mt-2">
                <input type="hidden" name="id" value={videoId} />
                <FormSubmitButton
                  idleLabel="Remove Captured Frame"
                  pendingLabel="Removing…"
                  className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:border-rose-300"
                />
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors in video-thumbnail-editor.tsx

- [ ] **Step 3: Commit**

```bash
git add src/components/video-thumbnail-editor.tsx
git commit -m "feat: add video thumbnail editor component with upload and frame capture"
```

---

### Task 8: Update Admin Video List Page to Include Thumbnail Editor

**Files:**
- Modify: `src/app/video-testimonials/page.tsx`

- [ ] **Step 1: Add import for VideoThumbnailEditor and getThumbnailUrl**

Add after existing imports at the top:

```typescript
import { VideoThumbnailEditor } from "@/components/video-thumbnail-editor";
import { getThumbnailUrl, getThumbnailAlt } from "@/lib/thumbnail-utils";
```

- [ ] **Step 2: Add thumbnail fields to the Prisma query**

Update the videoTestimonials select (around line 56) to include:

```typescript
customThumbnailUrl: true,
capturedFrameUrl: true,
capturedFrameTimestamp: true,
thumbnailSource: true,
```

The select block should now be:

```typescript
select: {
  id: true,
  token: true,
  prompt: true,
  submitterName: true,
  submitterEmail: true,
  videoUrl: true,
  durationSeconds: true,
  status: true,
  createdAt: true,
  caption: true,
  customThumbnailUrl: true,
  capturedFrameUrl: true,
  capturedFrameTimestamp: true,
  thumbnailSource: true,
},
```

- [ ] **Step 3: Update the thumbnail display in the map**

Find the thumbnail display section (around line 143-153) and replace it with:

```typescript
{/* Thumbnail */}
{vt.videoUrl ? (
  (() => {
    const thumbnailUrl = getThumbnailUrl({
      customThumbnailUrl: vt.customThumbnailUrl,
      capturedFrameUrl: vt.capturedFrameUrl,
      videoUrl: vt.videoUrl,
      thumbnailSource: vt.thumbnailSource,
    });

    return thumbnailUrl ? (
      <img
        src={thumbnailUrl}
        alt={getThumbnailAlt(vt.submitterName)}
        className="w-24 h-16 flex-shrink-0 rounded-lg bg-slate-900 object-cover"
      />
    ) : (
      <video
        src={vt.videoUrl}
        preload="metadata"
        className="w-24 h-16 flex-shrink-0 rounded-lg bg-slate-900 object-cover"
      />
    );
  })()
) : (
  <div className="w-24 h-16 flex-shrink-0 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-2xl">
    🎥
  </div>
)}
```

- [ ] **Step 4: Add thumbnail editor component after the caption editor**

Find where the caption form ends (around line 189) and add the VideoThumbnailEditor component before the action buttons:

```typescript
<VideoThumbnailEditor
  videoId={vt.id}
  videoUrl={vt.videoUrl ?? ""}
  durationSeconds={vt.durationSeconds}
  submitterName={vt.submitterName}
  customThumbnailUrl={vt.customThumbnailUrl}
  capturedFrameUrl={vt.capturedFrameUrl}
  capturedFrameTimestamp={vt.capturedFrameTimestamp}
  thumbnailSource={vt.thumbnailSource}
/>
```

The layout should be: thumbnail display → caption form → thumbnail editor → action buttons.

- [ ] **Step 5: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors in video-testimonials/page.tsx

- [ ] **Step 6: Commit**

```bash
git add src/app/video-testimonials/page.tsx
git commit -m "feat: integrate thumbnail editor into admin video list"
```

---

### Task 9: Update Video Testimonial Type in Review Widgets

**Files:**
- Modify: `src/lib/review-widgets.ts`

- [ ] **Step 1: Find and update PublicWidgetVideoTestimonial type**

Search for `interface PublicWidgetVideoTestimonial` and add these fields:

```typescript
customThumbnailUrl: string | null;
capturedFrameUrl: string | null;
capturedFrameTimestamp: number | null;
thumbnailSource: string;
```

- [ ] **Step 2: Update single testimonial fetch query**

Find the location where single testimonial is fetched and add to select:

```typescript
customThumbnailUrl: true,
capturedFrameUrl: true,
capturedFrameTimestamp: true,
thumbnailSource: true,
```

And add to the map return:

```typescript
customThumbnailUrl: vt.customThumbnailUrl,
capturedFrameUrl: vt.capturedFrameUrl,
capturedFrameTimestamp: vt.capturedFrameTimestamp,
thumbnailSource: vt.thumbnailSource,
```

- [ ] **Step 3: Update location video testimonials fetch query**

Find location's videoTestimonials fetch and add the same select fields and map returns.

- [ ] **Step 4: Update public listing fetch query**

Find public listing query and add the same select fields and map returns.

- [ ] **Step 5: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors in review-widgets.ts

- [ ] **Step 6: Commit**

```bash
git add src/lib/review-widgets.ts
git commit -m "feat: add thumbnail fields to PublicWidgetVideoTestimonial type"
```

---

### Task 10: Update Embed and Display Components to Use Thumbnail URLs

**Files:**
- Modify: Components that render video testimonials

- [ ] **Step 1: Find all video testimonial display locations**

Search codebase for files importing or using video testimonials:

```bash
grep -r "videoTestimonials\|PublicWidgetVideoTestimonial" src/ --include="*.tsx" --include="*.ts" | grep -v ".next" | grep -v "node_modules"
```

Common locations to check:
- `src/app/embed/vt/[id]/page.tsx`
- `src/components/` — any video testimonial card/display components
- `src/app/widgets/` — widget rendering components

- [ ] **Step 2: For each component that displays video testimonial thumbnail**

Replace the video thumbnail display with:

```typescript
import { getThumbnailUrl, getThumbnailAlt } from "@/lib/thumbnail-utils";

// In render:
const thumbnailUrl = getThumbnailUrl({
  customThumbnailUrl: vt.customThumbnailUrl,
  capturedFrameUrl: vt.capturedFrameUrl,
  videoUrl: vt.videoUrl,
  thumbnailSource: vt.thumbnailSource,
});

{thumbnailUrl ? (
  <img
    src={thumbnailUrl}
    alt={getThumbnailAlt(vt.submitterName)}
    className="/* your classes */"
  />
) : (
  <video
    src={vt.videoUrl}
    preload="metadata"
    className="/* your classes */"
  />
)}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npm run typecheck`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: use thumbnail URLs in all video testimonial display locations"
```

---

### Task 11: Validation and Build Checks

**Files:**
- No files to modify; running verification

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: ✓ No errors (except possibly unrelated pre-existing issues)

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: ✓ Build completes successfully, no errors

- [ ] **Step 3: Commit if all checks pass**

```bash
git add -A
git commit -m "feat: video thumbnail feature complete - all checks passing"
```

---

## Summary

✅ **Schema:** Added custom thumbnail URL, captured frame URL, frame timestamp, and source selector to VideoTestimonial
✅ **Validation:** Image format (JPG, PNG, WebP) and size (5MB max) validation
✅ **Frame Capture:** Client-side frame extraction, server-side blob storage
✅ **Thumbnail Selection:** Admin can choose which source to display, with intelligent fallback
✅ **Admin UI:** Unified thumbnail editor component with upload, capture, and source selection
✅ **Display Logic:** Centralized getThumbnailUrl utility ensures consistent fallback behavior everywhere
✅ **Cleanup:** Separate removal of custom vs captured thumbnails, with auto-fallback
✅ **Accessibility:** Alt text for all thumbnail images

**Files Created:**
- `src/lib/image-validation.ts`
- `src/lib/thumbnail-utils.ts`
- `src/lib/frame-capture-server.ts`
- `src/app/video-testimonials/frame-capture.ts`
- `src/components/video-thumbnail-editor.tsx`
- `prisma/migrations/[date]_add_video_thumbnail_fields/`

**Files Modified:**
- `prisma/schema.prisma`
- `src/app/video-testimonials/actions.ts`
- `src/app/video-testimonials/page.tsx`
- `src/lib/review-widgets.ts`
- Video testimonial display components throughout codebase
