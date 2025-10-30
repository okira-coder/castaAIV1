import { pgDb } from "@/lib/db/pg/db.pg";
import { sql } from "drizzle-orm";

async function migrateKnowledgeBaseTables() {
  console.log("🔄 Migration des tables Knowledge Base...");
  console.log("📡 Test de connexion à la base de données...");
  
  try {
    // Supprimer les anciennes tables si elles existent
    console.log("⚠️  Suppression des anciennes tables...");
    await pgDb.execute(sql`DROP TABLE IF EXISTS "agent_collections" CASCADE;`);
    await pgDb.execute(sql`DROP TABLE IF EXISTS "files" CASCADE;`);
    
    // Supprimer la colonne file_count si elle existe
    await pgDb.execute(sql`
      ALTER TABLE "knowledge_base_collection" 
      DROP COLUMN IF EXISTS "file_count";
    `);
    
    console.log("✅ Anciennes tables supprimées");
    
    // Créer la nouvelle table agent_collection
    console.log("📝 Création de la table agent_collection...");
    await pgDb.execute(sql`
      CREATE TABLE IF NOT EXISTS "agent_collection" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "agent_id" uuid NOT NULL,
        "collection_id" uuid NOT NULL,
        "assigned_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT "agent_collection_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE,
        CONSTRAINT "agent_collection_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "knowledge_base_collection"("id") ON DELETE CASCADE,
        CONSTRAINT "agent_collection_agent_id_collection_id_unique" UNIQUE("agent_id", "collection_id")
      );
    `);
    
    // Mettre à jour la table knowledge_base_file avec les bonnes colonnes
    console.log("📝 Mise à jour de la table knowledge_base_file...");
    
    // Ajouter les colonnes manquantes si elles n'existent pas
    await pgDb.execute(sql`
      DO $$ 
      BEGIN
        -- Ajouter original_name si elle n'existe pas
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base_file' AND column_name = 'original_name') THEN
          ALTER TABLE "knowledge_base_file" ADD COLUMN "original_name" text NOT NULL DEFAULT '';
        END IF;
        
        -- Ajouter extension si elle n'existe pas
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base_file' AND column_name = 'extension') THEN
          ALTER TABLE "knowledge_base_file" ADD COLUMN "extension" text NOT NULL DEFAULT '';
        END IF;
        
        -- Ajouter storage_url si elle n'existe pas
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base_file' AND column_name = 'storage_url') THEN
          ALTER TABLE "knowledge_base_file" ADD COLUMN "storage_url" text NOT NULL DEFAULT '';
        END IF;
        
        -- Ajouter uploaded_at si elle n'existe pas
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base_file' AND column_name = 'uploaded_at') THEN
          ALTER TABLE "knowledge_base_file" ADD COLUMN "uploaded_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;
        END IF;
      END $$;
    `);
    
    console.log("✅ Migration terminée avec succès !");
    console.log("📋 Résumé des changements :");
    console.log("   - Tables supprimées : agent_collections, files");
    console.log("   - Table créée : agent_collection");
    console.log("   - Colonnes ajoutées à knowledge_base_file : original_name, extension, storage_url, uploaded_at");
    
  } catch (error) {
    console.error("❌ Erreur lors de la migration :", error);
    throw error;
  }
}

// Exécuter la migration
migrateKnowledgeBaseTables()
  .then(() => {
    console.log("🎉 Migration réussie !");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration échouée :", error);
    process.exit(1);
  });