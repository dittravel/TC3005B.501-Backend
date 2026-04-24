/**
* Admin Model
* 
* Database operations for admin functions
*/

import { prisma } from '../lib/prisma.js';

const toPermissionKey = (permissionName) =>
  String(permissionName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

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

const findOrCreatePermissionId = async (permissionValue, societyGroupId) => {
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
      society_group_id: societyGroupId,
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
      society_group_id: societyGroupId,
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
      } else if (filterBy.society_group_id) {
        // Filter by society_group_id, get users from any society in the group
        where.Society = {
          society_group_id: filterBy.society_group_id
        };
      } else if (filterBy.society_id) {
        where.society_id = filterBy.society_id;
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

      // Format the response to match the expected structure
      return users.map(user => ({
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
  async findRoleID(role_name, society_group_id = null) {
    try {
      const role = await prisma.role.findUnique({
        where: {
          role_name_society_group_id: {
            role_name,
            society_group_id
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
  
  // Find department ID by department name and society_group_id
  async findDepartmentID(department_name, society_group_id = null) {
    try {
      const department = await prisma.department.findUnique({
        where: {
          department_name_society_group_id: {
            department_name,
            society_group_id
          }
        },
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
          society_id: userData.society_id || null
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
    try {
      const emails = await prisma.user.findMany({
        select: { email: true }
      });
      return emails;
    } catch (error) {
      throw error;
    }
  },
    
  // Update user information
  async updateUser(userId, fieldsToUpdate) {
    try {
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
      if (data.role_id) {
        data.role = { connect: { role_id: data.role_id } };
        delete data.role_id;
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
      
      return await prisma.user.update({
        where: { user_id: Number(userId) },
        data,
        select: { user_id: true }
      });
    } catch (error) {
      throw error;
    }
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

  // Get departments
  async getDepartments(societyGroupId = null) {
    try {
      const departments = await prisma.department.findMany({
        where: societyGroupId ? { society_group_id: Number(societyGroupId) } : {},
        select: { department_id: true, department_name: true, society_group_id: true }
      });
      return departments;
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  },

  // Get roles with their permissions
  async getRoles(societyGroupId = null) {
    try {
      const roles = await prisma.role.findMany({
        where: societyGroupId ? { society_group_id: Number(societyGroupId) } : {},
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
      return roles.map(role => ({
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
  async getRoleById(roleId, societyGroupId = null) {
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

    if (societyGroupId && role.society_group_id !== Number(societyGroupId)) {
      throw new Error('Unauthorized: Role does not belong to your society group');
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

  async getDefaultRole(societyGroupId = null) {
    const where = societyGroupId
      ? { society_group_id: Number(societyGroupId), is_default: true }
      : { is_default: true };

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

    const fallbackWhere = societyGroupId
      ? { society_group_id: Number(societyGroupId), role_name: 'Solicitante' }
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

  async setDefaultRole(roleId, societyGroupId = null) {
    const id = Number(roleId);
    const role = await prisma.role.findUnique({
      where: { role_id: id },
      select: {
        role_id: true,
        society_group_id: true,
      },
    });

    if (!role) {
      return false;
    }

    if (societyGroupId && role.society_group_id !== Number(societyGroupId)) {
      throw new Error('Unauthorized: Role does not belong to your society group');
    }

    const targetSocietyGroupId = societyGroupId ? Number(societyGroupId) : role.society_group_id;

    await prisma.$transaction([
      prisma.role.updateMany({
        where: {
          society_group_id: targetSocietyGroupId,
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
  async createRole(roleData, societyGroupId = null) {
    const validSocietyGroupId = await ensureSocietyGroupExists(societyGroupId);

    const role = await prisma.role.create({
      data: {
        role_name: roleData.name,
        description: roleData.description || null,
        society_group_id: validSocietyGroupId,
        active: true,
      },
    });

    const permissionNames = Array.isArray(roleData.permissions) ? roleData.permissions : [];
    if (permissionNames.length > 0) {
      const permissionIds = [];

      for (const name of permissionNames) {
        const permissionId = await findOrCreatePermissionId(name, validSocietyGroupId);
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
  async updateRole(roleId, roleData, societyGroupId = null) {
    const id = Number(roleId);
    const validSocietyGroupId = await ensureSocietyGroupExists(societyGroupId);
    const existingRole = await prisma.role.findUnique({ where: { role_id: id } });
    if (!existingRole) return null;

    if (validSocietyGroupId && existingRole.society_group_id !== validSocietyGroupId) {
      throw new Error('Unauthorized: Role does not belong to your society group');
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
        const permissionId = await findOrCreatePermissionId(name, validSocietyGroupId);
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
  async deleteRole(roleId, societyGroupId = null) {
    const id = Number(roleId);
    const role = await prisma.role.findUnique({ where: { role_id: id } });
    if (!role) return false;

    if (societyGroupId && role.society_group_id !== Number(societyGroupId)) {
      throw new Error('Unauthorized: Role does not belong to your society group');
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
  async getAuthRuleById(ruleId) {
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
      return rule;
    } catch (error) {
      console.error('Error getting auth rule by ID:', error);
      throw error;
    }
  },

  // Get auth rules
  async getAuthRules(societyGroupId = null) {
    try {
      const rules = await prisma.authorizationRule.findMany({
        where: societyGroupId ? { society_group_id: Number(societyGroupId) } : {},
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
  async createAuthRule(ruleData, societyGroupId = null) {
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
          society_group_id: societyGroupId ? Number(societyGroupId) : null,
          levels: {
            create: (Array.isArray(ruleData.levels) ? ruleData.levels : []).map(level => ({
              level_number: level.level_number,
              level_type: level.level_type,
              superior_level_number: Number(level.superior_level_number) ?? null
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
  async updateAuthRule(ruleId, ruleData, societyGroupId = null) {
    try {
      const id = Number(ruleId);

      // Validate society_group_id if provided
      if (societyGroupId) {
        const rule = await prisma.authorizationRule.findUnique({
          where: { rule_id: id },
          select: { society_group_id: true }
        });

        if (rule && rule.society_group_id !== Number(societyGroupId)) {
          throw new Error('Unauthorized: Rule does not belong to your society group');
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
          max_amount: ruleData.max_amount
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
            superior_level_number: Number(level.superior_level_number) ?? null
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
  async deleteAuthRule(ruleId, societyGroupId = null) {
    try {
      const id = Number(ruleId);

      // Validate society_group_id if provided
      if (societyGroupId) {
        const rule = await prisma.authorizationRule.findUnique({
          where: { rule_id: id },
          select: { society_group_id: true }
        });

        if (rule && rule.society_group_id !== Number(societyGroupId)) {
          throw new Error('Unauthorized: Rule does not belong to your society group');
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
  async getBossList(departmentId, societyGroupId = null, societyId = null) {
    try {
      const permissionScope = societyGroupId
        ? { society_group_id: Number(societyGroupId) }
        : {};

      const bosses = await prisma.user.findMany({
        where: {
          department_id: Number(departmentId),
          active: true,
          ...(societyGroupId ? { Society: { society_group_id: Number(societyGroupId) } } : {}),
          ...(societyGroupId ? {} : societyId ? { society_id: Number(societyId) } : {}),
          role: {
            Role_Permission: {
              some: {
                Permission: {
                  ...permissionScope,
                  OR: [
                    { permission_key: { in: ['travel:approve', 'travel:reject'] } },
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

  // Find department ID by department name and society_group_id
  async findDepartmentID(department_name, society_group_id = null) {
    try {
      // If society_group_id is provided, use compound unique key
      if (society_group_id !== null && society_group_id !== undefined) {
        const department = await prisma.department.findUnique({
          where: {
            department_name_society_group_id: {
              department_name,
              society_group_id
            }
          },
          select: { department_id: true }
        });
        return department ? department.department_id : null;
      } else {
        // Find first department with this name
        const department = await prisma.department.findFirst({
          where: { department_name },
          select: { department_id: true }
        });
        return department ? department.department_id : null;
      }
    } catch (error) {
      console.error('Error finding department ID for %s:', department_name, error);
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
          society_group_id: departmentData.society_group_id ?? null
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
          ...(departmentData.society_group_id !== undefined && { society_group_id: departmentData.society_group_id })
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
        select: { department_id: true, department_name: true, cost_center_id: true }
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

  // Find cost center by ID
  async findCostCenterByID(cost_center_id) {
    try {
      if (!cost_center_id) return null;
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
          ...(costCenterData.society_group_id !== undefined && { society_group_id: costCenterData.society_group_id })
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
        cost_center_name: costCenterData.cost_center_name,
        society_group_id: costCenterData.society_group_id ?? null
      };

      // If cost_center_id is provided, use it (manual ID).
      // Otherwise autoincrement will handle it
      if (costCenterData.cost_center_id) {
        data.cost_center_id = costCenterData.cost_center_id;
      }

      await prisma.costCenter.create({ data });
    } catch (error) {
      console.error('Error creating cost center:', error);
      throw error;
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
        select: { user_id: true, user_name: true }
      });

      // Deactivate users not in the provided list
      const deactivatedUsers = [];
      for (const deptUser of allDeptUsers) {
        if (!usernameList.includes(deptUser.user_name)) {
          await this.deactivateUserById(deptUser.user_id);
          deactivatedUsers.push({
            user_id: deptUser.user_id,
            user_name: deptUser.user_name
          });
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
