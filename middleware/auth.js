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

// Middleware to authorize based on fine-grained permission keys.
// Example: authorizePermission(['users:create'])
export const authorizePermission = (requiredPermissions = [], options = {}) => {
  const {
    mode = 'all',
    allowAdminByRole = false,
  } = options;

  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions.filter(Boolean)
    : [requiredPermissions].filter(Boolean);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    if (allowAdminByRole && req.user.role === 'Administrador') {
      return next();
    }

    if (required.length === 0) {
      return next();
    }

    const rawPermissionKeys = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const userPermissionKeys = new Set(rawPermissionKeys.map((permission) => String(permission).trim()).filter(Boolean));

    const hasAll = required.every((permission) => userPermissionKeys.has(permission));
    const hasAny = required.some((permission) => userPermissionKeys.has(permission));
    const authorized = mode === 'any' ? hasAny : hasAll;

    if (!authorized) {
      return res.status(403).json({
        error: 'Access denied: insufficient permission keys',
        required_permissions: required,
      });
    }

    return next();
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
    user_id: Number.parseInt(userId, 10),
    username: userName
  };

  next();
};

function getResourceIdByType(resourceType, params) {
  switch (resourceType) {
    case 'request':
      return params.request_id;
    case 'receipt':
      return params.receipt_id;
    case 'user':
      return params.user_id;
    default:
      return params.id;
  }
}

async function validateRequestSocietyAccess(resourceId, societyId) {
  return prisma.request.findFirst({
    where: {
      request_id: Number(resourceId),
      society_id: Number(societyId),
    },
    select: { request_id: true },
  });
}

async function validateReceiptSocietyAccess(resourceId, societyId) {
  return prisma.receipt.findFirst({
    where: {
      receipt_id: Number(resourceId),
      society_id: Number(societyId),
    },
    select: { receipt_id: true },
  });
}

async function validateUserSocietyAccess(resourceId, user) {
  const targetUser = await prisma.user.findUnique({
    where: { user_id: Number(resourceId) },
    select: { user_id: true, society_id: true }
  });

  if (!targetUser) {
    return { error: 'User not found' };
  }

  if (user.society_group_id) {
    const targetSociety = await prisma.society.findUnique({
      where: { id: targetUser.society_id },
      select: { society_group_id: true }
    });

    if (!targetSociety || targetSociety.society_group_id !== user.society_group_id) {
      return { error: 'Access denied: User does not belong to your society group' };
    }

    return { resource: targetUser };
  }

  if (targetUser.society_id !== Number(user.society_id)) {
    return { error: 'Access denied: resource does not belong to your society' };
  }

  return { resource: targetUser };
}

const validateRequestSocietyAccessMiddleware = async (req, res, next) => {
  if (!req.user?.society_id) {
    return res.status(401).json({ error: 'Society ID not found in token' });
  }

  try {
    const resourceId = getResourceIdByType('request', req.params);

    if (!resourceId) {
      return next();
    }

    const resource = await validateRequestSocietyAccess(resourceId, req.user.society_id);

    if (!resource) {
      return res.status(403).json({ error: 'Access denied: resource does not belong to your society' });
    }

    return next();
  } catch (error) {
    console.error('Error in validateSocietyAccess middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const validateReceiptSocietyAccessMiddleware = async (req, res, next) => {
  if (!req.user?.society_id) {
    return res.status(401).json({ error: 'Society ID not found in token' });
  }

  try {
    const resourceId = getResourceIdByType('receipt', req.params);

    if (!resourceId) {
      return next();
    }

    const resource = await validateReceiptSocietyAccess(resourceId, req.user.society_id);

    if (!resource) {
      return res.status(403).json({ error: 'Access denied: resource does not belong to your society' });
    }

    return next();
  } catch (error) {
    console.error('Error in validateSocietyAccess middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const validateUserSocietyAccessMiddleware = async (req, res, next) => {
  if (!req.user?.society_id && !req.user?.society_group_id) {
    return res.status(401).json({ error: 'Society context not found in token' });
  }

  try {
    const resourceId = getResourceIdByType('user', req.params);

    if (!resourceId) {
      return next();
    }

    const accessResult = await validateUserSocietyAccess(resourceId, req.user);

    if (accessResult.error) {
      return res.status(403).json({ error: accessResult.error });
    }

    return next();
  } catch (error) {
    console.error('Error in validateSocietyAccess middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to validate that a resource (Request or Receipt) belongs to the user's society
 * Prevents users from accessing resources from other societies
 * @param {string} resourceType - Type of resource: 'request' or 'receipt'
 */
export const validateSocietyAccess = (resourceType) => {
  const accessMiddlewares = {
    request: validateRequestSocietyAccessMiddleware,
    receipt: validateReceiptSocietyAccessMiddleware,
    user: validateUserSocietyAccessMiddleware,
  };

  return accessMiddlewares[resourceType] ?? ((req, res, next) => next());
};

/**
 * Middleware to require default admin permissions
 * Prevents non-default admins from managing society groups
 * Detailed authorization is checked in the service layer
 */
export const requireDefaultAdmin = (req, res, next) => {
  if (!req.user?.society_group_id) {
    return res.status(403).json({ error: 'User must belong to a society group' });
  }

  const permissionKeys = Array.isArray(req.user?.permissions)
    ? req.user.permissions.map((permission) => String(permission).trim())
    : [];

  const isSuperAdminRole = req.user?.role === 'Superadministrador';
  const canManageGroups = permissionKeys.includes('superadmin:manage_groups');

  if (!isSuperAdminRole && !canManageGroups) {
    return res.status(403).json({ error: 'Access denied: requires superadmin privileges' });
  }

  next();
};