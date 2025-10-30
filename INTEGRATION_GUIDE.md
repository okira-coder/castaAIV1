# Guide d'intégration - Knowledge Base avec Better Chatbot

Ce guide vous explique comment intégrer le système de base de connaissances Quivr dans votre projet Better Chatbot.

## 🏗️ Architecture du système

```
better-chatbot-main/
├── knowledge-base-mcp-server/          # Serveur Python MCP + Quivr
│   ├── main.py                         # Point d'entrée MCP
│   ├── knowledge_manager.py            # Interface Quivr
│   ├── config.yaml                     # Configuration RAG
│   └── requirements.txt                # Dépendances Python
├── src/
│   ├── components/knowledge-base/      # Composants React
│   │   ├── KnowledgeBaseUpload.tsx     # Interface d'upload
│   │   ├── KnowledgeBaseViewer.tsx     # Consultation/requêtes
│   │   └── KnowledgeBaseManager.tsx    # Gestionnaire complet
│   └── lib/knowledge-base/             # Client TypeScript
│       ├── mcp-client.ts               # Client MCP
│       └── types.ts                    # Types TypeScript
└── custom-mcp-server/                  # MCP existant
```

## 🚀 Installation rapide

### 1. Installer le serveur Python

```bash
cd knowledge-base-mcp-server

# Windows
install.bat

# Linux/Mac
python setup_and_test.py
```

### 2. Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer avec votre clé OpenAI
OPENAI_API_KEY=sk-your-openai-key-here
```

### 3. Tester le serveur

```bash
python main.py
# Le serveur MCP démarre en mode stdio
```

## 📁 Intégration dans une page agent

Créez une nouvelle page pour gérer la base de connaissances d'un agent :

```typescript
// src/app/agents/[id]/knowledge/page.tsx
'use client';

import { KnowledgeBaseManager } from '@/components/knowledge-base/KnowledgeBaseManager';

export default function AgentKnowledgePage({ 
  params 
}: { 
  params: { id: string } 
}) {
  return (
    <div className="container mx-auto py-8">
      <KnowledgeBaseManager agentId={params.id} />
    </div>
  );
}
```

## 🔌 Intégration dans le chat

Modifiez votre composant de chat pour interroger la base de connaissances :

```typescript
// src/components/chat/ChatInterface.tsx (exemple)
import { getKnowledgeBaseMCPClient } from '@/lib/knowledge-base/mcp-client';

const handleUserMessage = async (message: string) => {
  // 1. Interroger la base de connaissances
  try {
    const kbClient = await getKnowledgeBaseMCPClient();
    const kbResponse = await kbClient.queryKnowledge(agentId, message);
    
    if (kbResponse.status === 'success') {
      // Utiliser la réponse de la KB comme contexte
      const contextualPrompt = `
        Contexte de la base de connaissances: ${kbResponse.answer}
        
        Question utilisateur: ${message}
        
        Réponds en te basant sur le contexte fourni.
      `;
      
      // 2. Envoyer au LLM avec le contexte
      const finalResponse = await sendToLLM(contextualPrompt);
      
      // 3. Afficher la réponse
      displayMessage(finalResponse);
    }
  } catch (error) {
    // Fallback : utiliser le LLM sans contexte KB
    const response = await sendToLLM(message);
    displayMessage(response);
  }
};
```

## 🎯 Intégration avec les agents existants

### Modifier la création d'agent

```typescript
// src/lib/agents/agent-manager.ts (exemple)
import { getKnowledgeBaseMCPClient } from '@/lib/knowledge-base/mcp-client';

export async function createAgent(agentData: AgentCreateData) {
  // 1. Créer l'agent normalement
  const agent = await createAgentInDB(agentData);
  
  // 2. Créer sa base de connaissances
  try {
    const kbClient = await getKnowledgeBaseMCPClient();
    await kbClient.createKnowledgeBase(agent.id);
  } catch (error) {
    console.warn('Erreur création KB:', error);
  }
  
  return agent;
}
```

### Ajouter un onglet Knowledge Base

```typescript
// src/components/agents/AgentTabs.tsx (exemple)
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KnowledgeBaseManager } from '@/components/knowledge-base/KnowledgeBaseManager';

export function AgentTabs({ agent }: { agent: Agent }) {
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="settings">Paramètres</TabsTrigger>
        <TabsTrigger value="knowledge">Base de connaissances</TabsTrigger>
      </TabsList>
      
      <TabsContent value="chat">
        {/* Interface de chat existante */}
      </TabsContent>
      
      <TabsContent value="settings">
        {/* Paramètres existants */}
      </TabsContent>
      
      <TabsContent value="knowledge">
        <KnowledgeBaseManager agentId={agent.id} />
      </TabsContent>
    </Tabs>
  );
}
```

## 🔧 Configuration avancée

### Personnaliser le comportement RAG

Modifiez `knowledge-base-mcp-server/config.yaml` :

```yaml
# Utiliser un modèle plus puissant
llm_config:
  supplier: "openai"
  model: "gpt-4"  # Au lieu de gpt-4o-mini
  temperature: 0.3

# Améliorer la recherche
reranker_config:
  supplier: "cohere"
  model: "rerank-multilingual-v3.0"
  top_n: 10  # Plus de résultats

# Stockage externe (PostgreSQL)
vectorstore_config:
  supplier: "pgvector"
  connection_string: "postgresql://user:pass@localhost/kb"
```

### Ajouter des parsers personnalisés

```python
# knowledge-base-mcp-server/custom_parser.py
from quivr_core.parsers import Parser

class CustomDocxParser(Parser):
    def parse(self, file_path: str) -> str:
        # Votre logique de parsing personnalisée
        pass
```

## 📊 Monitoring et logs

### Ajouter des logs dans Next.js

```typescript
// src/lib/knowledge-base/logger.ts
export const kbLogger = {
  upload: (agentId: string, files: string[]) => {
    console.log(`KB Upload - Agent: ${agentId}, Files: ${files.length}`);
  },
  
  query: (agentId: string, question: string, success: boolean) => {
    console.log(`KB Query - Agent: ${agentId}, Success: ${success}`);
  }
};
```

### Dashboard de monitoring

```typescript
// src/components/admin/KnowledgeBaseDashboard.tsx
export function KnowledgeBaseDashboard() {
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalFiles: 0,
    totalQueries: 0
  });

  // Récupérer les statistiques
  useEffect(() => {
    // Implémenter la récupération des stats
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent>
          <h3>Agents avec KB</h3>
          <p className="text-2xl">{stats.totalAgents}</p>
        </CardContent>
      </Card>
      {/* Autres métriques */}
    </div>
  );
}
```

## 🔒 Sécurité et permissions

### Vérifier les permissions

```typescript
// src/middleware/knowledge-base.ts
export function checkKnowledgeBaseAccess(userId: string, agentId: string) {
  // Vérifier que l'utilisateur a accès à cet agent
  return userOwnsAgent(userId, agentId);
}
```

### Limite de taille et format

```typescript
// src/lib/knowledge-base/validation.ts
export function validateFile(file: File): string | null {
  if (file.size > 50 * 1024 * 1024) {
    return "Fichier trop volumineux (max 50MB)";
  }
  
  const allowedTypes = ['.pdf', '.txt', '.md', '.docx'];
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (!allowedTypes.includes(extension)) {
    return `Format non supporté: ${extension}`;
  }
  
  return null;
}
```

## 🚀 Déploiement

### Docker pour le serveur MCP

```dockerfile
# knowledge-base-mcp-server/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8080
CMD ["python", "main.py"]
```

### docker-compose.yml

```yaml
# docker/compose.yml (ajouter)
services:
  knowledge-base-mcp:
    build: ../knowledge-base-mcp-server
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - kb_storage:/app/knowledge_storage
    networks:
      - better-chatbot

volumes:
  kb_storage:
```

## 🔧 Troubleshooting

### Problèmes courants

1. **Serveur MCP ne démarre pas**
   ```bash
   # Vérifier les dépendances
   python -m pip install -r requirements.txt
   
   # Vérifier les variables d'environnement
   echo $OPENAI_API_KEY
   ```

2. **Erreurs d'upload de fichiers**
   ```typescript
   // Vérifier les permissions et la taille
   console.log('File size:', file.size);
   console.log('File type:', file.type);
   ```

3. **Réponses vides de la KB**
   ```python
   # Vérifier que les fichiers sont bien indexés
   print(f"Brain files: {brain.get_file_count()}")
   ```

## 📚 Ressources

- [Documentation Quivr](https://core.quivr.com/)
- [Spécification MCP](https://modelcontextprotocol.io/)
- [Guide RAG](https://docs.quivr.com/workflows/examples/basic_rag/)

## 🎯 Prochaines étapes

1. **Tester** avec de vrais documents
2. **Optimiser** les performances
3. **Ajouter** des métriques
4. **Déployer** en production
5. **Former** les utilisateurs