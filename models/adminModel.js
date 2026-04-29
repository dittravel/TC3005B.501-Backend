/**
* Admin Model
* 
* Database operations for admin functions
*/

import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const SUPERADMIN_ROLE_NAME = 'Superadministrador';
const SUPERADMIN_PERMISSION_PREFIX = 'superadmin:';

const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

const encryptModelValue = (value) => {
  if (!AES_SECRET_KEY) {
    throw new Error('AES_SECRET_KEY is required for encryption');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), iv);
  let encrypted = cipher.update(String(value), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('hex') + encrypted;
};

const getRequesterPermissionKeys = (requester = null) => new Set(
  Array.isArray(requester?.permissions)
    ? requester.permissions.map((permission) => String(permission).trim()).filter(Boolean)
    : []
);

const isRequesterSuperAdmin = (requester = null) => {
  const permissionKeys = getRequesterPermissionKeys(requester);
  return requester?.role === SUPERADMIN_ROLE_NAME || permissionKeys.has('superadmin:manage_master_admins');
};

const containsSuperadminPermission = (permissions = []) =>
  Array.isArray(permissions)
    ? permissions.some((permission) => String(permission).trim().startsWith(SUPERADMIN_PERMISSION_PREFIX))
    : false;

const containsRestrictedManagementPermission = (permissions = []) =>
  Array.isArray(permissions)
    ? permissions.some((permission) => {
        const normalizedPermission = String(permission).trim();
        return normalizedPermission.startsWith(SUPERADMIN_PERMISSION_PREFIX) || normalizedPermission.startsWith('society_groups:');
      })
    : false;

const toPermissionKey = (permissionName) =>
  String(permissionName || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '_')
    .replaceAll(/^_|_$/g, '');

const normalizeSocietyGroupId = (societyGroupId) => {
  if (societyGroupId === null || societyGroupId === undefined || societyGroupId === '') {
    return null;
  }
  const id = Number(societyGroupId);
  return Number.isNaN(id) ? null : id;
};

const ensureSocietyGroupExists = async (societyGroupId) => {
  const id = normalizeSocietyGroupId(societyGroupId);
  if (!id) return null;

  const group = await prisma.societyGroup.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!group) {
    throw new Error(`Invalid society_group_id: ${id}. Create or assign a valid SocietyGroup first.`);
  }

  return id;
};

const findOrCreatePermissionId = async (permissionValue, societyId) => {
  const normalizedPermissionValue = String(permissionValue || '').trim();
  if (!normalizedPermissionValue) {
    throw new Error('Invalid permission value provided');
  }

  const looksLikePermissionKey = normalizedPermissionValue.includes(':');
  const permissionKey = looksLikePermissionKey
    ? normalizedPermissionValue
    : toPermissionKey(normalizedPermissionValue);

  const existingPermission = await prisma.permission.findFirst({
    where: {
      society_id: societyId,
      OR: [
        { permission_key: normalizedPermissionValue },
        { permission_name: normalizedPermissionValue },
        { permission_key: permissionKey },
      ],
    },
    select: { permission_id: true },
  });

  if (existingPermission) {
    return existingPermission.permission_id;
  }

  const createdPermission = await prisma.permission.create({
    data: {
      permission_key: permissionKey,
      permission_name: normalizedPermissionValue,
      module: 'custom',
      action: 'custom',
      description: `Permission ${normalizedPermissionValue}`,
      society_id: societyId,
    },
    select: { permission_id: true },
  });

  return createdPermission.permission_id;
};

const Admin = {
  // Get all active users with full information
  async getUserList(filterBy = {}) {
    try {
      const where = { active: true };

      if (typeof filterBy === 'number') {
        where.society_id = filterBy;
      } else if (filterBy.society_id) {
        // Society is the primary access boundary for admin user management.
        where.society_id = Number(filterBy.society_id);
      } else if (filterBy.society_group_id) {
        // Filter by society_group_id, get users from any society in the group
        where.Society = {
          society_group_id: filterBy.society_group_id
        };
      }

      const users = await prisma.user.findMany({
        where,
        orderBy: { department_id: 'asc' },
        include: {
          role: {
            select: { role_name: true }
          },
          department: {
            select: { 
              department_name: true,
              CostCenter: {
                select: { cost_center_name: true }
              }
            }
          }
        }
      });

      const includeSuperAdmins = filterBy?.include_superadmins === true;
      const scopedUsers = includeSuperAdmins
        ? users
        : users.filter((user) => user.role?.role_name !== SUPERADMIN_ROLE_NAME);

      // Format the response to match the expected structure
      return scopedUsers.map(user => ({
        user_id: user.user_id,
        user_name: user.user_name,
        email: user.email,
        active: user.active,
        role_name: user.role?.role_name || null,
        department_name: user.department?.department_name || null,
        department_id: user.department_id,
        cost_center_name: user.department?.CostCenter?.cost_center_name || null
      }));
    } catch (error) {
      console.error('Error finding user list:', error);
      throw error;
    }
  },
    
  // Create multiple users in a single batch operation
  async createMultipleUsers(users) {
    try {
      const result = await prisma.user.createMany({
        data: users.map(user => ({
          role_id: user.role_id,
          department_id: user.department_id,
          society_id: user.society_id || null,
          boss_id: user.boss_id || null,
          user_name: user.user_name,
          password: user.password,
          workstation: user.workstation,
          email: user.email,
          phone_number: user.phone_number
        })),
      });
      return result.count;
    } catch (error) {
      console.error('Error creating multiple users:', error);
      throw error;
    }
  },
    
  // Find role ID by role name
  async findRoleID(role_name, society_id = null) {
    try {
      const role = await prisma.role.findUnique({
        where: {
          role_name_society_id: {
            role_name,
            society_id
          }
        },
        select: { role_id: true }
      });
      return role ? role.role_id : null;
    } catch (error) {
      console.error('Error finding role ID for %s:', role_name, error);
      throw error;
    }
  },

  async getRoleMetaById(roleId) {
    return prisma.role.findUnique({
      where: { role_id: Number(roleId) },
      select: {
        role_id: true,
        role_name: true,
        is_system: true,
      },
    });
  },
  
  // Find department ID by department name and society_id
  async findDepartmentID(department_name, society_id = null) {
    try {
      const department = society_id !== null && society_id !== undefined
        ? await prisma.department.findUnique({
            where: {
              department_name_society_id: {
                department_name,
                society_id
              }
            },
            select: { department_id: true }
          })
        : await prisma.department.findFirst({
            where: { department_name },
            select: { department_id: true }
          });
      return department ? department.department_id : null;
    } catch (error) {
      console.error('Error finding department ID for %s:', department_name, error);
      throw error;
    }
  },
  
  // Check if a user exists by email
  async findUserByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { user_id: true }
      });
      return !!user;
    } catch (error) {
      console.error('Database Error in findUserByEmail:', error);
      throw error;
    }
  },
  
  // Create a single user
  async createUser(userData) {
    try {
      // Check if user with same email or username already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { user_name: userData.user_name }
          ]
        },
        select: { user_id: true }
      });
      if (existing) {
        throw new Error('User with this email or username already exists');
      }
      const user = await prisma.user.create({
        data: {
          role_id: userData.role_id,
          department_id: userData.department_id,
          user_name: userData.user_name,
          password: userData.password,
          workstation: userData.workstation || null,
          email: userData.email,
          phone_number: userData.phone_number || null,
          boss_id: userData.boss_id || null,
          society_id: userData.society_id || null,
          supplier: userData.supplier || null,
          active: userData.active ?? true
        },
        select: { user_id: true }
      });
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  // Retrieve all user emails
  async getAllEmails() {
    return prisma.user.findMany({
      select: { email: true }
    });
  },
    
  // Update user information
  async updateUser(userId, fieldsToUpdate) {
    // Filter out null/undefined values first
    // Prisma doesnt accept null values for updating fields
    const data = {};
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      if (value !== null && value !== undefined) {
        data[key] = value;
      }
    }

    // Convert IDs to connect format for Prisma relations
    // updateUser controller receives role_id, department_id and boss_id as plain IDs,
    // but Prisma expects a connect object for relations
    const roleChanged = !!data.role_id;
    if (roleChanged) {
      data.role = { connect: { role_id: data.role_id } };
      delete data.role_id;
      // Clear saved dashboard preferences when the role changes so stale
      // quick-action cards from the previous role are not shown.
      data.dashboard_preferences = null;
    }
    if (data.department_id) {
      data.department = { connect: { department_id: data.department_id } };
      delete data.department_id;
    }
    if (data.boss_id) {
      data.boss = { connect: { user_id: data.boss_id } };
      delete data.boss_id;
    }
    if (data.society_id) {
      data.Society = { connect: { id: data.society_id } };
      delete data.society_id;
    }

    return prisma.user.update({
      where: { user_id: Number(userId) },
      data,
      select: { user_id: true }
    });
  },

  // Deactivate a user by ID
  async deactivateUserById(userId) {
    try {
      const user = await prisma.user.update({
        where: { user_id: userId },
        data: { active: false },
        select: { user_id: true }
      });
      return !!user;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  },

  async getMasterAdmins(requester = null) {
    if (!isRequesterSuperAdmin(requester)) {
      throw new Error('Unauthorized: requires superadmin privileges');
    }

    const users = await prisma.user.findMany({
      where: {
        active: true,
        role: {
          role_name: SUPERADMIN_ROLE_NAME,
        },
      },
      select: {
        user_id: true,
        user_name: true,
        workstation: true,
        society_id: true,
      },
      orderBy: { user_id: 'asc' },
    });

    return users;
  },

  async createMasterAdmin(userData, requester = null) {
    if (!isRequesterSuperAdmin(requester)) {
      const error = new Error('Unauthorized: requires superadmin privileges');
      error.status = 403;
      throw error;
    }

    const superadminRole = await prisma.role.findFirst({
      where: {
        role_name: SUPERADMIN_ROLE_NAME,
        society_id: Number(requester.society_id),
      },
      select: { role_id: true },
    });

    if (!superadminRole) {
      const error = new Error('Superadministrator role is not configured for this society group');
      error.status = 500;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const encryptedEmail = encryptModelValue(userData.email);
    const encryptedPhone = userData.phone_number ? encryptModelValue(userData.phone_number) : null;

    const created = await prisma.user.create({
      data: {
        role_id: superadminRole.role_id,
        department_id: userData.department_id || null,
        society_id: userData.society_id || requester.society_id || null,
        user_name: userData.user_name,
        password: hashedPassword,
        workstation: userData.workstation || null,
        email: encryptedEmail,
        phone_number: encryptedPhone,
        boss_id: null,
        active: true,
      },
      select: {
        user_id: true,
      },
    });

    return {
      user_id: created.user_id,
      user_name: userData.user_name,
      role_name: SUPERADMIN_ROLE_NAME,
    };
  },

  // Get departments
  async getDepartments(societyId = null) {
    try {
      const where = {};

      if (societyId) {
        where.society_id = Number(societyId);
      }

      const departments = await prisma.department.findMany({
        where,
        select: { department_id: true, department_name: true, society_id: true }
      });
      return departments;
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  },

  // Get roles with their permissions
  async getRoles(societyId = null, requester = null) {
    try {
      const where = societyId ? { society_id: Number(societyId) } : {};

      if (societyId) {
        where.OR = [
          { society_id: Number(societyId) },
          { society_id: null },
        ];
      }

      where.role_name = { not: SUPERADMIN_ROLE_NAME };

      const roles = await prisma.role.findMany({
        where,
        include: {
          Role_Permission: {
            include: {
              Permission: {
                select: {
                  permission_name: true,
                  permission_key: true,
                },
              },
            },
          },
        },
      });
      return roles
        .filter((role) => role.role_name !== SUPERADMIN_ROLE_NAME)
        .map(role => ({
        role_id: role.role_id,
        role_name: role.role_name,
        is_default: Boolean(role.is_default),
        permissions: role.Role_Permission.map((rp) => rp.Permission.permission_name),
        permission_keys: role.Role_Permission.map((rp) => rp.Permission.permission_key),
      }));
    } catch (error) {
      console.error('Error getting roles:', error);
      throw error;
    }
  },

  // Get role details by ID, including assigned permissions
  async getRoleById(roleId, societyId = null, requester = null) {
    const id = Number(roleId);
    const role = await prisma.role.findUnique({
      where: { role_id: id },
      include: {
        Role_Permission: {
          include: {
            Permission: {
              select: {
                permission_name: true,
                permission_key: true,
              },
            },
          },
        },
      },
    });

    if (!role) return null;

    if (role.role_name === SUPERADMIN_ROLE_NAME) {
      throw new Error('Unauthorized: Role is restricted');
    }

    if (societyId && role.society_id !== Number(societyId)) {
      throw new Error('Unauthorized: Role does not belong to your society group');
    }

    if (societyId) {
      if (role.society_id && role.society_id !== Number(societyId)) {
        throw new Error('Unauthorized: Role does not belong to your society');
      }
    }

    return {
      role_id: role.role_id,
      name: role.role_name,
      description: role.description,
      is_default: Boolean(role.is_default),
      permissions: role.Role_Permission.map((rp) => rp.Permission.permission_name),
      permission_keys: role.Role_Permission.map((rp) => rp.Permission.permission_key),
    };
  },

  async getDefaultRole(societyId = null, requester = null) {
    const where = societyId
      ? { society_id: Number(societyId), is_default: true }
      : { is_default: true };

    where.role_name = { not: SUPERADMIN_ROLE_NAME };

    if (societyId) {
      where.OR = [
        {
          User: {
            some: {
              society_id: Number(societyId),
              active: true,
            },
          },
        },
        { is_default: true },
      ];
    }

    const role = await prisma.role.findFirst({
      where,
      select: {
        role_id: true,
        role_name: true,
        is_default: true,
      },
      orderBy: { role_id: 'asc' },
    });

    if (role) {
      return {
        role_id: role.role_id,
        name: role.role_name,
        is_default: Boolean(role.is_default),
      };
    }

    const fallbackWhere = societyId
      ? { society_id: Number(societyId), role_name: 'Solicitante' }
      : { role_name: 'Solicitante' };

    const fallback = await prisma.role.findFirst({
      where: fallbackWhere,
      select: {
        role_id: true,
        role_name: true,
      },
      orderBy: { role_id: 'asc' },
    });

    if (!fallback) {
      return null;
    }

    return {
      role_id: fallback.role_id,
      name: fallback.role_name,
      is_default: false,
    };
  },

  async setDefaultRole(roleId, societyId = null, requester = null) {
    const id = Number(roleId);
    const requesterIsSuperAdmin = isRequesterSuperAdmin(requester);
    const role = await prisma.role.findUnique({
      where: { role_id: id },
      select: {
        role_id: true,
        role_name: true,
        is_system: true,
        society_id: true,
      },
    });

    if (!role) {
      return false;
    }

    if (!requesterIsSuperAdmin && (role.role_name === SUPERADMIN_ROLE_NAME || role.is_system)) {
      throw new Error('Unauthorized: Role is restricted');
    }

    if (societyId) {
      if (role.society_id && role.society_id !== Number(societyId)) {
        throw new Error('Unauthorized: Role does not belong to your society');
      }

      const roleUsedOutsideSociety = await prisma.user.count({
        where: {
          role_id: id,
          active: true,
          society_id: {
            not: Number(societyId),
          },
        },
      });

      if (roleUsedOutsideSociety > 0) {
        throw new Error('Unauthorized: Role is shared with users from another society');
      }
    }

    const targetSocietyId = societyId ? Number(societyId) : role.society_id;

    await prisma.$transaction([
      prisma.role.updateMany({
        where: {
          society_id: targetSocietyId,
          is_default: true,
        },
        data: { is_default: false },
      }),
      prisma.role.update({
        where: { role_id: id },
        data: { is_default: true },
      }),
    ]);

    return true;
  },

  // Create role and optionally assign permissions
  async createRole(roleData, _societyId = null, requester = null) {
    const validSocietyId = _societyId ? Number(_societyId) : null;
    const requesterIsSuperAdmin = isRequesterSuperAdmin(requester);

    if (!requesterIsSuperAdmin && String(roleData?.name || '').trim() === SUPERADMIN_ROLE_NAME) {
      throw new Error('Unauthorized: cannot create superadmin role');
    }

    if (!requesterIsSuperAdmin && containsRestrictedManagementPermission(roleData?.permissions)) {
      throw new Error('Unauthorized: cannot assign restricted management permissions');
    }

    const role = await prisma.role.create({
      data: {
        role_name: roleData.name,
        description: roleData.description || null,
        society_id: validSocietyId,
        active: true,
        is_system: false,
      },
    });

    const permissionNames = Array.isArray(roleData.permissions) ? roleData.permissions : [];
    if (permissionNames.length > 0) {
      const permissionIds = [];

      for (const name of permissionNames) {
        const permissionId = await findOrCreatePermissionId(name, validSocietyId);
        permissionIds.push(permissionId);
      }

      await prisma.role_Permission.createMany({
        data: permissionIds.map((permissionId) => ({
          role_id: role.role_id,
          permission_id: permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return role;
  },

  // Update role and replace its permissions
  async updateRole(roleId, roleData, societyId = null, requester = null) {
    const id = Number(roleId);
    const requesterIsSuperAdmin = isRequesterSuperAdmin(requester);
    const existingRole = await prisma.role.findUnique({ where: { role_id: id } });
    if (!existingRole) return null;

    if (!requesterIsSuperAdmin && (existingRole.role_name === SUPERADMIN_ROLE_NAME || existingRole.is_system)) {
      throw new Error('Unauthorized: Role is restricted');
    }

    if (!requesterIsSuperAdmin && String(roleData?.name || '').trim() === SUPERADMIN_ROLE_NAME) {
      throw new Error('Unauthorized: cannot rename role to superadmin');
    }

    if (!requesterIsSuperAdmin && containsRestrictedManagementPermission(roleData?.permissions)) {
      throw new Error('Unauthorized: cannot assign restricted management permissions');
    }

    if (societyId) {
      if (existingRole.society_id && existingRole.society_id !== Number(societyId)) {
        throw new Error('Unauthorized: Role does not belong to your society');
      }

      const roleUsedOutsideSociety = await prisma.user.count({
        where: {
          role_id: id,
          active: true,
          society_id: {
            not: Number(societyId),
          },
        },
      });

      if (roleUsedOutsideSociety > 0) {
        throw new Error('Unauthorized: Role is shared with users from another society');
      }
    }

    await prisma.role.update({
      where: { role_id: id },
      data: {
        role_name: roleData.name,
        description: roleData.description || null,
      },
    });

    await prisma.role_Permission.deleteMany({ where: { role_id: id } });

    const permissionNames = Array.isArray(roleData.permissions) ? roleData.permissions : [];
    if (permissionNames.length > 0) {
      const permissionIds = [];

      for (const name of permissionNames) {
        const permissionId = await findOrCreatePermissionId(name, existingRole.society_id);
        permissionIds.push(permissionId);
      }

      await prisma.role_Permission.createMany({
        data: permissionIds.map((permissionId) => ({
          role_id: id,
          permission_id: permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return true;
  },

  // Delete role after checking dependencies
  async deleteRole(roleId, societyId = null, requester = null) {
    const id = Number(roleId);
    const requesterIsSuperAdmin = isRequesterSuperAdmin(requester);
    const role = await prisma.role.findUnique({ where: { role_id: id } });
    if (!role) return false;

    if (!requesterIsSuperAdmin && (role.role_name === SUPERADMIN_ROLE_NAME || role.is_system)) {
      throw new Error('Unauthorized: Role is restricted');
    }

    if (societyId) {
      if (role.society_id && role.society_id !== Number(societyId)) {
        throw new Error('Unauthorized: Role does not belong to your society');
      }

      const roleUsedOutsideSociety = await prisma.user.count({
        where: {
          role_id: id,
          active: true,
          society_id: {
            not: Number(societyId),
          },
        },
      });

      if (roleUsedOutsideSociety > 0) {
        throw new Error('Unauthorized: Role is shared with users from another society');
      }
    }

    const assignedUsers = await prisma.user.count({ where: { role_id: id, active: true } });
    if (assignedUsers > 0) {
      throw new Error('Cannot delete role: there are active users assigned to this role');
    }

    await prisma.role_Permission.deleteMany({ where: { role_id: id } });
    await prisma.role.delete({ where: { role_id: id } });

    return true;
  },

  // Get an auth rule by ID
  async getAuthRuleById(ruleId, societyId = null) {
    try {
      const id = Number(ruleId);
      const rule = await prisma.authorizationRule.findUnique({
        where: { rule_id: id },
        include: {
          levels: {
            orderBy: { level_number: 'asc' },
            select: {
              level_number: true,
              level_type: true,
              superior_level_number: true
            }
          }
        }
      });

      if (!rule) return null;

      if (societyId && rule.society_id !== null && rule.society_id !== Number(societyId)) {
        throw new Error('Unauthorized: Rule does not belong to your society');
      }

      return rule;
    } catch (error) {
      console.error('Error getting auth rule by ID:', error);
      throw error;
    }
  },

  // Get auth rules
  async getAuthRules(societyId = null) {
    try {
      const where = {};

      if (societyId) {
        where.OR = [
          { society_id: Number(societyId) },
          { society_id: null },
        ];
      }

      const rules = await prisma.authorizationRule.findMany({
        where,
        include: {
          levels: {
            orderBy: { level_number: 'asc' },
            select: {
              level_number: true,
              level_type: true,
              superior_level_number: true
            }
          }
        }
      });
      return rules;
    } catch (error) {
      console.error('Error getting auth rules:', error);
      throw error;
    }
  },

  // Create auth rule
  async createAuthRule(ruleData, _societyId = null) {
    try {
      // Step 1: Create the new authorization rule
      const rule = await prisma.authorizationRule.create({
        data: {
          rule_name: ruleData.rule_name,
          is_default: ruleData.is_default,
          num_levels: ruleData.num_levels,
          automatic: ruleData.automatic,
          travel_type: ruleData.travel_type,
          min_duration: ruleData.min_duration,
          max_duration: ruleData.max_duration,
          min_amount: ruleData.min_amount,
          max_amount: ruleData.max_amount,
          society_id: _societyId ? Number(_societyId) : null,
          levels: {
            create: (Array.isArray(ruleData.levels) ? ruleData.levels : []).map(level => ({
              level_number: level.level_number,
              level_type: level.level_type,
              superior_level_number:
                level.superior_level_number === null ||
                level.superior_level_number === undefined ||
                level.superior_level_number === ''
                  ? null
                  : Number(level.superior_level_number)
            }))
          }
        }
      });
      return rule;
    } catch (error) {
      console.error('Error creating auth rule:', error);
      throw error;
    }
  },

  // Update auth rule
  async updateAuthRule(ruleId, ruleData, societyId = null) {
    try {
      const id = Number(ruleId);

      if (societyId) {
        const rule = await prisma.authorizationRule.findUnique({
          where: { rule_id: id },
          select: { society_id: true }
        });

        if (rule && rule.society_id && rule.society_id !== Number(societyId)) {
          throw new Error('Unauthorized: Rule does not belong to your society');
        }

        const requestCountOutsideSociety = await prisma.request.count({
          where: {
            authorization_rule_id: id,
            society_id: {
              not: Number(societyId),
            },
          },
        });

        if (requestCountOutsideSociety > 0) {
          throw new Error('Unauthorized: Rule is used by another society');
        }
      }

      // Step 1: Update the main authorization rule fields
      await prisma.authorizationRule.update({
        where: { rule_id: id },
        data: {
          rule_name: ruleData.rule_name,
          is_default: ruleData.is_default,
          num_levels: ruleData.num_levels,
          automatic: ruleData.automatic,
          travel_type: ruleData.travel_type,
          min_duration: ruleData.min_duration,
          max_duration: ruleData.max_duration,
          min_amount: ruleData.min_amount,
          max_amount: ruleData.max_amount,
        }
      });

      // Step 2: Delete all existing levels for this rule
      await prisma.authorizationRuleLevel.deleteMany({ where: { rule_id: id } });

      // Step 3: Create new levels if provided
      const levels = Array.isArray(ruleData.levels) ? ruleData.levels : [];
      if (levels.length > 0) {
        await prisma.authorizationRuleLevel.createMany({
          data: levels.map(level => ({
            rule_id: id,
            level_number: level.level_number,
            level_type: level.level_type,
            superior_level_number:
              level.superior_level_number === null ||
              level.superior_level_number === undefined ||
              level.superior_level_number === ''
                ? null
                : Number(level.superior_level_number)
          }))
        });
      }
      return true;
    } catch (error) {
      console.error('Error updating auth rule:', error);
      throw error;
    }
  },

  // Delete auth rule
  async deleteAuthRule(ruleId, societyId = null) {
    try {
      const id = Number(ruleId);

      if (societyId) {
        const rule = await prisma.authorizationRule.findUnique({
          where: { rule_id: id },
          select: { society_id: true }
        });

        if (rule && rule.society_id && rule.society_id !== Number(societyId)) {
          throw new Error('Unauthorized: Rule does not belong to your society');
        }

        const requestCountOutsideSociety = await prisma.request.count({
          where: {
            authorization_rule_id: id,
            society_id: {
              not: Number(societyId),
            },
          },
        });

        if (requestCountOutsideSociety > 0) {
          throw new Error('Unauthorized: Rule is used by another society');
        }
      }

      // Step 1: Delete all levels associated with the rule
      await prisma.authorizationRuleLevel.deleteMany({ where: { rule_id: id } });
      // Step 2: Delete the rule itself
      await prisma.authorizationRule.delete({ where: { rule_id: id } });
      console.log(`Auth rule with ID ${ruleId} and its associated levels have been deleted.`);
      return true;
    } catch (error) {
      console.error('Error deleting auth rule:', error);
      throw error;
    }
  },

  // Get boss list for a department.
  // A boss is any active user in the department whose role can approve/reject travel.
  async getBossList(departmentId, societyId = null) {
    try {
      const scopeWhere = {};
      if (societyId) {
        scopeWhere.society_id = Number(societyId);
      }

      const permissionScope = societyId
        ? {
            OR: [
              { society_id: Number(societyId) },
              { society_id: null },
            ],
          }
        : {};

      const bosses = await prisma.user.findMany({
        where: {
          department_id: Number(departmentId),
          active: true,
          ...scopeWhere,
          role: {
            Role_Permission: {
              some: {
                Permission: {
                  ...permissionScope,
                  OR: [
                    { permission_key: 'travel:approve' },
                    { permission_name: { in: ['Aprobar/Rechazar solicitud', 'Aprobar/Rechazar solicitudes'] } },
                  ],
                },
              },
            },
          },
        },
        select: {
          user_id: true,
          user_name: true
        },
        orderBy: { user_name: 'asc' },
      });

      return bosses;
    } catch (error) {
      console.error('Error fetching boss list:', error);
      throw error;
    }
  },

  // Create department
  async createDepartment(departmentData) {
    try {
      await prisma.department.create({
        data: {
          department_name: departmentData.department_name,
          cost_center_id: departmentData.cost_center_id ?? null,
          society_id: departmentData.society_id ?? null
        }
      });
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  },

  // Update department
  async updateDepartment(departmentId, departmentData) {
    try {
      await prisma.department.update({
        where: { department_id: departmentId },
        data: {
          department_name: departmentData.department_name,
          cost_center_id: departmentData.cost_center_id ?? null,
          ...(departmentData.society_id !== undefined && { society_id: departmentData.society_id })
        }
      });
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  },

  // Get department by ID (including cost_center_id)
  async getDepartmentById(departmentId) {
    try {
      const dept = await prisma.department.findUnique({
        where: { department_id: departmentId },
        select: { department_id: true, department_name: true, cost_center_id: true, society_id: true }
      });
      return dept;
    } catch (error) {
      console.error('Error getting department by ID:', error);
      throw error;
    }
  },

  // Find cost center ID by cost center name
  async findCostCenterID(cost_center_name) {
    try {
      const costCenter = await prisma.costCenter.findUnique({
        where: { cost_center_name },
        select: { cost_center_id: true }
      });
      return costCenter ? costCenter.cost_center_id : null;
    } catch (error) {
      console.error('Error finding cost center ID for %s:', cost_center_name, error);
      throw error;
    }
  },

  // Find cost center by code
  async findCostCenterByCode(cost_center_code, society_id = null) {
    try {
      if (!cost_center_code) return null;

      if (society_id) {
        const costCenter = await prisma.costCenter.findFirst({
          where: {
            cost_center_code,
            society_id: Number(society_id)
          },
          select: { cost_center_id: true, cost_center_name: true }
        });
        return costCenter || null;
      }

      const costCenter = await prisma.costCenter.findFirst({
        where: { cost_center_code },
        select: { cost_center_id: true, cost_center_name: true }
      });
      return costCenter || null;
    } catch (error) {
      console.error('Error finding cost center by code %s:', cost_center_code, error);
      throw error;
    }
  },

  // Find cost center by ID
  async findCostCenterByID(cost_center_id, society_id = null) {
    try {
      if (!cost_center_id) return null;

      if (society_id) {
        const costCenter = await prisma.costCenter.findFirst({
          where: {
            cost_center_id,
            society_id: Number(society_id)
          },
          select: { cost_center_id: true, cost_center_name: true }
        });
        return costCenter || null;
      }

      const costCenter = await prisma.costCenter.findUnique({
        where: { cost_center_id },
        select: { cost_center_id: true, cost_center_name: true }
      });
      return costCenter || null;
    } catch (error) {
      console.error('Error finding cost center by ID %s:', cost_center_id, error);
      throw error;
    }
  },

  // Update cost center
  async updateCostCenter(cost_center_id, costCenterData) {
    try {
      await prisma.costCenter.update({
        where: { cost_center_id },
        data: {
          cost_center_name: costCenterData.cost_center_name,
          ...(costCenterData.society_id !== undefined && { society_id: costCenterData.society_id })
        }
      });
    } catch (error) {
      console.error('Error updating cost center:', error);
      throw error;
    }
  },

  // Create cost center
  async createCostCenter(costCenterData) {
    try {
      const data = {
        cost_center_code: costCenterData.cost_center_code,
        cost_center_name: costCenterData.cost_center_name,
        society_id: costCenterData.society_id ?? null
      };
      
      await prisma.costCenter.create({ data });
    } catch (error) {
      console.error('Error creating cost center:', error);
      throw error;
    }
  },

  // Get role by name for a specific society
  async getRoleByName(roleName, societyId) {
    try {
      return await prisma.role.findUnique({
        where: {
          role_name_society_id: {
            role_name: roleName,
            society_id: Number(societyId)
          }
        },
        select: { role_id: true, role_name: true }
      });
    } catch (error) {
      console.error(`Error getting role ${roleName} for society ${societyId}:`, error);
      return null;
    }
  },

  // Deactivate users in departments that are NOT in the provided username list
  async deactivateUsersNotInList(departmentIds, usernameList) {
    try {
      if (!departmentIds || departmentIds.length === 0) {
        return [];
      }

      // Get all active users in specified departments
      const allDeptUsers = await prisma.user.findMany({
        where: {
          department_id: { in: departmentIds },
          active: true
        },
        select: { user_name: true }
      });

      // Deactivate users not in the provided list
      const deactivatedUsers = [];
      for (const deptUser of allDeptUsers) {
        if (!usernameList.includes(deptUser.user_name)) {
          await this.deactivateUserById(deptUser.user_id);
          deactivatedUsers.push(deptUser.user_name);
        }
      }

      return deactivatedUsers;
    } catch (error) {
      console.error('Error deactivating users not in list:', error);
      throw error;
    }
  },
};
  
export default Admin;
