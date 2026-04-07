/**
* Authentication Middleware
* 
* This module provides authentication and authorization middleware functions
* for the travel request system. It handles JWT token validation, role-based
* access control, and IP address verification for enhanced security.
*/

import jwt from 'jsonwebtoken';

const isIpBindingEnabled = String(process.env.ENFORCE_TOKEN_IP_BINDING || 'false').toLowerCase() === 'true';

// Middleware to authenticate JWT token and verify IP address
export const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid Token' });
      }
      
      const requestIp = req.headers['x-forwarded-for'] || req.ip;

      if (isIpBindingEnabled && decoded.ip && decoded.ip !== requestIp) {
        return res.status(403).json({ error: 'Token mismatch: unauthorized device' });
      }
      
      req.user = decoded;
      next();
      
    });
  } else {
    res.status(401).json({ error: 'Token was not provided' });
  }
};

// Middleware to authorize based on user roles
export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403). json({ error: "Access denied: insuficient permissions."});
    }
    next();
  };
};

/**
 * Middleware to authenticate using cookies instead of JWT headers
 * Used for email action endpoints where cookies are available but JWT might not be
 */
export const authenticateTokenFromCookies = (req, res, next) => {
  // Parse cookies from the Cookie header
  const cookieHeader = req.headers.cookie || '';
  const cookies = {};
  
  // Split the cookie header into individual cookies 
  // and populate the cookies object with key-value pairs
  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });

  const userRole = cookies.role;
  const userId = cookies.id;
  const userName = cookies.username;

  if (!userRole || !userId) {
    return res.status(401).json({ error: 'User is not authenticated' });
  }
  
  req.user = {
    role: userRole,
    user_id: parseInt(userId),
    username: userName
  };

  next();
};