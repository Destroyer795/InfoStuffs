import { verifyToken } from '@clerk/backend';
import { reverificationError, signedInAuthObject } from '@clerk/backend/internal';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  if (!token || token.length < 20) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (!process.env.CLERK_SECRET_KEY) {
    return res.status(500).json({ message: 'Server misconfiguration: Clerk secret key missing' });
  }
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    if (!payload || !payload.sub) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
    const { sessionId, has } = signedInAuthObject({}, token, payload);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      sessionId,
      has,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

export const requireVaultResetReverification = (req, res, next) => {
  const policy = 'strict';
  if (!req.auth?.sessionId || !req.auth.has?.({ reverification: policy })) {
    return res.status(403).json(reverificationError(policy));
  }
  next();
};
