import { knowledgeBaseRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";

interface Params {
  id: string;
}

const AgentAssignmentSchema = z.object({
  agentId: z.string().uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const resolvedParams = await params;
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Check if user has access to this collection
    const hasAccess = await knowledgeBaseRepository.checkAccess(
      resolvedParams.id,
      session.user.id
    );

    if (!hasAccess) {
      return new Response("Collection not found or access denied", { status: 404 });
    }

    const agents = await knowledgeBaseRepository.selectAgentsByCollectionId(resolvedParams.id);
    return Response.json(agents);
  } catch (error) {
    console.error("Failed to fetch assigned agents:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const resolvedParams = await params;
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const json = await request.json();
    const { agentId } = AgentAssignmentSchema.parse(json);

    // Check if user has write access to this collection
    const hasAccess = await knowledgeBaseRepository.checkAccess(
      resolvedParams.id,
      session.user.id,
      true // destructive = true for write access
    );

    if (!hasAccess) {
      return new Response("Collection not found or write access denied", { status: 404 });
    }

    await knowledgeBaseRepository.assignCollectionToAgent(agentId, resolvedParams.id);
    
    return Response.json({ 
      message: "Agent assigned to collection successfully" 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to assign agent to collection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}