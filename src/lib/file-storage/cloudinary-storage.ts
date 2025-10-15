import "server-only";
import crypto from "crypto";
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

// Use fetch instead of cloudinary SDK to avoid import issues
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_DELETE_URL = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;

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
  
  // Handle streams
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
  };
  
  return mimeTypes[ext || ""] || "application/octet-stream";
};

// Generate signature for Cloudinary API
const generateSignature = (params: Record<string, string | number>, apiSecret: string): string => {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const stringToSign = `${sortedParams}${apiSecret}`;
  
  return crypto.createHash('sha1').update(stringToSign).digest('hex');
};

export function createCloudinaryStorage(): FileStorage {
  const validateConfig = () => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error("CLOUDINARY_CLOUD_NAME is not set");
    }
    if (!process.env.CLOUDINARY_API_KEY) {
      throw new Error("CLOUDINARY_API_KEY is not set");
    }
    if (!process.env.CLOUDINARY_API_SECRET) {
      throw new Error("CLOUDINARY_API_SECRET is not set");
    }
  };

  return {
    async upload(content: UploadContent, options?: UploadOptions): Promise<UploadResult> {
      validateConfig();
      
      try {
        const buffer = await contentToBuffer(content);
        const key = generateKey(options?.filename);
        const contentType = options?.contentType || detectContentType(options?.filename);
        
        // Prepare form data for Cloudinary upload
        const formData = new FormData();
        const file = new Blob([new Uint8Array(buffer)], { type: contentType });
        
        formData.append('file', file);
        formData.append('public_id', key);
        formData.append('api_key', process.env.CLOUDINARY_API_KEY!);
        formData.append('folder', getFolder());
        
        const timestamp = Math.round(Date.now() / 1000);
        formData.append('timestamp', timestamp.toString());
        
        // Generate signature
        const params = {
          public_id: key,
          timestamp,
          folder: getFolder(),
        };
        
        const signature = generateSignature(params, process.env.CLOUDINARY_API_SECRET!);
        formData.append('signature', signature);
        
        // Upload to Cloudinary
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        
        logger.info(`Uploaded file to Cloudinary: ${result.secure_url}`);
        
        const metadata: FileMetadata = {
          key,
          filename: options?.filename || key,
          contentType,
          size: buffer.length,
          uploadedAt: new Date(),
        };
        
        return {
          key,
          sourceUrl: result.secure_url,
          metadata,
        };
      } catch (error) {
        logger.error("Cloudinary upload failed:", error);
        throw new Error(`Cloudinary upload failed: ${error}`);
      }
    },

    async createUploadUrl(options: UploadUrlOptions): Promise<UploadUrl | null> {
      validateConfig();
      
      try {
        const key = generateKey(options.filename);
        const timestamp = Math.round(Date.now() / 1000);
        const expiresAt = new Date(Date.now() + (options.expiresInSeconds || 3600) * 1000);
        
        // Generate signed upload parameters
        const params = {
          public_id: key,
          timestamp,
          folder: getFolder(),
        };
        
        const signature = generateSignature(params, process.env.CLOUDINARY_API_SECRET!);
        
        return {
          key,
          url: CLOUDINARY_UPLOAD_URL,
          method: "POST",
          expiresAt,
          fields: {
            public_id: key,
            timestamp: timestamp.toString(),
            folder: getFolder(),
            signature,
            api_key: process.env.CLOUDINARY_API_KEY!,
          },
        };
      } catch (error) {
        logger.error("Failed to create Cloudinary upload URL:", error);
        return null;
      }
    },

    async download(key: string): Promise<Buffer> {
      try {
        const url = await this.getSourceUrl(key);
        if (!url) {
          throw new Error(`File not found: ${key}`);
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        logger.error(`Failed to download file ${key}:`, error);
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      validateConfig();
      
      try {
        const timestamp = Math.round(Date.now() / 1000);
        const params = {
          public_id: key,
          timestamp,
        };
        
        const signature = generateSignature(params, process.env.CLOUDINARY_API_SECRET!);
        
        const formData = new FormData();
        formData.append('public_id', key);
        formData.append('api_key', process.env.CLOUDINARY_API_KEY!);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        
        const response = await fetch(CLOUDINARY_DELETE_URL, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Delete failed: ${response.status}`);
        }
        
        logger.info(`Deleted file from Cloudinary: ${key}`);
      } catch (error) {
        logger.error(`Failed to delete file ${key}:`, error);
        throw error;
      }
    },

    async exists(key: string): Promise<boolean> {
      try {
        const url = await this.getSourceUrl(key);
        if (!url) return false;
        
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    },

    async getMetadata(key: string): Promise<FileMetadata | null> {
      try {
        const exists = await this.exists(key);
        if (!exists) return null;
        
        return {
          key,
          filename: key.split('/').pop() || key,
          contentType: "image/jpeg", // Default, could be enhanced
          size: 0, // Would need API call to get actual size
          uploadedAt: new Date(),
        };
      } catch (error) {
        logger.error(`Failed to get metadata for ${key}:`, error);
        return null;
      }
    },

    async getSourceUrl(key: string): Promise<string | null> {
      try {
        // Generate public URL for Cloudinary
        const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
        return `${baseUrl}/${key}`;
      } catch (error) {
        logger.error(`Failed to get source URL for ${key}:`, error);
        return null;
      }
    },

    async getDownloadUrl(key: string): Promise<string | null> {
      try {
        // Generate download URL with attachment flag
        const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
        return `${baseUrl}/fl_attachment/${key}`;
      } catch (error) {
        logger.error(`Failed to get download URL for ${key}:`, error);
        return null;
      }
    },
  };
}