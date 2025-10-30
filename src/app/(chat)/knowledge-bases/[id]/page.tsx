import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { getSession } from "auth/server";
import { knowledgeBaseRepository } from "lib/db/repository";
import { Button } from "ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import CollectionDetail from "@/components/knowledge-base/collection-detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = await getTranslations("KnowledgeBase");
  const { id } = await params;
  
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return { title: t("collectionNotFound") };
    }

    const collection = await knowledgeBaseRepository.selectCollectionById(id, session.user.id);
    
    return {
      title: collection ? collection.name : t("collectionNotFound"),
      description: collection?.description || t("collectionDescription"),
    };
  } catch {
    return { title: t("collectionNotFound") };
  }
}

export const dynamic = "force-dynamic";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const session = await getSession();
  const { id } = await params;
  const t = await getTranslations("KnowledgeBase");
  
  if (!session?.user.id) {
    redirect("/auth/signin");
  }

  // Fetch the collection with files
  const collection = await knowledgeBaseRepository.selectCollectionById(id, session.user.id);
  
  if (!collection) {
    notFound();
  }

  const canEdit = collection.userId === session.user.id || session.user.role === "admin";

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/knowledge-bases" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("backToCollections")}
            </Link>
          </Button>
        </div>
        
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/knowledge-bases/${id}/edit`} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                {t("editCollection")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Collection Detail */}
      <CollectionDetail 
        collection={collection}
        userId={session.user.id}
        userRole={session.user.role || "user"}
      />
    </div>
  );
}