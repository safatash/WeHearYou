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
