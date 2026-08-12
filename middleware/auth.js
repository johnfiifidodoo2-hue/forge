const jwt = require('jsonwebtoken');

// Requires a valid Bearer token. Attaches decoded user info to req.user.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-forge-key-change-me-in-production');
    req.user = decoded; // { id, email, name, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth };
