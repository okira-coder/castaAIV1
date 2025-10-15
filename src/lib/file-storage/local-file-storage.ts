import "server-only";
import fs from "fs/promises";
import path from "path";
import {
  FileStorage,
  UploadContent,
  UploadOptions,
  UploadResult,
  UploadUrl,
  UploadUrlOptions,
  FileMetadata,
} from "./file-storage.interface";
import { nanoid } from "nanoid";
import logger from "logger";

const getStorageDir = () => {
  // Always use public/uploads in development and production
  // This ensures files are accessible via HTTP
  const baseDir = "./public/uploads";
  return path.resolve(baseDir);
};

const getFolder = () => {
  return process.env.FILE_STORAGE_PREFIX || "uploads";
};

const generateKey = (filename?: string) => {
  const folder = getFolder();
  const id = nanoid();
  const name = filename ? `${id}-${filename}` : id;
  return `${folder}/${name}`;
};

const contentToBuffer = async (content: UploadContent): Promise<Buffer> => {
  if (content instanceof Buffer) {
    return content;
  }
  
  if (content instanceof Blob || content instanceof File) {
    const arrayBuffer = await content.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  if (content instanceof ArrayBuffer) {
    return Buffer.from(content);
  }
  
  if (ArrayBuffer.isView(content)) {
    return Buffer.from(content.buffer, content.byteOffset, content.byteLength);
  }
  
  // Handle ReadableStream or NodeJS.ReadableStream
  if (content && typeof (content as any).pipe === "function") {
    const chunks: Buffer[] = [];
    const stream = content as NodeJS.ReadableStream;
    
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }
  
  if (content && typeof (content as any).getReader === "function") {
    const reader = (content as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return Buffer.from(result);
    } finally {
      reader.releaseLock();
    }
  }
  
  throw new Error("Unsupported content type for upload");
};

const detectContentType = (filename?: string): string => {
  if (!filename) return "application/octet-stream";
  
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
    json: "application/json",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
  };
  
  return mimeTypes[ext || ""] || "application/octet-stream";
};

export function createLocalFileStorage(): FileStorage {
  return {
    async upload(content: UploadContent, options?: UploadOptions): Promise<UploadResult> {
      try {
        const buffer = await contentToBuffer(content);
        const key = generateKey(options?.filename);
        const contentType = options?.contentType || detectContentType(options?.filename);
        
        // Ensure storage directory exists
        const storageDir = getStorageDir();
        const fullPath = path.join(storageDir, key);
        const dir = path.dirname(fullPath);
        
        await fs.mkdir(dir, { recursive: true });
        
        // Write file
        await fs.writeFile(fullPath, buffer);
        
        logger.info(`Uploaded file locally: ${fullPath}`);
        
        const metadata: FileMetadata = {
          key,
          filename: options?.filename || key,
          contentType,
          size: buffer.length,
          uploadedAt: new Date(),
        };
        
        // Generate public URL (assuming files are served from /uploads)
        const publicUrl = `/uploads/${key}`;
        
        return {
          key,
          sourceUrl: publicUrl,
          metadata,
        };
      } catch (error) {
        logger.error("Local upload failed:", error);
        throw new Error(`Local upload failed: ${error}`);
      }
    },

    async createUploadUrl(options: UploadUrlOptions): Promise<UploadUrl | null> {
      // Local storage doesn't support presigned URLs
      return null;
    },

    async download(key: string): Promise<Buffer> {
      try {
        const storageDir = getStorageDir();
        const fullPath = path.join(storageDir, key);
        return await fs.readFile(fullPath);
      } catch (error) {
        logger.error(`Failed to download file ${key}:`, error);
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      try {
        const storageDir = getStorageDir();
        const fullPath = path.join(storageDir, key);
        await fs.unlink(fullPath);
        logger.info(`Deleted file locally: ${fullPath}`);
      } catch (error) {
        logger.error(`Failed to delete file ${key}:`, error);
        throw error;
      }
    },

    async exists(key: string): Promise<boolean> {
      try {
        const storageDir = getStorageDir();
        const fullPath = path.join(storageDir, key);
        await fs.access(fullPath);
        return true;
      } catch {
        return false;
      }
    },

    async getMetadata(key: string): Promise<FileMetadata | null> {
      try {
        const storageDir = getStorageDir();
        const fullPath = path.join(storageDir, key);
        const stats = await fs.stat(fullPath);
        
        return {
          key,
          filename: path.basename(key),
          contentType: detectContentType(path.basename(key)),
          size: stats.size,
          uploadedAt: stats.birthtime,
        };
      } catch (error) {
        logger.error(`Failed to get metadata for ${key}:`, error);
        return null;
      }
    },

    async getSourceUrl(key: string): Promise<string | null> {
      try {
        if (await this.exists(key)) {
          return `/uploads/${key}`;
        }
        return null;
      } catch (error) {
        logger.error(`Failed to get source URL for ${key}:`, error);
        return null;
      }
    },

    async getDownloadUrl(key: string): Promise<string | null> {
      // For local storage, same as source URL
      return this.getSourceUrl(key);
    },
  };
}