import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { getSession } from "auth/server";
import { knowledgeBaseRepository } from "lib/db/repository";
import EditCollection from "@/components/knowledge-base/edit-collection";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KnowledgeBase");
  return {
    title: t("editCollection"),
  };
}

export const dynamic = "force-dynamic";

interface EditCollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCollectionPage({ params }: EditCollectionPageProps) {
  const session = await getSession();
  const { id } = await params;
  
  if (!session?.user.id) {
    redirect("/auth/signin");
  }

  // Fetch the collection to edit
  const collection = await knowledgeBaseRepository.selectCollectionById(id, session.user.id);
  
  if (!collection) {
    notFound();
  }

  // Check if user owns this collection or has permission to edit
  if (collection.userId !== session.user.id && session.user.role !== "admin") {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <EditCollection 
        userId={session.user.id} 
        initialCollection={collection}
      />
    </div>
  );
}