"use client";

import { useTranslations } from "next-intl";
import { KnowledgeBaseCollectionSummary } from "@/types/knowledge-base";
import { Card, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Plus, Database, FileText, Users, Lock, Globe, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { BackgroundPaths } from "ui/background-paths";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import { notify } from "lib/notify";
import { handleErrorWithToast } from "ui/shared-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { Badge } from "ui/badge";

interface KnowledgeBaseListProps {
  initialMyCollections: KnowledgeBaseCollectionSummary[];
  initialPublicCollections: KnowledgeBaseCollectionSummary[];
  userId: string;
  userRole?: string | null;
}

export function KnowledgeBaseList({
  initialMyCollections,
  initialPublicCollections,
  userId,
  userRole,
}: KnowledgeBaseListProps) {
  const t = useTranslations();

  const { data: allCollections, mutate } = useSWR(
    "/api/collections?type=all",
    fetcher,
    {
      fallbackData: [...initialMyCollections, ...initialPublicCollections],
    },
  );

  const myCollections =
    allCollections?.filter((collection: KnowledgeBaseCollectionSummary) => collection.userId === userId) ||
    initialMyCollections;

  const publicCollections =
    allCollections?.filter((collection: KnowledgeBaseCollectionSummary) => collection.userId !== userId) ||
    initialPublicCollections;

  const updateVisibility = async (
    collectionId: string,
    visibility: "public" | "private",
  ) => {
    const result = await fetcher(`/api/collections/${collectionId}`, {
      method: "PUT",
      body: JSON.stringify({ visibility }),
    });
    
    if (result.success) {
      toast.success(t("KnowledgeBase.visibilityUpdated"));
      // Rafraîchir les données après mise à jour
      mutate();
    } else {
      handleErrorWithToast(result.error);
    }
  };

  const deleteCollection = async (collectionId: string) => {
    const ok = await notify.confirm({
      description: t("KnowledgeBase.confirmDeleteCollection"),
    });
    if (!ok) return;
    
    const result = await fetcher(`/api/collections/${collectionId}`, {
      method: "DELETE",
    });
    
    if (result.success) {
      toast.success(t("KnowledgeBase.collectionDeleted"));
      // Rafraîchir les données après suppression
      mutate();
    } else {
      toast.error(t("Common.error"));
    }
  };

  const formatFileSize = (bytes: string): string => {
    const size = parseInt(bytes);
    if (size === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const CollectionCard = ({ collection }: { collection: KnowledgeBaseCollectionSummary }) => {
    const isOwner = userId === collection.userId;
    
    return (
      <Card className="transition-all duration-200 hover:shadow-lg group h-full flex flex-col overflow-hidden">
        <CardHeader className="space-y-3 flex-1 p-6">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <Link href={`/knowledge-bases/${collection.id}`} className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors truncate leading-tight">
                    {collection.name}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground overflow-hidden">
                    <div className="flex items-center gap-1 min-w-0 max-w-[150px]">
                      <FileText className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{t("KnowledgeBase.fileCount", { count: collection.fileCount })}</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0 max-w-[150px]">
                      <Database className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{t("KnowledgeBase.totalSize", { size: formatFileSize(collection.totalSize) })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            
            <div className="flex items-center gap-2 flex-shrink-0 max-w-[120px]">
              <Badge variant={collection.visibility === "public" ? "default" : "secondary"} className="text-xs whitespace-nowrap truncate max-w-[80px]">
                <span className="flex items-center gap-1 truncate">
                  {collection.visibility === "public" ? (
                    <><Globe className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{t("KnowledgeBase.public")}</span></>
                  ) : (
                    <><Lock className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{t("KnowledgeBase.private")}</span></>
                  )}
                </span>
              </Badge>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/knowledge-bases/${collection.id}/edit`}>
                        {t("Common.edit")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        updateVisibility(
                          collection.id,
                          collection.visibility === "public" ? "private" : "public"
                        )
                      }
                    >
                      {collection.visibility === "public"
                        ? t("KnowledgeBase.makePrivate")
                        : t("KnowledgeBase.makePublic")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteCollection(collection.id)}
                      className="text-destructive"
                    >
                      {t("Common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {collection.description && (
            <CardDescription className="text-sm line-clamp-2 break-words leading-relaxed overflow-hidden">
              {collection.description}
            </CardDescription>
          )}
          
          <div className="flex items-center justify-between pt-2 gap-2 mt-auto min-w-0">
            <div className="text-xs text-muted-foreground truncate min-w-0 flex-1 overflow-hidden">
              {collection.userName && (
                <span className="truncate block">{t("KnowledgeBase.createdBy", { userName: collection.userName })}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap ml-2">
              {t("KnowledgeBase.lastUpdated", { 
                date: new Date(collection.updatedAt).toLocaleDateString('fr-FR') 
              })}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("KnowledgeBase.title")}</h1>
          <p className="text-muted-foreground">
            {t("KnowledgeBase.createFirstCollection")}
          </p>
        </div>
        <Button asChild>
          <Link href="/knowledge-bases/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("KnowledgeBase.newCollection")}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mine" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("KnowledgeBase.myCollections")}
          </TabsTrigger>
          <TabsTrigger value="public" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("KnowledgeBase.publicCollections")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-4">
          {myCollections.length === 0 ? (
            <div className="text-center py-12">
              <BackgroundPaths />
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("KnowledgeBase.noCollections")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("KnowledgeBase.createFirstCollection")}
              </p>
              <Button asChild>
                <Link href="/knowledge-bases/new">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("KnowledgeBase.createCollection")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {myCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          {publicCollections.length === 0 ? (
            <div className="text-center py-12">
              <BackgroundPaths />
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("KnowledgeBase.noPublicCollections")}</h3>
              <p className="text-muted-foreground">
                {t("KnowledgeBase.noPublicCollectionsDescription")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {publicCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}