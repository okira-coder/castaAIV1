import { knowledgeBaseRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { NextRequest } from "next/server";
import { KnowledgeBaseFile } from "@/types/knowledge-base";

interface Params {
  id: string;
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
    // Check if user has access to this collection
    const hasAccess = await knowledgeBaseRepository.checkAccess(
      resolvedParams.id,
      session.user.id
    );

    if (!hasAccess) {
      return new Response("Collection not found or access denied", { status: 404 });
    }

    const files = await knowledgeBaseRepository.selectFilesByCollectionId(resolvedParams.id);
    return Response.json(files);
  } catch (error) {
    console.error("Failed to fetch files:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const resolvedParams = await params;
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log("POST /api/collections/[id]/files - Start upload for collection:", resolvedParams.id);
    
    // Check if user has write access to this collection
    const hasAccess = await knowledgeBaseRepository.checkAccess(
      resolvedParams.id,
      session.user.id,
      true // destructive = true for write access
    );
    console.log("Access check result:", hasAccess);

    if (!hasAccess) {
      console.log("Access denied for user:", session.user.id, "collection:", resolvedParams.id);
      return new Response("Collection not found or write access denied", { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File; // Changé de "files" à "file"
    console.log("File received:", file ? { name: file.name, size: file.size, type: file.type } : "No file");

    if (!file) {
      console.log("No file provided in formData");
      return Response.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const files = [file]; // Convertir en array pour le reste du code

    // Validate file types and sizes
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      console.log("Validating file:", { type: file.type, size: file.size, allowed: allowedTypes.includes(file.type) });
      
      if (!allowedTypes.includes(file.type)) {
        console.log("File type not supported:", file.type);
        return Response.json(
          { error: `File type ${file.type} is not supported` },
          { status: 400 }
        );
      }

      if (file.size > maxFileSize) {
        console.log("File too large:", file.size, "max:", maxFileSize);
        return Response.json(
          { error: `File ${file.name} is too large. Maximum size is 10MB` },
          { status: 400 }
        );
      }
    }

    const uploadedFiles: KnowledgeBaseFile[] = [];

    for (const file of files) {
      console.log("Processing file for upload:", file.name);
      
      // TODO: Implement actual file upload to storage service
      // For now, we'll create a mock storage URL with proper format
      const storageUrl = `http://localhost:3000/uploads/${Date.now()}-${file.name}`;
      
      const fileExtension = file.name.split('.').pop() || '';
      
      const fileData = {
        collectionId: resolvedParams.id,
        name: file.name,
        originalName: file.name,
        size: file.size.toString(),
        type: file.type,
        extension: `.${fileExtension}`,
        storageUrl: storageUrl,
      };

      console.log("Inserting file data:", fileData);
      
      const uploadedFile = await knowledgeBaseRepository.insertFile(fileData);
      console.log("File inserted successfully:", uploadedFile);
      uploadedFiles.push(uploadedFile);
    }

    console.log("All files uploaded successfully. Returning response.");
    
    return Response.json({
      success: true,
      data: uploadedFiles[0], // Retourner le premier fichier pour compatibilité avec le frontend
      message: `File uploaded successfully`,
    }, { status: 201 });

  } catch (error) {
    console.error("Failed to upload files - detailed error:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}