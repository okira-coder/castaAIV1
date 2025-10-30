'use client';
import React from 'react';

interface SharedKnowledgeBasesManagerProps {
  userId: string;
}

export function SharedKnowledgeBasesManager({ userId }: SharedKnowledgeBasesManagerProps) {
  return (
    <div className="p-4 border border-dashed border-gray-300 rounded-lg">
      <p className="text-sm text-muted-foreground text-center">
        Shared Knowledge Bases Manager will be available here.
      </p>
      <p className="text-xs text-muted-foreground text-center mt-2">
        User ID: {userId}
      </p>
    </div>
  );
}
