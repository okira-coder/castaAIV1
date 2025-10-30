"use client";

import { useTranslations } from "next-intl";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Textarea } from "ui/textarea";
import { Label } from "ui/label";
import { RadioGroup, RadioGroupItem } from "ui/radio-group";
import { Save, ArrowLeft, Database } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";
import { safe } from "ts-safe";
import { 
  KnowledgeBaseCollection, 
  KnowledgeBaseCollectionCreateSchema,
  KnowledgeBaseCollectionUpdateSchema 
} from "@/types/knowledge-base";
import Link from "next/link";

interface EditCollectionProps {
  initialCollection?: KnowledgeBaseCollection;
  userId: string;
  isOwner?: boolean;
  hasEditAccess?: boolean;
}

const getDefaultCollection = (): Omit<
  KnowledgeBaseCollection,
  "id" | "createdAt" | "updatedAt" | "userId" | "fileCount" | "totalSize" | "files"
> => {
  return {
    name: "",
    description: "",
    visibility: "private",
  };
};

export default function EditCollection({
  initialCollection,
  userId,
  isOwner = true,
  hasEditAccess = true,
}: EditCollectionProps) {
  const t = useTranslations();
  const router = useRouter();
  const [collection, setCollection] = useState(() => ({
    ...getDefaultCollection(),
    ...initialCollection,
  }));
  const [isSaving, setIsSaving] = useState(false);

  const updateCollection = useCallback(
    (updates: Partial<typeof collection>) => {
      setCollection((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const saveCollection = useCallback(() => {
    if (initialCollection) {
      // Update existing collection
      safe(() => setIsSaving(true))
        .map(() => KnowledgeBaseCollectionUpdateSchema.parse({ 
          name: collection.name,
          description: collection.description,
          visibility: collection.visibility,
        }))
        .map(JSON.stringify)
        .map(async (body) =>
          fetcher(`/api/collections/${initialCollection.id}`, {
            method: "PUT",
            body,
          }),
        )
        .ifOk(() => {
          toast.success(t("KnowledgeBase.collectionUpdated"));
          router.push(`/knowledge-bases`);
          router.refresh(); // Force refresh pour éviter les duplications
        })
        .ifFail(handleErrorWithToast)
        .watch(() => setIsSaving(false));
    } else {
      // Create new collection
      safe(() => setIsSaving(true))
        .map(() => KnowledgeBaseCollectionCreateSchema.parse({ 
          ...collection, 
          userId 
        }))
        .map(JSON.stringify)
        .map(async (body) => {
          return fetcher(`/api/collections`, {
            method: "POST",
            body,
          });
        })
        .ifOk(() => {
          toast.success(t("KnowledgeBase.collectionCreated"));
          router.push(`/knowledge-bases`);
          router.refresh(); // Force refresh pour éviter les duplications
        })
        .ifFail(handleErrorWithToast)
        .watch(() => setIsSaving(false));
    }
  }, [collection, initialCollection, userId, router, t]);

  const isFormValid = collection.name.trim().length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/knowledge-bases">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("Common.back")}
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {initialCollection 
                ? t("KnowledgeBase.editCollection")
                : t("KnowledgeBase.createCollection")
              }
            </h1>
            <p className="text-muted-foreground">
              {initialCollection
                ? t("KnowledgeBase.editCollectionDescription")
                : t("KnowledgeBase.createCollectionDescription")
              }
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("KnowledgeBase.collectionDetails")}</CardTitle>
          <CardDescription>
            {t("KnowledgeBase.collectionDetailsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Collection Name */}
          <div className="space-y-2">
            <Label htmlFor="collection-name">
              {t("KnowledgeBase.collectionName")} *
            </Label>
            <Input
              id="collection-name"
              placeholder={t("KnowledgeBase.collectionNamePlaceholder")}
              value={collection.name}
              onChange={(e) => updateCollection({ name: e.target.value })}
              disabled={!hasEditAccess}
              data-testid="collection-name-input"
            />
          </div>

          {/* Collection Description */}
          <div className="space-y-2">
            <Label htmlFor="collection-description">
              {t("KnowledgeBase.collectionDescription")}
            </Label>
            <Textarea
              id="collection-description"
              placeholder={t("KnowledgeBase.collectionDescriptionPlaceholder")}
              value={collection.description || ""}
              onChange={(e) => updateCollection({ description: e.target.value })}
              disabled={!hasEditAccess}
              rows={3}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <Label>{t("KnowledgeBase.visibility")}</Label>
            <RadioGroup
              value={collection.visibility}
              onValueChange={(value: "public" | "private") => 
                updateCollection({ visibility: value })
              }
              disabled={!hasEditAccess}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="font-normal">
                  <div>
                    <div className="font-medium">{t("KnowledgeBase.private")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("KnowledgeBase.privateDescription")}
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="font-normal">
                  <div>
                    <div className="font-medium">{t("KnowledgeBase.public")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("KnowledgeBase.publicDescription")}
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          {hasEditAccess && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={saveCollection}
                disabled={!isFormValid || isSaving}
                data-testid="collection-save-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? t("Common.saving") : t("Common.save")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}