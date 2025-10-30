import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "auth/server";
import EditCollection from "@/components/knowledge-base/edit-collection";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KnowledgeBase");
  return {
    title: t("createCollection"),
  };
}

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const session = await getSession();
  
  if (!session?.user.id) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <EditCollection userId={session.user.id} />
    </div>
  );
}