import { relations } from 'drizzle-orm'
import {
	boolean,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
	id: uuid('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	username: text('username').notNull().unique(),
	displayName: text('display_name'),
	avatarUrl: text('avatar_url'),
	bio: text('bio'),
	isAdmin: boolean('is_admin').default(false),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date()),
})

export const memos = pgTable(
	'memos',
	{
		id: uuid('id').primaryKey(),

		content: text('content').notNull(),

		userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

		// 允许用户匿名评论
		guestName: text('guest_name'),
		guestEmail: text('guest_email'),

		parentId: uuid('parent_id'),
		quoteId: uuid('quote_id'),

		path: text('path').default('/'),

		visibility: text('visibility', { enum: ['public', 'private'] })
			.default('public')
			.notNull(),
		status: text('status', { enum: ['published', 'archived', 'deleted'] })
			.default('published')
			.notNull(),
		isPinned: boolean('is_pinned').default(false),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index('idx_memos_user').on(table.userId),
		index('idx_memos_parent').on(table.parentId),
		index('idx_memos_quote').on(table.quoteId),
		index('idx_memos_path').on(table.path),

		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: 'memos_parent_id_fkey',
		}).onDelete('cascade'),

		foreignKey({
			columns: [table.quoteId],
			foreignColumns: [table.id],
			name: 'memos_quote_id_fkey',
		}).onDelete('set null'),
	],
)

export const resources = pgTable('resources', {
	id: uuid('id').primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),

	filename: text('filename').notNull(),
	type: text('type').notNull(), // MIME
	size: integer('size').notNull(), // 字节数

	provider: text('provider').default('supabase').notNull(),
	path: text('path').notNull(), // 存储路径，包含文件名

	externalLink: text('external_link'),
	createdAt: timestamp('created_at').defaultNow(),
	memoId: uuid('memo_id').references(() => memos.id, { onDelete: 'set null' }),
})

export const usersRelations = relations(users, ({ many }) => ({
	memos: many(memos),
}))

export const memosRelations = relations(memos, ({ one, many }) => ({
	author: one(users, {
		fields: [memos.userId],
		references: [users.id],
	}),
	parent: one(memos, {
		fields: [memos.parentId],
		references: [memos.id],
		relationName: 'memo_replies',
	}),
	replies: many(memos, {
		relationName: 'memo_replies',
	}),
	quotedMemo: one(memos, {
		fields: [memos.quoteId],
		references: [memos.id],
		relationName: 'memo_quotes',
	}),
	resources: many(resources),
}))

export const resourcesRelations = relations(resources, ({ one }) => ({
	owner: one(users, { fields: [resources.userId], references: [users.id] }),
	memo: one(memos, {
		fields: [resources.memoId],
		references: [memos.id],
	}),
}))
