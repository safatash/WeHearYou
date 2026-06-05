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
