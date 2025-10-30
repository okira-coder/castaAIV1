import { knowledgeBaseRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { notFound } from "next/navigation";
import { KnowledgeBaseList } from "@/components/knowledge-base/knowledge-base-list";

// Force dynamic rendering to avoid static generation issues with session
export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  const session = await getSession();

  if (!session?.user.id) {
    notFound();
  }

  // Fetch collections data on the server
  const myCollections = await knowledgeBaseRepository.selectCollectionsByUserId(
    session.user.id
  );
  
  const publicCollections = await knowledgeBaseRepository.selectPublicCollections(
    session.user.id
  );

  return (
    <KnowledgeBaseList
      initialMyCollections={myCollections}
      initialPublicCollections={publicCollections}
      userId={session.user.id}
      userRole={session.user.role}
    />
  );
}
