import type { User } from "@shared/schema";

export type MarketAccessStatus = "none" | "pending" | "approved";

export function resolveMarketAccess(user?: User | null): MarketAccessStatus {
  if (!user) return "none";
  if (user.role === "admin" || user.role === "official") return "approved";
  if (user.marketAccess === "approved") return "approved";
  if (user.marketAccess === "pending") return "pending";
  if (user.role === "merchant") {
    if (user.kycStatus === "approved") return "approved";
    if (user.kycStatus === "pending") return "pending";
  }
  return "none";
}

export function canAccessWholesaleChannel(user?: User | null): boolean {
  return resolveMarketAccess(user) === "approved";
}
