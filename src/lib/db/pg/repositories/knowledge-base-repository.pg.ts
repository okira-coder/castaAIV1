import { 
  KnowledgeBaseCollection, 
  KnowledgeBaseCollectionRepository, 
  KnowledgeBaseCollectionSummary,
  KnowledgeBaseFile
} from "@/types/knowledge-base";
import { pgDb as db } from "../db.pg";
import { 
  KnowledgeBaseCollectionTable, 
  KnowledgeBaseFileTable, 
  AgentCollectionTable,
  BookmarkTable, 
  UserTable,
  AgentTable
} from "../schema.pg";
import { and, desc, eq, sql } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgKnowledgeBaseRepository: KnowledgeBaseCollectionRepository = {
  async insertCollection(collection) {
    const [result] = await db
      .insert(KnowledgeBaseCollectionTable)
      .values({
        id: generateUUID(),
        name: collection.name,
        description: collection.description,
        userId: collection.userId,
        visibility: collection.visibility || "private",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      ...result,
      description: result.description ?? undefined,
      fileCount: 0,
      totalSize: "0",
      files: [],
    };
  },

  async selectCollectionById(id, userId): Promise<KnowledgeBaseCollection | null> {
    const [result] = await db
      .select({
        id: KnowledgeBaseCollectionTable.id,
        name: KnowledgeBaseCollectionTable.name,
        description: KnowledgeBaseCollectionTable.description,
        userId: KnowledgeBaseCollectionTable.userId,
        visibility: KnowledgeBaseCollectionTable.visibility,
        createdAt: KnowledgeBaseCollectionTable.createdAt,
        updatedAt: KnowledgeBaseCollectionTable.updatedAt,
        isBookmarked: sql<boolean>`${BookmarkTable.id} IS NOT NULL`,
        userName: UserTable.name,
        userAvatar: UserTable.image,
      })
      .from(KnowledgeBaseCollectionTable)
      .leftJoin(
        BookmarkTable,
        and(
          eq(BookmarkTable.itemId, KnowledgeBaseCollectionTable.id),
          eq(BookmarkTable.userId, userId),
          eq(BookmarkTable.itemType, "collection")
        )
      )
      .leftJoin(UserTable, eq(UserTable.id, KnowledgeBaseCollectionTable.userId))
      .where(
        and(
          eq(KnowledgeBaseCollectionTable.id, id),
          sql`(${KnowledgeBaseCollectionTable.visibility} = 'public' OR ${KnowledgeBaseCollectionTable.userId} = ${userId})`
        )
      );

    if (!result) return null;

    const files = await this.selectFilesByCollectionId(id);
    const fileCount = files.length;
    const totalSize = files.reduce((sum, file) => sum + parseInt(file.size), 0).toString();

    return {
      ...result,
      description: result.description ?? undefined,
      userName: result.userName ?? undefined,
      userAvatar: result.userAvatar ?? undefined,
      isBookmarked: result.isBookmarked ?? false,
      fileCount,
      totalSize,
      files,
    };
  },

  async selectCollectionsByUserId(userId): Promise<KnowledgeBaseCollectionSummary[]> {
    const collections = await db
      .select({
        id: KnowledgeBaseCollectionTable.id,
        name: KnowledgeBaseCollectionTable.name,
        description: KnowledgeBaseCollectionTable.description,
        userId: KnowledgeBaseCollectionTable.userId,
        visibility: KnowledgeBaseCollectionTable.visibility,
        createdAt: KnowledgeBaseCollectionTable.createdAt,
        updatedAt: KnowledgeBaseCollectionTable.updatedAt,
        isBookmarked: sql<boolean>`${BookmarkTable.id} IS NOT NULL`,
        userName: UserTable.name,
        userAvatar: UserTable.image,
        fileCount: sql<number>`COUNT(${KnowledgeBaseFileTable.id})`,
        totalSize: sql<string>`COALESCE(SUM(CAST(${KnowledgeBaseFileTable.size} AS BIGINT)), 0)`,
      })
      .from(KnowledgeBaseCollectionTable)
      .leftJoin(
        BookmarkTable,
        and(
          eq(BookmarkTable.itemId, KnowledgeBaseCollectionTable.id),
          eq(BookmarkTable.userId, userId),
          eq(BookmarkTable.itemType, "collection")
        )
      )
      .leftJoin(UserTable, eq(UserTable.id, KnowledgeBaseCollectionTable.userId))
      .leftJoin(KnowledgeBaseFileTable, eq(KnowledgeBaseFileTable.collectionId, KnowledgeBaseCollectionTable.id))
      .where(eq(KnowledgeBaseCollectionTable.userId, userId))
      .groupBy(
        KnowledgeBaseCollectionTable.id,
        KnowledgeBaseCollectionTable.name,
        KnowledgeBaseCollectionTable.description,
        KnowledgeBaseCollectionTable.userId,
        KnowledgeBaseCollectionTable.visibility,
        KnowledgeBaseCollectionTable.createdAt,
        KnowledgeBaseCollectionTable.updatedAt,
        BookmarkTable.id,
        UserTable.name,
        UserTable.image
      )
      .orderBy(desc(KnowledgeBaseCollectionTable.updatedAt));

    return collections.map(collection => ({
      ...collection,
      description: collection.description ?? undefined,
      userName: collection.userName ?? undefined,
      userAvatar: collection.userAvatar ?? undefined,
      isBookmarked: collection.isBookmarked ?? false,
      fileCount: Number(collection.fileCount),
      totalSize: collection.totalSize,
    }));
  },

  async selectPublicCollections(userId): Promise<KnowledgeBaseCollectionSummary[]> {
    const collections = await db
      .select({
        id: KnowledgeBaseCollectionTable.id,
        name: KnowledgeBaseCollectionTable.name,
        description: KnowledgeBaseCollectionTable.description,
        userId: KnowledgeBaseCollectionTable.userId,
        visibility: KnowledgeBaseCollectionTable.visibility,
        createdAt: KnowledgeBaseCollectionTable.createdAt,
        updatedAt: KnowledgeBaseCollectionTable.updatedAt,
        isBookmarked: sql<boolean>`${BookmarkTable.id} IS NOT NULL`,
        userName: UserTable.name,
        userAvatar: UserTable.image,
        fileCount: sql<number>`COUNT(${KnowledgeBaseFileTable.id})`,
        totalSize: sql<string>`COALESCE(SUM(CAST(${KnowledgeBaseFileTable.size} AS BIGINT)), 0)`,
      })
      .from(KnowledgeBaseCollectionTable)
      .leftJoin(
        BookmarkTable,
        and(
          eq(BookmarkTable.itemId, KnowledgeBaseCollectionTable.id),
          eq(BookmarkTable.userId, userId),
          eq(BookmarkTable.itemType, "collection")
        )
      )
      .leftJoin(UserTable, eq(UserTable.id, KnowledgeBaseCollectionTable.userId))
      .leftJoin(KnowledgeBaseFileTable, eq(KnowledgeBaseFileTable.collectionId, KnowledgeBaseCollectionTable.id))
      .where(eq(KnowledgeBaseCollectionTable.visibility, "public"))
      .groupBy(
        KnowledgeBaseCollectionTable.id,
        KnowledgeBaseCollectionTable.name,
        KnowledgeBaseCollectionTable.description,
        KnowledgeBaseCollectionTable.userId,
        KnowledgeBaseCollectionTable.visibility,
        KnowledgeBaseCollectionTable.createdAt,
        KnowledgeBaseCollectionTable.updatedAt,
        BookmarkTable.id,
        UserTable.name,
        UserTable.image
      )
      .orderBy(desc(KnowledgeBaseCollectionTable.updatedAt));

    return collections.map(collection => ({
      ...collection,
      description: collection.description ?? undefined,
      userName: collection.userName ?? undefined,
      userAvatar: collection.userAvatar ?? undefined,
      isBookmarked: collection.isBookmarked ?? false,
      fileCount: Number(collection.fileCount),
      totalSize: collection.totalSize,
    }));
  },

  async updateCollection(id, userId, collection) {
    const [result] = await db
      .update(KnowledgeBaseCollectionTable)
      .set({
        ...collection,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(KnowledgeBaseCollectionTable.id, id),
          eq(KnowledgeBaseCollectionTable.userId, userId)
        )
      )
      .returning();

    if (!result) {
      throw new Error("Collection not found or access denied");
    }

    return this.selectCollectionById(id, userId) as Promise<KnowledgeBaseCollection>;
  },

  async deleteCollection(id, userId) {
    const result = await db
      .delete(KnowledgeBaseCollectionTable)
      .where(
        and(
          eq(KnowledgeBaseCollectionTable.id, id),
          eq(KnowledgeBaseCollectionTable.userId, userId)
        )
      );

    if (result.rowCount === 0) {
      throw new Error("Collection not found or access denied");
    }
  },

  async checkAccess(collectionId, userId, destructive = false) {
    const [result] = await db
      .select({
        userId: KnowledgeBaseCollectionTable.userId,
        visibility: KnowledgeBaseCollectionTable.visibility,
      })
      .from(KnowledgeBaseCollectionTable)
      .where(eq(KnowledgeBaseCollectionTable.id, collectionId));

    if (!result) return false;

    if (destructive) {
      return result.userId === userId;
    }

    return result.userId === userId || result.visibility === "public";
  },

  // File operations
  async insertFile(file) {
    const [result] = await db
      .insert(KnowledgeBaseFileTable)
      .values({
        id: generateUUID(),
        collectionId: file.collectionId,
        name: file.name,
        originalName: file.originalName,
        size: file.size,
        type: file.type,
        extension: file.extension,
        storageUrl: file.storageUrl,
        uploadedAt: new Date(),
      })
      .returning();

    return result;
  },

  async selectFilesByCollectionId(collectionId): Promise<KnowledgeBaseFile[]> {
    return await db
      .select()
      .from(KnowledgeBaseFileTable)
      .where(eq(KnowledgeBaseFileTable.collectionId, collectionId))
      .orderBy(desc(KnowledgeBaseFileTable.uploadedAt));
  },

  async deleteFile(fileId, userId) {
    // First check if user has access to the collection containing this file
    const [fileInfo] = await db
      .select({
        collectionId: KnowledgeBaseFileTable.collectionId,
        collectionUserId: KnowledgeBaseCollectionTable.userId,
      })
      .from(KnowledgeBaseFileTable)
      .leftJoin(
        KnowledgeBaseCollectionTable,
        eq(KnowledgeBaseFileTable.collectionId, KnowledgeBaseCollectionTable.id)
      )
      .where(eq(KnowledgeBaseFileTable.id, fileId));

    if (!fileInfo || fileInfo.collectionUserId !== userId) {
      throw new Error("File not found or access denied");
    }

    const result = await db
      .delete(KnowledgeBaseFileTable)
      .where(eq(KnowledgeBaseFileTable.id, fileId));

    if (result.rowCount === 0) {
      throw new Error("File not found");
    }
  },

  async selectFileById(fileId): Promise<KnowledgeBaseFile | null> {
    const [result] = await db
      .select()
      .from(KnowledgeBaseFileTable)
      .where(eq(KnowledgeBaseFileTable.id, fileId));

    return result || null;
  },

  // Agent-Collection associations
  async assignCollectionToAgent(agentId, collectionId) {
    await db
      .insert(AgentCollectionTable)
      .values({
        id: generateUUID(),
        agentId,
        collectionId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  },

  async removeCollectionFromAgent(agentId, collectionId) {
    await db
      .delete(AgentCollectionTable)
      .where(
        and(
          eq(AgentCollectionTable.agentId, agentId),
          eq(AgentCollectionTable.collectionId, collectionId)
        )
      );
  },

  async selectCollectionsByAgentId(agentId): Promise<KnowledgeBaseCollectionSummary[]> {
    const collections = await db
      .select({
        id: KnowledgeBaseCollectionTable.id,
        name: KnowledgeBaseCollectionTable.name,
        description: KnowledgeBaseCollectionTable.description,
        userId: KnowledgeBaseCollectionTable.userId,
        visibility: KnowledgeBaseCollectionTable.visibility,
        createdAt: KnowledgeBaseCollectionTable.createdAt,
        updatedAt: KnowledgeBaseCollectionTable.updatedAt,
        userName: UserTable.name,
        userAvatar: UserTable.image,
        fileCount: sql<number>`COUNT(${KnowledgeBaseFileTable.id})`,
        totalSize: sql<string>`COALESCE(SUM(CAST(${KnowledgeBaseFileTable.size} AS BIGINT)), 0)`,
      })
      .from(AgentCollectionTable)
      .innerJoin(
        KnowledgeBaseCollectionTable,
        eq(AgentCollectionTable.collectionId, KnowledgeBaseCollectionTable.id)
      )
      .leftJoin(UserTable, eq(UserTable.id, KnowledgeBaseCollectionTable.userId))
      .leftJoin(KnowledgeBaseFileTable, eq(KnowledgeBaseFileTable.collectionId, KnowledgeBaseCollectionTable.id))
      .where(eq(AgentCollectionTable.agentId, agentId))
      .groupBy(
        KnowledgeBaseCollectionTable.id,
        KnowledgeBaseCollectionTable.name,
        KnowledgeBaseCollectionTable.description,
        KnowledgeBaseCollectionTable.userId,
        KnowledgeBaseCollectionTable.visibility,
        KnowledgeBaseCollectionTable.createdAt,
        KnowledgeBaseCollectionTable.updatedAt,
        UserTable.name,
        UserTable.image
      )
      .orderBy(desc(KnowledgeBaseCollectionTable.updatedAt));

    return collections.map(collection => ({
      ...collection,
      description: collection.description ?? undefined,
      userName: collection.userName ?? undefined,
      userAvatar: collection.userAvatar ?? undefined,
      isBookmarked: false,
      fileCount: Number(collection.fileCount),
      totalSize: collection.totalSize,
    }));
  },

  async selectAgentsByCollectionId(collectionId): Promise<{ id: string; name: string }[]> {
    return await db
      .select({
        id: AgentTable.id,
        name: AgentTable.name,
      })
      .from(AgentCollectionTable)
      .innerJoin(AgentTable, eq(AgentCollectionTable.agentId, AgentTable.id))
      .where(eq(AgentCollectionTable.collectionId, collectionId))
      .orderBy(AgentTable.name);
  },
};
