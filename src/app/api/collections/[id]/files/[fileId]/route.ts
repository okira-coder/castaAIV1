import { knowledgeBaseRepository } from "lib/db/repository";
import { getSession } from "auth/server";

interface Params {
  id: string;
  fileId: string;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const resolvedParams = await params;
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await knowledgeBaseRepository.deleteFile(resolvedParams.fileId, session.user.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete file:", error);
    
    if (error instanceof Error && error.message.includes("access denied")) {
      return new Response("File not found or access denied", { status: 404 });
    }
    
    return new Response("Internal Server Error", { status: 500 });
  }
}

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
    const file = await knowledgeBaseRepository.selectFileById(resolvedParams.fileId);
    
    if (!file) {
      return new Response("File not found", { status: 404 });
    }

    // Check if user has access to the collection containing this file
    const hasAccess = await knowledgeBaseRepository.checkAccess(
      file.collectionId,
      session.user.id
    );

    if (!hasAccess) {
      return new Response("Access denied", { status: 403 });
    }

    return Response.json(file);
  } catch (error) {
    console.error("Failed to fetch file:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}