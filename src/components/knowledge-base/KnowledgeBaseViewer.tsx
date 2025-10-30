'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Brain, FileText, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { KnowledgeBaseInfo } from '@/lib/knowledge-base/types';

interface KnowledgeBaseViewerProps {
  agentId: string;
  className?: string;
}

export function KnowledgeBaseViewer({ agentId, className }: KnowledgeBaseViewerProps) {
  const [knowledgeInfo, setKnowledgeInfo] = useState<KnowledgeBaseInfo | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKnowledgeInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: Remplacer par l&apos;appel réel au MCP client
      // const client = await getMCPClient();
      // const info = await client.getKnowledgeBaseInfo(agentId);
      
      // Simulation pour l&apos;instant
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockInfo: KnowledgeBaseInfo = {
        status: 'success',
        agent_id: agentId,
        file_count: 3,
        total_size: 1024 * 512, // 512 KB
        last_updated: new Date().toISOString(),
        files: [
          {
            name: 'documentation.pdf',
            size: 1024 * 200,
            extension: '.pdf',
            uploaded_at: new Date(Date.now() - 86400000).toISOString(), // 1 jour
          },
          {
            name: 'notes.txt',
            size: 1024 * 50,
            extension: '.txt',
            uploaded_at: new Date(Date.now() - 172800000).toISOString(), // 2 jours
          },
          {
            name: 'guide.md',
            size: 1024 * 262,
            extension: '.md',
            uploaded_at: new Date(Date.now() - 259200000).toISOString(), // 3 jours
          }
        ]
      };
      
      setKnowledgeInfo(mockInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const handleQuery = useCallback(async () => {
    if (!question.trim()) return;
    
    try {
      setIsQuerying(true);
      
      // TODO: Remplacer par l&apos;appel réel au MCP client
      // const client = await getMCPClient();
      // const result = await client.queryKnowledge(agentId, question);
      
      // Simulation pour l&apos;instant
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockAnswer = `Basé sur les documents de votre base de connaissances, voici ma réponse à "${question}":\n\nCette réponse est générée à partir de l&apos;analyse des ${knowledgeInfo?.file_count || 0} documents présents dans votre base de connaissances. Les informations proviennent principalement des fichiers PDF et de documentation que vous avez fournis.\n\nSources: documentation.pdf, notes.txt`;
      
      setAnswer(mockAnswer);
      setQuestion('');
    } catch (err) {
      console.error('Erreur lors de la requête:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la requête');
    } finally {
      setIsQuerying(false);
    }
  }, [question, knowledgeInfo, agentId]);

  const handleDeleteKnowledgeBase = useCallback(async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette base de connaissances ? Cette action est irréversible.')) {
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implémenter la suppression via MCP client
      // const client = await getMCPClient();
      // await client.deleteKnowledgeBase(agentId);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setKnowledgeInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    loadKnowledgeInfo();
  }, [loadKnowledgeInfo]);

  if (isLoading && !knowledgeInfo) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Chargement des informations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <Alert>
            <AlertDescription>
              Erreur: {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={loadKnowledgeInfo} 
            className="mt-4 gap-2"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!knowledgeInfo || knowledgeInfo.status !== 'success') {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucune base de connaissances</h3>
          <p className="text-muted-foreground">
            Cet agent n&apos;a pas encore de base de connaissances configurée.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Utilisez le composant d&apos;upload pour ajouter des documents.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Base de Connaissances
            <Badge variant="secondary">
              {knowledgeInfo.file_count} fichier{knowledgeInfo.file_count > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm font-medium">Taille totale:</span>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(knowledgeInfo.total_size || 0)}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Dernière mise à jour:</span>
              <p className="text-sm text-muted-foreground">
                {formatDate(knowledgeInfo.last_updated)}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={loadKnowledgeInfo} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button 
              onClick={handleDeleteKnowledgeBase}
              variant="destructive"
              size="sm"
              disabled={isLoading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des fichiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({knowledgeInfo.files?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {knowledgeInfo.files?.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • Ajouté le {formatDate(file.uploaded_at)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{file.extension}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interface de requête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Interroger la base de connaissances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Textarea
              placeholder="Posez une question sur vos documents..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleQuery();
                }
              }}
              className="min-h-[100px] resize-none"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
              </p>
              <Button 
                onClick={handleQuery}
                disabled={!question.trim() || isQuerying}
                className="gap-2"
              >
                {isQuerying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Rechercher
                  </>
                )}
              </Button>
            </div>
          </div>

          {answer && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-medium">Réponse de l&apos;agent</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded border">
            💡 <strong>Conseil:</strong> Posez des questions sur le contenu de vos documents. L&apos;agent utilisera
            sa base de connaissances pour vous fournir des réponses précises et contextuelles.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}