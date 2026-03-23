import { relations, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  coverImageUrl: text("cover_image_url"),
  bio: text("bio"),
  isAdmin: boolean("is_admin").default(false),
  banned: boolean("banned").default(false),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull(),
});

export const memos = pgTable(
  "memos",
  {
    id: uuid("id").primaryKey(),

    content: text("content").notNull(),

    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    parentId: uuid("parent_id"),
    quoteId: uuid("quote_id"),

    path: text("path").default("/"),

    visibility: text("visibility", { enum: ["public", "private"] })
      .default("public")
      .notNull(),
    status: text("status", { enum: ["published", "archived", "deleted"] })
      .default("published")
      .notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    index("idx_memos_user").on(table.userId),
    index("idx_memos_parent").on(table.parentId),
    index("idx_memos_quote").on(table.quoteId),
    index("idx_memos_path").on(table.path),
    index("idx_memos_content_trgm").using(
      "gin",
      sql`${table.content} gin_trgm_ops`,
    ),

    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "memos_parent_id_fkey",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.quoteId],
      foreignColumns: [table.id],
      name: "memos_quote_id_fkey",
    }).onDelete("set null"),
  ],
);

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  filename: text("filename").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),

  provider: text("provider").default("supabase").notNull(),
  path: text("path").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  memoId: uuid("memo_id").references(() => memos.id, { onDelete: "set null" }),
});

export const usersRelations = relations(users, ({ many }) => ({
  memos: many(memos),
}));

export const memosRelations = relations(memos, ({ one, many }) => ({
  author: one(users, {
    fields: [memos.userId],
    references: [users.id],
  }),
  parent: one(memos, {
    fields: [memos.parentId],
    references: [memos.id],
    relationName: "memo_replies",
  }),
  replies: many(memos, {
    relationName: "memo_replies",
  }),
  quotedMemo: one(memos, {
    fields: [memos.quoteId],
    references: [memos.id],
    relationName: "memo_quotes",
  }),
  resources: many(resources),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  owner: one(users, { fields: [resources.userId], references: [users.id] }),
  memo: one(memos, {
    fields: [resources.memoId],
    references: [memos.id],
  }),
}));

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  isEncrypted: boolean("is_encrypted").default(false).notNull(),
  isSecret: boolean("is_secret").default(false).notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const settingsRelations = relations(settings, ({ one }) => ({
  updater: one(users, {
    fields: [settings.updatedBy],
    references: [users.id],
  }),
}));

// Default settings values
export const defaultSettings = [
  {
    key: "ROOT_DOMAIN",
    value: "nodal.roitium.com",
    isSecret: false,
    description: "Application root domain",
  },
  {
    key: "STORAGE_PROVIDER",
    value: "supabase",
    isSecret: false,
    description: "Storage provider: supabase, s3, or r2",
  },
  {
    key: "SUPABASE_URL",
    value: "",
    isSecret: false,
    description: "Supabase project URL",
  },
  {
    key: "STORAGE_BUCKET",
    value: "resources",
    isSecret: false,
    description: "Storage bucket name",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    value: "",
    isSecret: true,
    description: "Supabase service role key (encrypted)",
  },
  {
    key: "S3_ENDPOINT",
    value: "",
    isSecret: false,
    description: "S3/R2 endpoint URL",
  },
  {
    key: "S3_PUBLIC_URL",
    value: "",
    isSecret: false,
    description: "S3/R2 public URL",
  },
  {
    key: "S3_REGION",
    value: "auto",
    isSecret: false,
    description: "S3/R2 region",
  },
  {
    key: "S3_ACCESS_KEY_ID",
    value: "",
    isSecret: true,
    description: "S3/R2 access key (encrypted)",
  },
  {
    key: "S3_SECRET_ACCESS_KEY",
    value: "",
    isSecret: true,
    description: "S3/R2 secret key (encrypted)",
  },
];
