import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage-instance";
import type { User, UserRole } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser(req: Request): Promise<User | null> {
  const userId = req.session?.userId;
  if (!userId) return null;
  const user = await storage.getUser(userId);
  return user ?? null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  getCurrentUser(req).then((user) => {
    if (!user) {
      return res.status(401).json({ error: "No has iniciado sesión" });
    }
    (req as any).user = user;
    next();
  });
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    getCurrentUser(req).then((user) => {
      if (!user) {
        return res.status(401).json({ error: "No has iniciado sesión" });
      }
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: "No tienes permisos para esta acción" });
      }
      (req as any).user = user;
      next();
    });
  };
}
