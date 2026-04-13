/**
* Authentication Middleware
*
* This module provides authentication and authorization middleware functions
* for the travel request system. It handles JWT token validation, role-based
* access control, IP address verification, and multi-tenant society access validation.
*/

import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

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

/**
 * Middleware to validate that a resource (Request or Receipt) belongs to the user's society
 * Prevents users from accessing resources from other societies
 * @param {string} resourceType - Type of resource: 'request' or 'receipt'
 */
export const validateSocietyAccess = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user?.society_id) {
      return res.status(401).json({ error: 'Society ID not found in token' });
    }

    try {
      // Extract resource ID from params
      const resourceId = resourceType === 'request'
        ? req.params.request_id
        : resourceType === 'receipt'
        ? req.params.receipt_id
        : resourceType === 'user'
        ? req.params.user_id
        : req.params.id;

      if (!resourceId) {
        return next(); // No ID in params, skip validation
      }

      let resource;

      if (resourceType === 'request') {
        resource = await prisma.request.findFirst({
          where: {
            request_id: Number(resourceId),
            society_id: Number(req.user.society_id),
          },
          select: { request_id: true },
        });
      } else if (resourceType === 'receipt') {
        resource = await prisma.receipt.findFirst({
          where: {
            receipt_id: Number(resourceId),
            society_id: Number(req.user.society_id),
          },
          select: { receipt_id: true },
        });
      } else if (resourceType === 'user') {
        // Check if users belong to same society, or to same society group if admin
        const targetUser = await prisma.user.findUnique({
          where: { user_id: Number(resourceId) },
          select: { user_id: true, society_id: true }
        });

        if (!targetUser) {
          return res.status(403).json({ error: 'User not found' });
        }

        // If admin has society_group_id, check if target user's society is in the same group
        if (req.user.society_group_id) {
          const targetSociety = await prisma.society.findUnique({
            where: { id: targetUser.society_id },
            select: { society_group_id: true }
          });

          if (!targetSociety || targetSociety.society_group_id !== req.user.society_group_id) {
            return res.status(403).json({ error: 'Access denied: User does not belong to your society group' });
          }
        } else {
          // Regular user can only access their own society
          if (targetUser.society_id !== Number(req.user.society_id)) {
            return res.status(403).json({ error: 'Access denied: resource does not belong to your society' });
          }
        }

        resource = targetUser;
      }

      if (!resource) {
        return res.status(403).json({ error: 'Access denied: resource does not belong to your society' });
      }

      next();
    } catch (error) {
      console.error('Error in validateSocietyAccess middleware:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require default admin permissions
 * Prevents non-default admins from managing society groups
 * Detailed authorization is checked in the service layer
 */
export const requireDefaultAdmin = (req, res, next) => {
  // Basic check: admin must have a society_group_id
  // Detailed authorization will be checked in the service
  if (!req.user?.society_group_id) {
    return res.status(403).json({ error: 'User must belong to a society group' });
  }
  next();
};