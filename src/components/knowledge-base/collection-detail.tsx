"use client";

import { useTranslations } from "next-intl";
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Badge } from "ui/badge";
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Search, 
  Plus,
  Database,
  Calendar,
  User,
  HardDrive
} from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";
import { 
  KnowledgeBaseCollection, 
  KnowledgeBaseFile 
} from "@/types/knowledge-base";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CollectionDetailProps {
  collection: KnowledgeBaseCollection;
  userId: string;
  userRole: string;
}

const ACCEPTED_FILE_TYPES = [
  ".pdf", ".docx", ".doc", ".txt", ".xlsx", ".xls", ".csv", ".md"
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function CollectionDetail({ 
  collection, 
  userId, 
  userRole 
}: CollectionDetailProps) {
  const t = useTranslations("KnowledgeBase");
  const [files, setFiles] = useState<KnowledgeBaseFile[]>(collection.files || []);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const canEdit = collection.userId === userId || userRole === "admin";

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return "📄";
    if (fileType.includes('word') || fileType.includes('doc')) return "📝";
    if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('xls')) return "📊";
    if (fileType.includes('text') || fileType.includes('txt')) return "📋";
    return "📁";
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    if (!canEdit) {
      toast.error(t("noPermissionToUpload"));
      return;
    }

    setIsUploading(true);

    try {
      for (const file of Array.from(uploadedFiles)) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(t("fileTooLarge", { name: file.name, maxSize: "10MB" }));
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        console.log("Uploading file:", {
          name: file.name,
          size: file.size,
          type: file.type,
          collectionId: collection.id
        });

        try {
          const response = await fetcher(`/api/collections/${collection.id}/files`, {
            method: "POST",
            body: formData,
          });

          console.log("Upload response:", response);

          if (response.success) {
            setFiles(prev => [...prev, response.data]);
            toast.success(t("fileUploadSuccess", { name: file.name }));
          } else {
            console.error("Upload failed - response not successful:", response);
            toast.error(t("fileUploadError", { name: file.name }));
          }
        } catch (uploadError) {
          console.error("Upload error for file:", file.name, uploadError);
          // Log plus d'infos sur l'erreur
          if (uploadError instanceof Error) {
            console.error("Error details:", {
              message: uploadError.message,
              stack: uploadError.stack,
              // @ts-expect-error - status property may not exist on Error
              status: uploadError.status,
              // @ts-expect-error - info property may not exist on Error
              info: uploadError.info
            });
          }
          toast.error(t("fileUploadError", { name: file.name }));
        }
      }
    } catch (error) {
      handleErrorWithToast(error as Error, t("fileUploadError", { name: "" }));
    } finally {
      setIsUploading(false);
    }
  }, [collection.id, canEdit, t]);

  const handleFileDelete = useCallback(async (fileId: string, fileName: string) => {
    if (!canEdit) {
      toast.error(t("noPermissionToDelete"));
      return;
    }

    if (!confirm(t("confirmDeleteFile", { name: fileName }))) {
      return;
    }

    try {
      const response = await fetcher(`/api/collections/${collection.id}/files/${fileId}`, {
        method: "DELETE",
      });

      if (response.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        toast.success(t("fileDeleteSuccess", { name: fileName }));
      } else {
        toast.error(t("fileDeleteError"));
      }
    } catch (error) {
      handleErrorWithToast(error as Error, t("fileDeleteError"));
    }
  }, [collection.id, canEdit, t]);

  const handleFileDownload = useCallback(async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/collections/${collection.id}/files/${fileId}/download`);
      
      if (!response.ok) {
        toast.error(t("fileDownloadError"));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      handleErrorWithToast(error as Error, t("fileDownloadError"));
    }
  }, [collection.id, t]);

  return (
    <div className="space-y-6">
      {/* Collection Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-2xl">{collection.name}</CardTitle>
                <Badge variant={collection.visibility === "public" ? "default" : "secondary"}>
                  {t(collection.visibility)}
                </Badge>
              </div>
              <CardDescription className="text-base max-w-2xl">
                {collection.description}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{t("createdBy", { userName: collection.userName || "Utilisateur inconnu" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(collection.createdAt), "dd MMMM yyyy", { locale: fr })}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{t("filesCount", { count: files.length })}</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="h-4 w-4" />
              <span>{formatFileSize(parseInt(collection.totalSize || "0"))}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* File Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("files")}
              </CardTitle>
              <CardDescription>
                {t("filesDescription")}
              </CardDescription>
            </div>
            
            {canEdit && (
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  multiple
                  accept={ACCEPTED_FILE_TYPES.join(",")}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      {t("uploading")}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {t("addFiles")}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("searchFiles")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {files.length === 0 ? t("noFiles") : t("noMatchingFiles")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {files.length === 0 ? t("noFilesDescription") : t("tryDifferentSearch")}
              </p>
              {canEdit && files.length === 0 && (
                <Button
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t("uploadFirstFile")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{getFileIcon(file.type)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{file.originalName}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(parseInt(file.size))}</span>
                        <span>{format(new Date(file.uploadedAt), "dd/MM/yyyy HH:mm")}</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {file.extension.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileDownload(file.id, file.originalName)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileDelete(file.id, file.originalName)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}