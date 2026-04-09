/**
 * User Model
 * 
 * This model handles database operations related to users,
 * including fetching user data, travel requests, and wallet information.
 */

import { prisma } from '../lib/prisma.js';

const User = {
  // Get all user data by ID
  async getUserData(userId) {
    // Busca el usuario y sus relaciones
    const user = await prisma.user.findUnique({
      where: { user_id: Number(userId) },
      include: {
        department: true,
        role: true,
        boss: true,
        substitute: true,
      },
    });
    if (!user) return null;

    return {
      user_id: user.user_id,
      user_name: user.user_name,
      email: user.email,
      phone_number: user.phone_number,
      workstation: user.workstation,
      department_name: user.department?.department_name ?? null,
      creation_date: user.creation_date,
      role_name: user.role?.role_name ?? null,
      boss_id: user.boss_id,
      out_of_office_start_date: user.out_of_office_start_date,
      out_of_office_end_date: user.out_of_office_end_date,
      substitute_id: user.substitute_id,
      boss_name: user.boss?.user_name ?? null,
      substitute_name: user.substitute?.user_name ?? null,
    };
  },

  // Get travel request details by request ID
  async getTravelRequestById(request_id) {
    try {
      const request = await prisma.request.findUnique({
        where: { request_id: Number(request_id) },
        include: {
          requester: {
            select: {
              user_name: true,
              email: true,
              phone_number: true,
            },
          },
          Request_status: { select: { status: true } },
          Route_Request: {
            include: {
              Route: {
                include: {
                  originCountry: { select: { country_name: true } },
                  originCity: { select: { city_name: true } },
                  destinationCountry: { select: { country_name: true } },
                  destinationCity: { select: { city_name: true } },
                },
              },
            },
          },
        },
      });
      if (!request) return null;

      // Order routes by router_index ascending
      const routes = (request.Route_Request || [])
        .map(rr => rr.Route)
        .filter(r => !!r)
        .sort((a, b) => (a.router_index ?? 0) - (b.router_index ?? 0));

      // Return request details with routes
      return routes.map(ro => ({
        request_id: request.request_id,
        request_status: request.Request_status?.status ?? null,
        notes: request.notes,
        requested_fee: request.requested_fee,
        imposed_fee: request.imposed_fee,
        request_days: request.request_days,
        creation_date: request.creation_date,
        user_name: request.requester?.user_name ?? null,
        user_email: request.requester?.email ?? null,
        user_phone_number: request.requester?.phone_number ?? null,
        router_index: ro.router_index,
        origin_country: ro.originCountry?.country_name ?? null,
        origin_city: ro.originCity?.city_name ?? null,
        destination_country: ro.destinationCountry?.country_name ?? null,
        destination_city: ro.destinationCity?.city_name ?? null,
        beginning_date: ro.beginning_date,
        beginning_time: ro.beginning_time,
        ending_date: ro.ending_date,
        ending_time: ro.ending_time,
        hotel_needed: ro.hotel_needed,
        plane_needed: ro.plane_needed,
      }));
    } catch (error) {
      console.error('Error in getTravelRequestById:', error);
      throw error;
    }
  },

  // Get travel requests by department and status, with optional limit
  async getTravelRequestsByUserStatus(userId, statusId, n) {
    // Fetch requests assigned to a user with a specific status, including related info
    const requests = await prisma.request.findMany({
      where: {
        assigned_to: Number(userId),
        request_status_id: Number(statusId),
      },
      include: {
        requester: { select: { user_id: true, user_name: true } },
        Request_status: { select: { status: true } },
        assignedUser: { select: { user_name: true } },
        Route_Request: {
          include: {
            Route: {
              include: {
                destinationCountry: { select: { country_name: true } },
              },
            },
          },
        },
      },
      orderBy: { creation_date: 'desc' },
      ...(n ? { take: Number(n) } : {}),
    });

    // For each request, pick the first route (if any) for destination info
    return requests.map(r => {
      const firstRoute = (r.Route_Request || [])
        .map(rr => rr.Route)
        .find(route => !!route);
      return {
        request_id: r.request_id,
        user_id: r.requester?.user_id ?? null,
        requester_name: r.requester?.user_name ?? null,
        destination_country: firstRoute?.destinationCountry?.country_name ?? null,
        beginning_date: firstRoute?.beginning_date ?? null,
        ending_date: firstRoute?.ending_date ?? null,
        request_status: r.Request_status?.status ?? null,
        assigned_to_name: r.assignedUser?.user_name ?? null,
      };
    });
  },

  // Get user data by username
  async getUserUsername(username) {
    // Find user by username, including role
    const user = await prisma.user.findUnique({
      where: { user_name: username },
      include: { role: { select: { role_name: true } } },
    });
    if (!user) return null;
    return {
      user_name: user.user_name,
      user_id: user.user_id,
      department_id: user.department_id,
      password: user.password,
      active: user.active,
      role_name: user.role?.role_name ?? null,
    };
  },

  // Get user wallet information by user ID
  async getUserWallet(user_id) {
    const user = await prisma.user.findUnique({
      where: { user_id: Number(user_id) },
      select: { user_id: true, user_name: true, wallet: true },
    });
    return user || null;
  },

  // Get all active users in the same department and with the same role for substitution purposes
  async getUserDepartmentMembers(userId) {
    // Get department and role for the user first
    const user = await prisma.user.findUnique({
      where: { user_id: Number(userId) },
      select: { department_id: true, role_id: true },
    });
    if (!user) return [];
    // Find all active users in the same department and role, excluding the user
    const members = await prisma.user.findMany({
      where: {
        department_id: user.department_id,
        role_id: user.role_id,
        active: true,
        NOT: { user_id: Number(userId) },
      },
      select: { user_id: true, user_name: true },
    });
    return members;
  },

  // Find an active user by decrypted email.
  // Emails are AES-256-CBC encrypted with a random IV so we cannot query by value —
  // we decrypt all active users in the application layer and match there.
  async getUserByEmail(plaintextEmail) {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { user_id: true, user_name: true, email: true },
    });
    const { decrypt } = await import('../middleware/decryption.js');
    return users.find(u => decrypt(u.email) === plaintextEmail) || null;
  },

  // Store a password reset token and its expiry for a user
  async setPasswordResetToken(userId, token, expires) {
    await prisma.user.update({
      where: { user_id: Number(userId) },
      data: {
        password_reset_token: token,
        password_reset_expires: expires,
      },
    });
  },

  // Find a user whose reset token matches and has not expired
  async getUserByResetToken(token) {
    const now = new Date();
    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires: { gt: now },
        active: true,
      },
      select: { user_id: true, user_name: true },
    });
    return user || null;
  },

  // Update a user's hashed password
  async updatePassword(userId, hashedPassword) {
    await prisma.user.update({
      where: { user_id: Number(userId) },
      data: { password: hashedPassword },
    });
  },

  // Clear the reset token after use or expiry
  async clearPasswordResetToken(userId) {
    await prisma.user.update({
      where: { user_id: Number(userId) },
      data: {
        password_reset_token: null,
        password_reset_expires: null,
      },
    });
  },

  // Update out-of-office dates and substitute for a user
  async updateOutOfOffice(userId, fields) {
    if (!fields || Object.keys(fields).length === 0) {
      return { success: false, message: 'No fields to update' };
    }
    // Convert date fields to Date objects if present and not already a Date
    if (fields.out_of_office_start_date && typeof fields.out_of_office_start_date === 'string') {
      fields.out_of_office_start_date = new Date(fields.out_of_office_start_date);
    }
    if (fields.out_of_office_end_date && typeof fields.out_of_office_end_date === 'string') {
      fields.out_of_office_end_date = new Date(fields.out_of_office_end_date);
    }
    await prisma.user.update({
      where: { user_id: Number(userId) },
      data: fields,
    });
    return { success: true, message: 'Out-of-office updated successfully' };
  },

  // Helper function: Check if a user is out of office and return their effective ID (user_id or substitute_id)
  // Returns: user_id, substitute_id, or null if out-of-office with no substitute
  async getEffectiveUserId(user) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if user is out of office today
    if (user.out_of_office_start_date && user.out_of_office_end_date) {
      // Convert dates to ISO string format (handles both Date objects and strings from DB)
      const startDate = user.out_of_office_start_date instanceof Date
        ? user.out_of_office_start_date.toISOString().split('T')[0]
        : String(user.out_of_office_start_date).split('T')[0];
      
      const endDate = user.out_of_office_end_date instanceof Date
        ? user.out_of_office_end_date.toISOString().split('T')[0]
        : String(user.out_of_office_end_date).split('T')[0];

      if (today >= startDate && today <= endDate) {
        // User is out of office today
        if (user.substitute_id) {
          console.log(`User ${user.user_id} is out of office. Using substitute ${user.substitute_id} instead.`);
          return user.substitute_id;
        } else {
          console.warn(`User ${user.user_id} is out of office but has no substitute assigned.`);
          return null;
        }
      }
    }

    // User is not out of office
    return user.user_id;
  },

  // Get the boss of a user, checking if they're out of office
  // If boss is out of office today, returns their substitute_id if available, otherwise null
  // If boss is available, returns their user_id
  async getBossId(userId) {
    // Get the boss of a user, checking if they're out of office
    const user = await prisma.user.findUnique({
      where: { user_id: Number(userId) },
      select: { boss_id: true },
    });
    if (!user || !user.boss_id) {
      return null; // User has no boss
    }
    const boss = await prisma.user.findUnique({
      where: { user_id: user.boss_id },
      select: {
        user_id: true,
        out_of_office_start_date: true,
        out_of_office_end_date: true,
        substitute_id: true,
      },
    });
    if (!boss) {
      return null; // Boss not found
    }
    // Use helper to check out-of-office status and return effective ID
    return await this.getEffectiveUserId(boss);
  },

  // Get a random user with a specific role from the same department
  // If the user is out of office today, returns their substitute with user_id and user_name if available, otherwise null
  async getRandomUserByRole(roleId, departmentId) {
    const users = await prisma.user.findMany({
      where: {
        role_id: Number(roleId),
        department_id: Number(departmentId),
      },
      select: {
        user_id: true,
        user_name: true,
        out_of_office_start_date: true,
        out_of_office_end_date: true,
        substitute_id: true,
      },
    });
    if (!users || users.length === 0) {
      return null;
    }
    // Pick a random user from the list
    const user = users[Math.floor(Math.random() * users.length)];
    // Use helper to get effective user ID (considering out-of-office)
    const effectiveUserId = await this.getEffectiveUserId(user);
    if (!effectiveUserId) {
      return null;
    }
    // If the effective ID is the original user, return their info
    if (effectiveUserId === user.user_id) {
      return {
        user_id: user.user_id,
        user_name: user.user_name,
      };
    } else {
      // Effective ID is the substitute, fetch their details
      const substitute = await prisma.user.findUnique({
        where: { user_id: effectiveUserId },
        select: { user_id: true, user_name: true },
      });
      if (substitute) {
        return {
          user_id: substitute.user_id,
          user_name: substitute.user_name,
        };
      }
      return null;
    }
  },
};

export default User;
