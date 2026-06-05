// src/lib/image-validation.ts

/**
 * Single source of truth for MIME type to extension mapping.
 * This ensures that file extensions match their declared MIME types.
 */
const MIME_TYPE_MAP = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

type MimeType = keyof typeof MIME_TYPE_MAP;
const ALLOWED_TYPES: MimeType[] = ["image/jpeg", "image/png", "image/webp"];
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
  if (!ALLOWED_TYPES.includes(file.type as MimeType)) {
    errors.push({
      field: fieldName,
      message: `Invalid file type. Allowed: JPG, PNG, WebP. Got: ${file.type}`,
    });
  }

  // Check file size (0 bytes is invalid)
  if (file.size === 0) {
    errors.push({
      field: fieldName,
      message: "File is empty",
    });
  } else if (file.size > MAX_SIZE_BYTES) {
    errors.push({
      field: fieldName,
      message: `File too large. Maximum ${MAX_SIZE_MB}MB. Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });
  }

  // Check file extension matches MIME type
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext) {
    const validExts = MIME_TYPE_MAP[file.type as MimeType];
    if (!validExts || !validExts.includes(ext)) {
      errors.push({
        field: fieldName,
        message: `File extension .${ext} does not match file type ${file.type}`,
      });
    }
  } else {
    errors.push({
      field: fieldName,
      message: "File has no extension",
    });
  }

  return errors;
}

export function getImageContentType(file: File): string {
  // Validate that this is actually an allowed type
  if (!ALLOWED_TYPES.includes(file.type as MimeType)) {
    throw new Error(`Invalid image type: ${file.type}`);
  }

  // Return the validated content type
  if (file.type === "image/webp") return "image/webp";
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/jpeg") return "image/jpeg";

  // Should never reach here if validation is correct
  throw new Error(`Unexpected image type: ${file.type}`);
}

/**
 * SECURITY NOTE: Browser provides file.type based on file extension, not actual content.
 * Client-side validation here checks format agreement between extension and declared MIME type.
 * However, true validation must happen server-side by reading file headers (magic bytes)
 * to prevent MIME type spoofing attacks where a malicious file is renamed with a valid extension.
 */
