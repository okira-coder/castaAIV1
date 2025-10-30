import { knowledgeBaseRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";
import { KnowledgeBaseCollectionCreateSchema } from "@/types/knowledge-base";

const CollectionQuerySchema = z.object({
  type: z.enum(["mine", "public", "all"]).default("mine"),
});

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const { type } = CollectionQuerySchema.parse(queryParams);

    let collections;
    
    switch (type) {
      case "mine":
        collections = await knowledgeBaseRepository.selectCollectionsByUserId(session.user.id);
        break;
      case "public":
        collections = await knowledgeBaseRepository.selectPublicCollections(session.user.id);
        break;
      case "all":
        const myCollections = await knowledgeBaseRepository.selectCollectionsByUserId(session.user.id);
        const publicCollections = await knowledgeBaseRepository.selectPublicCollections(session.user.id);
        
        // Dédupliquer les collections pour éviter qu'une collection publique créée par l'utilisateur apparaisse deux fois
        const allCollectionsMap = new Map();
        
        // Ajouter d'abord les collections personnelles
        myCollections.forEach(collection => {
          allCollectionsMap.set(collection.id, collection);
        });
        
        // Ajouter les collections publiques seulement si elles ne sont pas déjà présentes
        publicCollections.forEach(collection => {
          if (!allCollectionsMap.has(collection.id)) {
            allCollectionsMap.set(collection.id, collection);
          }
        });
        
        collections = Array.from(allCollectionsMap.values());
        break;
      default:
        collections = await knowledgeBaseRepository.selectCollectionsByUserId(session.user.id);
    }

    return Response.json(collections);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid query parameters", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to fetch collections:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const json = await request.json();
    const collectionData = KnowledgeBaseCollectionCreateSchema.parse({
      ...json,
      userId: session.user.id,
    });

    const collection = await knowledgeBaseRepository.insertCollection(collectionData);

    return Response.json(collection, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to create collection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}