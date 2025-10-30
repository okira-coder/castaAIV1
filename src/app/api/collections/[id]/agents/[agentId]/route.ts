import { knowledgeBaseRepository } from "lib/db/repository";
import { getSession } from "auth/server";

interface Params {
  id: string;
  agentId: string;
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
    
    // Check if user has write access to this collection
    const hasAccess = await knowledgeBaseRepository.checkAccess(
      resolvedParams.id,
      session.user.id,
      true // destructive = true for write access
    );

    if (!hasAccess) {
      return new Response("Collection not found or write access denied", { status: 404 });
    }

    await knowledgeBaseRepository.removeCollectionFromAgent(resolvedParams.agentId, resolvedParams.id);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to remove agent from collection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}