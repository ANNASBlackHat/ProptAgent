import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export type UserRole = 'super_admin' | 'landlord' | 'tenant';

export interface DecodedToken {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: DecodedToken;
}

export type RouteHandler = (
  req: AuthenticatedRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) => Promise<Response> | Response;

/**
 * Hash password helper using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password helper using bcryptjs
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign JWT token
 */
export function signToken(payload: Omit<DecodedToken, 'iat' | 'exp'>): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): DecodedToken | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * withAuth higher-order API Route handler middleware to verify JWT
 * and check role permissions. Supports reading from Authorization header
 * and Cookie header.
 */
export function withAuth(
  handler: RouteHandler,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest, context: unknown) => {
    try {
      let token = req.cookies.get('token')?.value;

      if (!token) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Authentication token missing or invalid' },
          { status: 401 }
        );
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json(
          { success: false, error: 'Authentication token is expired or invalid' },
          { status: 401 }
        );
      }

      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(decoded.role)) {
          return NextResponse.json(
            { success: false, error: 'Access denied: insufficient permissions' },
            { status: 403 }
          );
        }
      }

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = decoded;

      return await handler(authenticatedReq, context);
    } catch (error) {
      console.error('withAuth middleware error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error during authentication' },
        { status: 500 }
      );
    }
  };
}
