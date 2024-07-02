import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

const common = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  createdAt: text("createdAt")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
};

export const Users = sqliteTable("users", {
  ...common,

  username: text("username").notNull().unique(),
});

export type InsertUser = typeof Users.$inferInsert;
export type SelectUser = typeof Users.$inferSelect;

export const Videos = sqliteTable("videos", {
  ...common,

  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnail: text("thumbnail").notNull(),
  duration: integer("duration").notNull(),
  channel: text("channel").notNull(),
  url: text("url").notNull(),
  length: integer("length").notNull().default(0),
});
export type InsertVideos = typeof Videos.$inferInsert;
export type SelectVideos = typeof Videos.$inferSelect;

export const UserVideos = sqliteTable("userVideos", {
  ...common,

  userId: text("userId")
    .notNull()
    .references(() => Users.id),

  videoId: text("videoId")
    .notNull()
    .references(() => Videos.id),
});
export type InsertUserVideos = typeof UserVideos.$inferInsert;
export type SelectUserVideos = typeof UserVideos.$inferSelect;
