'use client';

import React from 'react';
import { AgentKnowledgeBaseConfig } from '@/lib/knowledge-base/types';

interface AgentKnowledgeBasesProps {
  agentId: string;
  knowledgeConfig?: AgentKnowledgeBaseConfig;
  onConfigChange?: (config: AgentKnowledgeBaseConfig) => void;
  hasEditAccess?: boolean;
  disabled?: boolean;
}

export function AgentKnowledgeBases({ 
  agentId, 
  knowledgeConfig, 
  onConfigChange,
  hasEditAccess = true,
  disabled = false
}: AgentKnowledgeBasesProps) {
  // Stub component - Knowledge bases management will be implemented later
  return (
    <div className="p-4 border border-dashed border-gray-300 rounded-lg">
      <p className="text-sm text-muted-foreground text-center">
        Knowledge Bases configuration will be available here.
      </p>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Agent ID: {agentId}
      </p>
    </div>
  );
}