import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import { adminAuth } from "./firebase-admin-init";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      id: decodedToken.uid,
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...decodedToken
    };
    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}
