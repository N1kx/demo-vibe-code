import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema/users";

interface RegisterInput {
  username: string;
  full_name: string;
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, input.username))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Username already exists.");
  }

  const hashed = await Bun.password.hash(input.password);

  await db.insert(users).values({
    username: input.username,
    fullName: input.full_name,
    email: input.email,
    password: hashed,
    createdBy: input.username,
  });
}
