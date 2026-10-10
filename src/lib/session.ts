import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "sms_demo_session";
const SESSION_SECONDS = 8 * 60 * 60;
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type Session = {
  userId: string;
  name: string;
  role: UserRole;
  studentId: string | null;
  studentStatus: string | null;
};

function cookieSecureFromHeaders(values: Headers) {
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  const forwarded = values.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  const origin = values.get("origin");
  return origin?.startsWith("https://") ?? false;
}

function cookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure, maxAge: SESSION_SECONDS };
}

async function decode(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const userId = await decode(token);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: { select: { status: true } } },
  });
  if (!user) return null;
  return {
    userId: user.id,
    name: user.name,
    role: user.role,
    studentId: user.studentId,
    studentStatus: user.student?.status ?? null,
  };
});

export async function requireStaff() {
  const session = await getSession();
  if (!session) throw new AppError("UNAUTHENTICATED", 401, "Sign in is required.");
  if (session.role !== UserRole.REGISTRY_STAFF) throw new AppError("FORBIDDEN", 403, "Staff access is required.");
  return session;
}

export async function requireStudent() {
  const session = await getSession();
  if (!session) throw new AppError("UNAUTHENTICATED", 401, "Sign in is required.");
  if (session.role !== UserRole.STUDENT || !session.studentId) {
    throw new AppError("FORBIDDEN", 403, "Student access is required.");
  }
  return session as Session & { studentId: string };
}

export async function requireOwnStudent(studentId: string) {
  const session = await requireStudent();
  if (session.studentId !== studentId) throw new AppError("NOT_FOUND", 404, "Resource not found.");
  return session;
}

async function signToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret);
}

export async function createDemoSession(userId: string, requestHeaders?: Headers) {
  if (!env.ENABLE_DEMO_SESSION) throw new AppError("NOT_FOUND", 404, "Resource not found.");
  const user = await prisma.user.findFirst({ where: { id: userId, isDemoPersona: true } });
  if (!user) throw new AppError("NOT_FOUND", 404, "Demo persona not found.");
  const values = requestHeaders ?? (await headers());
  return { token: await signToken(user.id), secure: cookieSecureFromHeaders(values) };
}

export async function setDemoSessionForAction(userId: string) {
  const { token, secure } = await createDemoSession(userId, await headers());
  (await cookies()).set(COOKIE_NAME, token, cookieOptions(secure));
}

export function setDemoSessionResponse(response: NextResponse, token: string, secure: boolean) {
  response.cookies.set(COOKIE_NAME, token, cookieOptions(secure));
  return response;
}

export function clearDemoSessionResponse(response: NextResponse, request: NextRequest) {
  response.cookies.set(COOKIE_NAME, "", { ...cookieOptions(cookieSecureFromHeaders(request.headers)), maxAge: 0 });
  return response;
}
