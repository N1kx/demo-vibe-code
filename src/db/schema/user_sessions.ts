import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by", { length: 50 }),
  updatedAt: timestamp("updated_at"),
  updatedBy: varchar("updated_by", { length: 50 }),
});
