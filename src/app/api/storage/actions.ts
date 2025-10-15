"use server";

import { storageDriver } from "lib/file-storage";
import { IS_VERCEL_ENV } from "lib/const";

/**
 * Get storage configuration info.
 * Used by clients to determine upload strategy.
 */
export async function getStorageInfoAction() {
  return {
    type: storageDriver,
    supportsDirectUpload:
      storageDriver === "vercel-blob" || storageDriver === "s3" || storageDriver === "cloudinary",
  };
}

interface StorageCheckResult {
  isValid: boolean;
  error?: string;
  solution?: string;
}

/**
 * Check if storage is properly configured.
 * Returns detailed error messages with solutions.
 */
export async function checkStorageAction(): Promise<StorageCheckResult> {
  // 1. Check Vercel Blob configuration
  if (storageDriver === "vercel-blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        isValid: false,
        error: "BLOB_READ_WRITE_TOKEN is not set",
        solution:
          "Please add Vercel Blob to your project:\n" +
          "1. Go to your Vercel Dashboard\n" +
          "2. Navigate to Storage tab\n" +
          "3. Create a new Blob Store\n" +
          "4. Connect it to your project\n" +
          (IS_VERCEL_ENV
            ? "5. Redeploy your application"
            : "5. Run 'vercel env pull' to get the token locally"),
      };
    }
  }

  // 2. Check Cloudinary configuration
  if (storageDriver === "cloudinary") {
    const missingVars: string[] = [];
    if (!process.env.CLOUDINARY_CLOUD_NAME) missingVars.push("CLOUDINARY_CLOUD_NAME");
    if (!process.env.CLOUDINARY_API_KEY) missingVars.push("CLOUDINARY_API_KEY");
    if (!process.env.CLOUDINARY_API_SECRET) missingVars.push("CLOUDINARY_API_SECRET");
    
    if (missingVars.length > 0) {
      return {
        isValid: false,
        error: `Missing Cloudinary configuration: ${missingVars.join(", ")}`,
        solution:
          "Please add your Cloudinary credentials to your .env file:\n" +
          "1. Sign up for a free Cloudinary account at https://cloudinary.com\n" +
          "2. Get your credentials from the dashboard\n" +
          "3. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file",
      };
    }
  }

  // 3. Check S3 configuration
  if (storageDriver === "s3") {
    return {
      isValid: false,
      error: "S3 storage is not yet implemented",
      solution:
        "S3 storage support is coming soon.\n" +
        "For now, please use Vercel Blob or Cloudinary",
    };
  }

  // 4. Check local storage (always valid)
  if (storageDriver === "local") {
    return {
      isValid: true,
    };
  }

  // 5. Validate storage driver
  if (!["vercel-blob", "s3", "cloudinary", "local"].includes(storageDriver)) {
    return {
      isValid: false,
      error: `Invalid storage driver: ${storageDriver}`,
      solution:
        "FILE_STORAGE_TYPE must be one of:\n" +
        "- 'local' (default, stores files locally)\n" +
        "- 'vercel-blob'\n" +
        "- 'cloudinary'\n" +
        "- 's3' (coming soon)",
    };
  }

  return {
    isValid: true,
  };
}
