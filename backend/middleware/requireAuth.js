import { verifyToken } from '@clerk/backend';

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
    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
