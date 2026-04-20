/**
 * User Model
 *
 * Prisma-based data access for user workflows.
 */

import { randomInt } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { decrypt } from '../middleware/decryption.js';

function toDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split('T')[0];
}

const User = {
  async getUserData(userId) {
    const user = await prisma.user.findUnique({
      where: { user_id: Number(userId) },
      include: {
        department: {
          include: {
            CostCenter: true,
          },
        },
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
      costs_center: user.department?.CostCenter?.cost_center_name ?? null,
      creation_date: user.creation_date,
      role_name: user.role?.role_name ?? null,
      boss_id: user.boss_id,
      out_of_office_start_date: user.out_of_office_start_date,
      out_of_office_end_date: user.out_of_office_end_date,
      substitute_id: user.substitute_id,
      boss_name: user.boss?.user_name ?? null,
      substitute_name: user.substitute?.user_name ?? null,
      society_id: user.society_id,
    };
  },

  async getTravelRequestById(requestId) {
    const request = await prisma.request.findUnique({
      where: { request_id: Number(requestId) },
      include: {
        Request_status: true,
        requester: {
          select: {
            user_name: true,
            email: true,
            phone_number: true,
          },
        },
        Route_Request: {
          include: {
            Route: {
              include: {
                originCountry: true,
                originCity: true,
                destinationCountry: true,
                destinationCity: true,
              },
            },
          },
        },
      },
    });

    if (!request) return [];

    const base = {
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
    };

    const routeRows = request.Route_Request
      .map((row) => row.Route)
      .filter(Boolean)
      .sort((a, b) => (a.router_index ?? 0) - (b.router_index ?? 0));

    if (routeRows.length === 0) {
      return [
        {
          ...base,
          router_index: null,
          origin_country: null,
          origin_city: null,
          destination_country: null,
          destination_city: null,
          beginning_date: null,
          beginning_time: null,
          ending_date: null,
          ending_time: null,
          hotel_needed: null,
          plane_needed: null,
        },
      ];
    }

    return routeRows.map((route) => ({
      ...base,
      route_id: route.route_id,
      router_index: route.router_index,
      origin_country: route.originCountry?.country_name ?? null,
      origin_city: route.originCity?.city_name ?? null,
      destination_country: route.destinationCountry?.country_name ?? null,
      destination_city: route.destinationCity?.city_name ?? null,
      beginning_date: route.beginning_date,
      beginning_time: route.beginning_time,
      ending_date: route.ending_date,
      ending_time: route.ending_time,
      hotel_needed: route.hotel_needed,
      plane_needed: route.plane_needed,
    }));
  },

  async getTravelRequestsByUserStatus(userId, statusId, n) {
    const requests = await prisma.request.findMany({
      where: {
        assigned_to: Number(userId),
        request_status_id: Number(statusId),
      },
      orderBy: {
        creation_date: 'desc',
      },
      take: n ? Number(n) : undefined,
      include: {
        requester: {
          select: {
            user_id: true,
            user_name: true,
          },
        },
        assignedUser: {
          select: {
            user_name: true,
          },
        },
        Request_status: {
          select: {
            status: true,
          },
        },
        Route_Request: {
          include: {
            Route: {
              include: {
                destinationCountry: {
                  select: {
                    country_name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return requests.map((req) => {
      const route = req.Route_Request
        .map((row) => row.Route)
        .filter(Boolean)
        .sort((a, b) => (a.router_index ?? 0) - (b.router_index ?? 0))[0];

      return {
        request_id: req.request_id,
        user_id: req.requester?.user_id ?? null,
        requester_name: req.requester?.user_name ?? null,
        destination_country: route?.destinationCountry?.country_name ?? null,
        beginning_date: route?.beginning_date ?? null,
        ending_date: route?.ending_date ?? null,
        request_status: req.Request_status?.status ?? null,
        assigned_to_name: req.assignedUser?.user_name ?? null,
      };
    });
  },

  async getUserUsername(username, societyGroupId = null) {
    const user = await prisma.user.findUnique({
      where: { user_name: username },
      include: {
        role: {
          select: {
            role_name: true,
          },
        },
        Society: {
          select: {
            society_group_id: true,
          },
        },
      },
    });

    if (!user) return null;

    // Validate that user belongs to the specified society group if provided
    if (societyGroupId !== null && user.Society?.society_group_id !== Number(societyGroupId)) {
      return null;
    }

    return {
      user_name: user.user_name,
      user_id: user.user_id,
      department_id: user.department_id,
      password: user.password,
      active: user.active,
      role_name: user.role?.role_name ?? null,
      society_id: user.society_id,
      society_group_id: user.Society?.society_group_id ?? null,
    };
  },

  async getUserWallet(userId) {
    return prisma.user.findUnique({
      where: { user_id: Number(userId) },
      select: {
        user_id: true,
        user_name: true,
        wallet: true,
      },
    });
  },

  async getUserDepartmentMembers(userId, societyId = null) {
    const user = await prisma.user.findUnique({
      where: { user_id: Number(userId) },
      select: {
        department_id: true,
        role_id: true,
        society_id: true,
      },
    });

    if (!user?.department_id || !user?.role_id) {
      return [];
    }

    // Validate society_id if provided
    if (societyId && user.society_id !== Number(societyId)) {
      return [];
    }

    return prisma.user.findMany({
      where: {
        department_id: user.department_id,
        role_id: user.role_id,
        society_id: user.society_id,
        active: true,
        user_id: { not: Number(userId) },
      },
      select: {
        user_id: true,
        user_name: true,
      },
      orderBy: {
        user_name: 'asc',
      },
    });
  },

  async getUserByEmail(plaintextEmail) {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        user_id: true,
        user_name: true,
        email: true,
      },
    });

    return users.find((u) => decrypt(u.email) === plaintextEmail) || null;
  },

  async setPasswordResetToken(userId, token, expires) {
    await prisma.user.update({
      where: { user_id: Number(userId) },
      data: {
        password_reset_token: token,
        password_reset_expires: expires,
      },
    });
  },

  async getUserByResetToken(token) {
    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires: { gt: new Date() },
        active: true,
      },
      select: {
        user_id: true,
        user_name: true,
      },
    });

    return user || null;
  },

  async updatePassword(userId, hashedPassword) {
    await prisma.user.update({
      where: { user_id: Number(userId) },
      data: {
        password: hashedPassword,
      },
    });
  },

  async clearPasswordResetToken(userId) {
    await prisma.user.update({
      where: { user_id: Number(userId) },
      data: {
        password_reset_token: null,
        password_reset_expires: null,
      },
    });
  },

  async updateOutOfOffice(userId, fields) {
    const allowed = ['out_of_office_start_date', 'out_of_office_end_date', 'substitute_id'];
    const data = {};

    for (const key of allowed) {
      if (Object.hasOwn(fields, key)) {
        data[key] = fields[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return { success: false, message: 'No fields to update' };
    }

    if (typeof data.out_of_office_start_date === 'string') {
      data.out_of_office_start_date = new Date(data.out_of_office_start_date);
    }

    if (typeof data.out_of_office_end_date === 'string') {
      data.out_of_office_end_date = new Date(data.out_of_office_end_date);
    }

    await prisma.user.update({
      where: { user_id: Number(userId) },
      data,
    });

    return { success: true, message: 'Out-of-office updated successfully' };
  },

  async getEffectiveUserId(user) {
    const today = toDateOnly(new Date());

    if (user.out_of_office_start_date && user.out_of_office_end_date) {
      const startDate = toDateOnly(user.out_of_office_start_date);
      const endDate = toDateOnly(user.out_of_office_end_date);

      if (startDate && endDate && today >= startDate && today <= endDate) {
        if (user.substitute_id) {
          console.log(`User ${user.user_id} is out of office. Using substitute ${user.substitute_id} instead.`);
          return user.substitute_id;
        }

        console.warn(`User ${user.user_id} is out of office but has no substitute assigned.`);
        return null;
      }
    }

    return user.user_id;
  },

  async getBossId(userId) {
    const user = await prisma.user.findUnique({
      where: { user_id: Number(userId) },
      select: {
        boss_id: true,
      },
    });

    if (!user?.boss_id) {
      return null;
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
      return null;
    }

    return this.getEffectiveUserId(boss);
  },

  async getRandomUserByRole(roleId, departmentId) {
    const candidates = await prisma.user.findMany({
      where: {
        role_id: Number(roleId),
        department_id: Number(departmentId),
        active: true,
      },
      select: {
        user_id: true,
        user_name: true,
        out_of_office_start_date: true,
        out_of_office_end_date: true,
        substitute_id: true,
      },
    });

    if (candidates.length === 0) {
      return null;
    }

    const user = candidates[randomInt(0, candidates.length)];
    const effectiveUserId = await this.getEffectiveUserId(user);

    if (!effectiveUserId) {
      return null;
    }

    if (effectiveUserId === user.user_id) {
      return {
        user_id: user.user_id,
        user_name: user.user_name,
      };
    }

    const substitute = await prisma.user.findUnique({
      where: { user_id: effectiveUserId },
      select: {
        user_id: true,
        user_name: true,
      },
    });

    return substitute || null;
  },

  async getRandomUserByRoleName(roleName, departmentId, societyGroupId) {
    const candidates = await prisma.user.findMany({
      where: {
        department_id: Number(departmentId),
        active: true,
        role: {
          role_name: roleName,
          society_group_id: Number(societyGroupId),
        },
      },
      select: {
        user_id: true,
        user_name: true,
        out_of_office_start_date: true,
        out_of_office_end_date: true,
        substitute_id: true,
      },
    });

    if (candidates.length === 0) {
      return null;
    }

    const user = candidates[randomInt(0, candidates.length)];
    const effectiveUserId = await this.getEffectiveUserId(user);

    if (!effectiveUserId) {
      return null;
    }

    if (effectiveUserId === user.user_id) {
      return {
        user_id: user.user_id,
        user_name: user.user_name,
      };
    }

    const substitute = await prisma.user.findUnique({
      where: { user_id: effectiveUserId },
      select: {
        user_id: true,
        user_name: true,
      },
    });

    return substitute || null;
  },

  // Update user's wallet (positive amount adds, negative amount subtracts)
  async updateWallet(userId, amount) {
    try {
      const result = await prisma.user.update({
        where: { user_id: userId },
        data: {
          wallet: {
            increment: amount,
          },
        },
      });
      return result;
    } catch (error) {
      console.error("Error updating wallet:", error);
      throw error;
    }
  },
};

export default User;
