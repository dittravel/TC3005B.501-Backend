<<<<<<< Updated upstream
=======
/**
* Authentication Middleware
* 
* This module provides authentication and authorization middleware functions
* for the travel request system. It handles JWT token validation, role-based
* access control, and IP address verification for enhanced security.
*/

>>>>>>> Stashed changes
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid Token' });
      }
      
      const requestIp = req.headers['x-forwarded-for'] || req.ip;
      
      if (process.env.NODE_ENV === 'production' && decoded.ip !== requestIp) {
        return res.status(403).json({ error: 'Token mismatch: unauthorized device' });
      }
      
      req.user = decoded;
      next();
      
    });
  } else {
    res.status(401).json({ error: 'Token was not provided' });
  }
};

export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403). json({ error: "Access denied: insuficient permissions."});
    }
    next();
  };
};