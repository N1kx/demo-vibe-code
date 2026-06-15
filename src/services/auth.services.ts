import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema/users";
import { userSessions } from "../db/schema/user_sessions";

interface LoginInput {
  username: string;
  password: string;
}

interface SessionUser {
  id: number;
  username: string;
  full_name: string;
}

const AUTH_ERROR = "Username or password is not found. Please try again.";

export async function loginUser(
  input: LoginInput
): Promise<{ sessionId: string; userId: number; username: string }> {
  const [user] = await db
    .select({ id: users.id, username: users.username, password: users.password })
    .from(users)
    .where(eq(users.username, input.username))
    .limit(1);

  if (!user) throw new Error(AUTH_ERROR);

  const valid = await Bun.password.verify(input.password, user.password);
  if (!valid) throw new Error(AUTH_ERROR);

  const sessionId = crypto.randomUUID();

  // Delete existing sessions for this user before creating a new one
  await db.delete(userSessions).where(eq(userSessions.userId, user.id));

  await db.insert(userSessions).values({
    token: sessionId,
    userId: user.id,
    createdBy: user.username,
  });

  return { sessionId, userId: user.id, username: user.username };
}

export async function logoutUser(sessionId: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.token, sessionId));
}

export async function getSessionUser(
  sessionId: string
): Promise<SessionUser | null> {
  const [result] = await db
    .select({
      id: users.id,
      username: users.username,
      full_name: users.fullName,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(eq(userSessions.token, sessionId))
    .limit(1);

  return result ?? null;
}
