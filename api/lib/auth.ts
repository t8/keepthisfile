import jwt from 'jsonwebtoken';
import { getUserByEmail, createUser, updateUserLastLogin } from './models.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthTokenPayload {
  email: string;
  userId: string;
}

export function generateToken(email: string, userId: string): string {
  return jwt.sign({ email, userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}

export function getAuthTokenFromRequest(request: Request | { headers: { authorization?: string; cookie?: string } }): string | null {
  // Handle Web API Request
  if (request instanceof Request) {
    const req = request as Request;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check cookies
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      return cookies['auth-token'] || null;
    }
  } else {
    // Handle VercelRequest (Node.js IncomingMessage)
    const req = request as { headers: { authorization?: string; cookie?: string } };
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check cookies
    const cookieHeader = req.headers?.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      return cookies['auth-token'] || null;
    }
  }
  
  return null;
}

export async function getCurrentUser(request: Request | { headers: { authorization?: string; cookie?: string } }): Promise<{ email: string; userId: string } | null> {
  const token = getAuthTokenFromRequest(request);
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload) return null;
  
  return payload;
}

export async function requireAuth(request: Request): Promise<{ email: string; userId: string }> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function loginOrCreateUser(email: string): Promise<{ user: { email: string; userId: string }; token: string }> {
  let user = await getUserByEmail(email);
  
  if (!user) {
    const newUser = await createUser(email);
    user = newUser;
  } else {
    await updateUserLastLogin(email);
  }
  
  const userId = user._id!;
  const token = generateToken(email, userId);
  
  return {
    user: { email, userId },
    token,
  };
}

