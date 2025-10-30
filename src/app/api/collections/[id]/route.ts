import { knowledgeBaseRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";
import { KnowledgeBaseCollectionUpdateSchema } from "@/types/knowledge-base";

interface Params {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const collection = await knowledgeBaseRepository.selectCollectionById(
      resolvedParams.id,
      session.user.id
    );

    if (!collection) {
      return new Response("Collection not found", { status: 404 });
    }

    return Response.json(collection);
  } catch (error) {
    console.error("Failed to fetch collection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const json = await request.json();
    const updateData = KnowledgeBaseCollectionUpdateSchema.parse(json);

    const collection = await knowledgeBaseRepository.updateCollection(
      resolvedParams.id,
      session.user.id,
      updateData
    );

    return Response.json(collection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to update collection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const resolvedParams = await params;
    await knowledgeBaseRepository.deleteCollection(resolvedParams.id, session.user.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete collection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}