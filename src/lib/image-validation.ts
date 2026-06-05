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
