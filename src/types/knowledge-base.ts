import { z } from "zod";

export const KnowledgeBaseCollectionCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  visibility: z.enum(["public", "private"]).default("private"),
  userId: z.string().uuid(),
});

export const KnowledgeBaseCollectionUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export const KnowledgeBaseFileCreateSchema = z.object({
  collectionId: z.string().uuid(),
  name: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  size: z.string(),
  type: z.string(),
  extension: z.string(),
  storageUrl: z.string(), // Retiré .url() pour accepter les chemins relatifs aussi
});

export const AgentCollectionCreateSchema = z.object({
  agentId: z.string().uuid(),
  collectionId: z.string().uuid(),
});

export type KnowledgeBaseCollectionSummary = {
  id: string;
  name: string;
  description?: string;
  userId: string;
  visibility: "public" | "private";
  createdAt: Date;
  updatedAt: Date;
  fileCount: number;
  totalSize: string;
  userName?: string;
  userAvatar?: string;
  isBookmarked?: boolean;
};

export type KnowledgeBaseCollection = KnowledgeBaseCollectionSummary & {
  files: KnowledgeBaseFile[];
};

export type KnowledgeBaseFile = {
  id: string;
  collectionId: string;
  name: string;
  originalName: string;
  size: string;
  type: string;
  extension: string;
  storageUrl: string;
  uploadedAt: Date;
};

export type KnowledgeBaseCollectionRepository = {
  insertCollection(collection: z.infer<typeof KnowledgeBaseCollectionCreateSchema>): Promise<KnowledgeBaseCollection>;
  
  selectCollectionById(id: string, userId: string): Promise<KnowledgeBaseCollection | null>;
  
  selectCollectionsByUserId(userId: string): Promise<KnowledgeBaseCollectionSummary[]>;
  
  selectPublicCollections(userId: string): Promise<KnowledgeBaseCollectionSummary[]>;
  
  updateCollection(
    id: string,
    userId: string,
    collection: z.infer<typeof KnowledgeBaseCollectionUpdateSchema>,
  ): Promise<KnowledgeBaseCollection>;
  
  deleteCollection(id: string, userId: string): Promise<void>;
  
  checkAccess(collectionId: string, userId: string, destructive?: boolean): Promise<boolean>;
  
  // File operations
  insertFile(file: z.infer<typeof KnowledgeBaseFileCreateSchema>): Promise<KnowledgeBaseFile>;
  
  selectFilesByCollectionId(collectionId: string): Promise<KnowledgeBaseFile[]>;
  
  deleteFile(fileId: string, userId: string): Promise<void>;
  
  selectFileById(fileId: string): Promise<KnowledgeBaseFile | null>;
  
  // Agent-Collection associations
  assignCollectionToAgent(agentId: string, collectionId: string): Promise<void>;
  
  removeCollectionFromAgent(agentId: string, collectionId: string): Promise<void>;
  
  selectCollectionsByAgentId(agentId: string): Promise<KnowledgeBaseCollectionSummary[]>;
  
  selectAgentsByCollectionId(collectionId: string): Promise<{ id: string; name: string }[]>;
};
