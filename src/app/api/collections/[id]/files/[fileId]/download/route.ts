import { NextRequest, NextResponse } from "next/server";
import { getSession } from "auth/server";
import { knowledgeBaseRepository } from "lib/db/repository";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId, fileId } = await context.params;

    // Check if collection exists and user has access
    const collection = await knowledgeBaseRepository.selectCollectionById(
      collectionId,
      session.user.id
    );

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Get file info
    const file = await knowledgeBaseRepository.selectFileById(fileId);
    
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if file belongs to the collection
    if (file.collectionId !== collectionId) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // For now, we'll return the storage URL as a redirect
    // In production, you might want to stream the file directly
    return NextResponse.redirect(file.storageUrl);
  } catch (error) {
    console.error("Download file error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}