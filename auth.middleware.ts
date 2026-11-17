import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { adminAuth } from "./firebase-admin-init";

export const JWT_SECRET = process.env.JWT_SECRET || "raihan-dental-clinic-jwt-secret-key-2026";
export const ADMIN_KEY = process.env.ADMIN_PROVISION_KEY || "raihan-dental-admin-secret-2026";

export interface AuthenticatedUser {
  id: string;
  uid: string;
  email: string;
  name?: string;
  role: 'Patient' | 'Dentist' | 'Doctor' | 'Admin';
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Generate a signed JWT-compatible HMAC token
 */
export function signToken(payload: Record<string, any>, expiresInSeconds: number = 86400 * 7): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verify a signed JWT token
 */
export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${bodyB64}`)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: payload.id || payload.uid || "",
      uid: payload.uid || payload.id || "",
      email: payload.email || "",
      name: payload.name || "",
      role: payload.role || "Patient",
      ...payload
    };
  } catch {
    return null;
  }
}

/**
 * Unified Auth Middleware: Supports Firebase Admin ID tokens and internal HMAC JWT tokens
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  // 1. First attempt verification using server JWT token
  const internalUser = verifyToken(token);
  if (internalUser) {
    req.user = internalUser;
    return next();
  }

  // 2. Fall back to Firebase Admin ID token if available
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      id: decodedToken.uid,
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      role: (decodedToken.role as any) || (decodedToken.email === "cea23csb004@ceattingal.ac.in" ? "Admin" : "Patient"),
      ...decodedToken
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired authentication token" });
  }
}

/**
 * Role-Based Access Control Middleware
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }

    const userRole = req.user.role || (req.user.email === "cea23csb004@ceattingal.ac.in" ? "Admin" : "Patient");
    
    // Normalize Dentist / Doctor equivalence
    const isAllowed = allowedRoles.some(r => {
      if (r === "Dentist" && (userRole === "Dentist" || userRole === "Doctor")) return true;
      if (r === "Doctor" && (userRole === "Dentist" || userRole === "Doctor")) return true;
      return r.toLowerCase() === userRole.toLowerCase();
    });

    if (!isAllowed) {
      return res.status(403).json({ 
        error: `Forbidden: Access restricted to authorized roles (${allowedRoles.join(", ")}). Your role is: ${userRole}.` 
      });
    }

    next();
  };
}

export const requireDentist = requireRole(["Dentist", "Doctor", "Admin"]);
export const requirePatient = requireRole(["Patient", "Admin"]);
export const requireAdmin = requireRole(["Admin"]);
