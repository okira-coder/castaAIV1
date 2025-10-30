import z from "zod";

export interface KnowledgeBaseFile {
  name: string;
  size: number;
  extension: string;
  uploaded_at: string;
}

export interface KnowledgeBaseInfo {
  status: 'success' | 'error' | 'empty';
  agent_id: string;
  file_count: number;
  total_size: number;
  last_updated: string;
  files?: KnowledgeBaseFile[];
  error_message?: string;
}

export interface QueryResult {
  answer: string;
  sources?: string[];
}

export const AgentKnowledgeBaseConfigSchema = z.object({
  collections: z.array(z.string()).optional().default([]),
  permissions: z.array(z.string()).optional().default(["read"]),
});

export type AgentKnowledgeBaseConfig = z.infer<typeof AgentKnowledgeBaseConfigSchema>;