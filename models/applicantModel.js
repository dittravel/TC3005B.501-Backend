/**
 * Applicant Model
 * 
 * This model provides functions for managing applicant travel requests, including
 * creating, editing, and retrieving travel requests, managing receipts and expenses,
 * and handling draft travel requests.
 */

import { prisma } from "../lib/prisma.js";
import User from "./userModel.js";
import AuthorizationRuleService from "../services/authorizationRuleService.js";
import { formatRoutes, getRequestDays, getCountryId, getCityId } from "../services/applicantService.js";
import { uploadReceiptFiles } from "../services/receiptFileService.js";

const toDateValue = (value) => {
  if (!value || value === "0000-01-01") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toTimeValue = (value) => {
  if (!value || value === "00:00:00") return null;
  if (value instanceof Date) return value;
  const date = new Date(`1970-01-01T${value}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
};

const sortRoutesByIndex = (routes) =>
  [...routes].sort((a, b) => (a.router_index ?? 0) - (b.router_index ?? 0));

const formatRouteTrip = (routes, selector) => {
  const values = sortRoutesByIndex(routes)
    .map((route) => selector(route))
    .filter(Boolean);

  return values.join(", ");
};

async function createRoutesForRequest(tx, requestId, allRoutes) {
  for (const route of allRoutes) {
    try {
      const id_origin_country = await getCountryId(tx, route.origin_country_name);
      const id_destination_country = await getCountryId(tx, route.destination_country_name);
      const id_origin_city = await getCityId(tx, route.origin_city_name);
      const id_destination_city = await getCityId(tx, route.destination_city_name);

      const createdRoute = await tx.route.create({
        data: {
          id_origin_country,
          id_origin_city,
          id_destination_country,
          id_destination_city,
          router_index: route.router_index ?? null,
          plane_needed: Boolean(route.plane_needed),
          hotel_needed: Boolean(route.hotel_needed),
          beginning_date: toDateValue(route.beginning_date),
          beginning_time: toTimeValue(route.beginning_time),
          ending_date: toDateValue(route.ending_date),
          ending_time: toTimeValue(route.ending_time),
        },
      });

      await tx.route_Request.create({
        data: {
          request_id: Number(requestId),
          route_id: createdRoute.route_id,
        },
      });
    } catch (error) {
      console.error("Error processing route:", error);
      throw new Error("Database Error: Unable to process route");
    }
  }
}

const Applicant = {
  // Find applicant by ID
  async findById(id) {
    console.log(`Searching for user with id: ${id}`);
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: Number(id) },
      });
      if (user) {
        console.log(`User found: ${user.user_name}`);
      }
      return user;

    } catch (error) {
      console.error("Error finding applicant by ID:", error);
      throw error;
    }
  },
  
  // Find cost center by user ID
  async findCostCenterByUserId(user_id, societyGroupId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: Number(user_id) },
        select: {
          department: {
            select: {
              department_name: true,
              cost_center_id: true,
              society_group_id: true,
              CostCenter: {
                select: {
                  cost_center_name: true,
                },
              },
            },
          },
        },
      });

      if (!user?.department) {
        return null;
      }

      // Validate society_group_id if provided
      if (societyGroupId && user.department.society_group_id !== Number(societyGroupId)) {
        return null;
      }

      return {
        department_name: user.department.department_name,
        cost_center_id: user.department.cost_center_id,
        costs_center: user.department.CostCenter?.cost_center_name ?? null,
      };

    } catch (error) {
      console.error("Error finding cost center by ID:", error);
      throw error;
    }
  },
  
  // Create travel request
  async createTravelRequest(user_id, travelDetails) {
    try {
      // Destructure travel details from request body
      const {
        router_index,
        notes,
        requested_fee = 0,
        imposed_fee = 0,
        origin_country_name,
        origin_city_name,
        destination_country_name,
        destination_city_name,
        beginning_date,
        beginning_time,
        ending_date,
        ending_time,
        plane_needed,
        hotel_needed,
        additionalRoutes = [],
        travel_type,
      } = travelDetails;

      const allRoutes = formatRoutes(
        {
          router_index,
          origin_country_name,
          origin_city_name,
          destination_country_name,
          destination_city_name,
          beginning_date,
          beginning_time,
          ending_date,
          ending_time,
          plane_needed,
          hotel_needed,
        },
        additionalRoutes,
      );

      const request_days = getRequestDays(allRoutes);

      const role = await prisma.user.findUnique({
        where: { user_id: Number(user_id) },
        select: {
          role_id: true,
          boss_id: true,
          department_id: true,
          society_id: true,
          role: {
            select: {
              role_name: true,
            },
          },
        },
      });

      if (!role) {
        throw new Error("User not found");
      }

      const departmentId = role.department_id;

      if (role.role?.role_name !== 'Solicitante' && role.role?.role_name !== 'Autorizador') {
        throw new Error("User role is not allowed to create a travel request");
      }

      let authorizationRuleId = null;
      let applicableRule = null;
      try {
        applicableRule = await AuthorizationRuleService.selectApplicableRule(
          travel_type,
          request_days,
          requested_fee,
        );

        if (applicableRule) {
          authorizationRuleId = applicableRule.rule_id;
          console.log(`Authorization rule selected: ${applicableRule.rule_name} (ID: ${authorizationRuleId})`);
        } else {
          const defaultRule = await AuthorizationRuleService.getDefaultRule();
          if (defaultRule) {
            authorizationRuleId = defaultRule.rule_id;
            applicableRule = defaultRule;
            console.log(`No applicable rule found, assigned default rule: ${defaultRule.rule_name} (ID: ${authorizationRuleId})`);
          } else {
            console.warn("No applicable or default authorization rule found");
          }
        }
      } catch (error) {
        console.error("Error selecting authorization rule:", error);
      }

      let request_status = 2;
      let assignedTo = null;

      if (applicableRule && applicableRule.levels && applicableRule.levels.length > 0) {
        const firstRuleLevel = applicableRule.levels[0];

        try {
          assignedTo = await AuthorizationRuleService.getNextApproverForRuleLevel(
            firstRuleLevel,
            Number(user_id),
            departmentId,
            role.society_id,
          );

          if (!assignedTo) {
            // If no approver found based on rule level, go to next step
            if (plane_needed || hotel_needed) {
              request_status = 4;
              const travelAgent = await User.getRandomUserByRole(2, departmentId);
              assignedTo = travelAgent ? travelAgent.user_id : null;
              console.log('[createTravelRequest] No boss found, assigned to travel agent:', assignedTo);
            } else {
              request_status = 3;
              const accountsPayable = await User.getRandomUserByRole(3, departmentId);
              assignedTo = accountsPayable ? accountsPayable.user_id : null;
              console.log('[createTravelRequest] No boss found, assigned to accounts payable:', assignedTo);
            }
          }
          console.log(`Assigned to user ${assignedTo} based on authorization rule level 1`);
        } catch (error) {
          console.error("Error assigning based on rule level:", error);
          assignedTo = await User.getBossId(user_id);
        }
      } else if (applicableRule && applicableRule.automatic) {
        assignedTo = await User.getBossId(user_id);
        if (assignedTo) {
          console.log(`Assigned to boss (user_id: ${assignedTo}) using automatic rule`);
        } else {
          console.warn("Automatic rule selected but user has no boss, will route directly to Travel Agent/Accounts Payable");
        }
      } else {
        const bossId = await User.getBossId(user_id);

        if (!bossId) {
          if (plane_needed || hotel_needed) {
            request_status = 4;
            const travelAgent = await User.getRandomUserByRole(2, departmentId);
            assignedTo = travelAgent ? travelAgent.user_id : null;
          } else {
            request_status = 3;
            const accountsPayable = await User.getRandomUserByRole(3, departmentId);
            assignedTo = accountsPayable ? accountsPayable.user_id : null;
          }
        } else {
          assignedTo = bossId;
        }
      }

      const requestId = await prisma.$transaction(async (tx) => {
        const createdRequest = await tx.request.create({
          data: {
            user_id: Number(user_id),
            request_status_id: request_status,
            assigned_to: assignedTo,
            authorization_level: 0,
            authorization_rule_id: authorizationRuleId,
            society_id: role.society_id,
            notes,
            requested_fee,
            imposed_fee,
            request_days,
          },
        });

        await createRoutesForRequest(tx, createdRequest.request_id, allRoutes);

        return createdRequest.request_id;
      });

      console.log(`Travel request created with ID: ${requestId}`);
      return {
        requestId: Number(requestId),
        message: "Travel request successfully created",
      };

    } catch (error) {
      console.error("Error creating travel request:", error);
      throw new Error("Database Error: Unable to fill Request table");
    }
  },
  
  // Edit travel request
  async editTravelRequest(requestId, travelChanges) {
    try {
      console.log("Editing travel request with ID:", requestId);
      
      // Destructure travel details from request body
      const {
        router_index,
        notes,
        requested_fee = 0,
        imposed_fee = 0,
        origin_country_name,
        origin_city_name,
        destination_country_name,
        destination_city_name,
        beginning_date,
        beginning_time,
        ending_date,
        ending_time,
        plane_needed,
        hotel_needed,
        additionalRoutes = [],
      } = travelChanges;
      
      // Format the routes into a single array
      const allRoutes = formatRoutes(
        {
          router_index,
          origin_country_name,
          origin_city_name,
          destination_country_name,
          destination_city_name,
          beginning_date,
          beginning_time,
          ending_date,
          ending_time,
          plane_needed,
          hotel_needed,
        },
        additionalRoutes
      );
      
      // Step 1: Update Request table
      const request_days = getRequestDays(allRoutes);
      await prisma.$transaction(async (tx) => {
        const oldData = await tx.request.findUnique({
          where: { request_id: Number(requestId) },
        });
        console.log("Old data:", oldData);

        await tx.request.update({
          where: { request_id: Number(requestId) },
          data: {
            notes,
            requested_fee,
            imposed_fee,
            request_days,
            last_mod_date: new Date(),
          },
        });

        const newData = await tx.request.findUnique({
          where: { request_id: Number(requestId) },
        });
        console.log("New data:", newData);

        const oldRoutesIds = await tx.route_Request.findMany({
          where: { request_id: Number(requestId) },
          select: { route_id: true },
        });

        await tx.route_Request.deleteMany({
          where: { request_id: Number(requestId) },
        });

        const routeIdsToDelete = oldRoutesIds
          .map((row) => row.route_id)
          .filter((id) => id !== null);

        if (routeIdsToDelete.length > 0) {
          await tx.route.deleteMany({
            where: {
              route_id: {
                in: routeIdsToDelete,
              },
            },
          });
        }

        await createRoutesForRequest(tx, requestId, allRoutes);
      });

      console.log(`Travel request ${requestId} updated successfully.`);

      return {
        requestId: Number(requestId),
        message: "Travel request successfully updated",
      };
      
    } catch (error) {
      console.error("Error editing travel request:", error);
      throw new Error("Database Error: Unable to edit travel request");
    }
  },
  
  // Get request status
  async getRequestStatus(requestId) {
    try {
      const request = await prisma.request.findUnique({
        where: { request_id: Number(requestId) },
        select: { request_status_id: true },
      });
      return request?.request_status_id || null;

    } catch (error) {
      console.error("Error getting request status:", error);
      throw error;
    }
  },

  // Get request department
  async getRequestDepartment(request_id) {
    try {
      const request = await prisma.request.findUnique({
        where: { request_id: Number(request_id) },
        select: {
          user_id: true,
        },
      });

      if (!request?.user_id) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { user_id: request.user_id },
        select: { department_id: true },
      });

      return user?.department_id || null;

    } catch (error) {
      console.error("Error getting request department:", error);
      throw error;
    }
  },

  async getRequestSocietyGroupId(request_id) {
    try {
      const request = await prisma.request.findUnique({
        where: { request_id: Number(request_id) },
        select: {
          requester: {
            select: {
              Society: {
                select: {
                  society_group_id: true,
                },
              },
            },
          },
        },
      });

      return request?.requester?.Society?.society_group_id || null;
    } catch (error) {
      console.error("Error getting request society_group_id:", error);
      throw error;
    }
  },
  
  // Cancel travel request
  async cancelTravelRequest(request_id) {
    try {
      await prisma.request.updateMany({
        where: { request_id: Number(request_id) },
        data: { request_status_id: 8, assigned_to: null },
      });
      return true;

    } catch (error) {
      console.error("Error cancelling request:", error);
      throw error;
    }
  },
  
  // Get completed requests for an applicant
  async getCompletedRequests(userId, societyId = null) {
    try {
      const requests = await prisma.request.findMany({
        where: {
          user_id: Number(userId),
          ...(societyId ? { society_id: Number(societyId) } : {}),
        },
        select: {
          request_id: true,
          creation_date: true,
          Request_status: {
            select: { status: true },
          },
          Route_Request: {
            include: {
              Route: {
                include: {
                  originCountry: {
                    select: { country_name: true },
                  },
                  destinationCountry: {
                    select: { country_name: true },
                  },
                  originCity: {
                    select: { city_name: true },
                  },
                  destinationCity: {
                    select: { city_name: true },
                  },
                },
              },
            },
          },
        },
      });

      return requests
        .filter((request) => ['Finalizado', 'Cancelado', 'Rechazado'].includes(request.Request_status?.status ?? ''))
        .map((request) => {
          const routes = request.Route_Request
            .map((row) => row.Route)
            .filter(Boolean);

          return {
            request_id: request.request_id,
            origin_countries: formatRouteTrip(routes, (route) => route.originCountry?.country_name),
            destination_countries: formatRouteTrip(routes, (route) => route.destinationCountry?.country_name),
            beginning_dates: formatRouteTrip(routes, (route) => formatDateOnly(route.beginning_date)),
            ending_dates: formatRouteTrip(routes, (route) => formatDateOnly(route.ending_date)),
            creation_date: request.creation_date,
            status: request.Request_status?.status ?? null,
          };
        });

    } catch (error) {
      console.error("Error getting completed requests:", error);
      throw error;
    }
  },
  
  // Get applicant requests
  async getApplicantRequests(userId, societyId = null) {
    try {
      const requests = await prisma.request.findMany({
        where: {
          user_id: Number(userId),
          request_status_id: {
            notIn: [7, 8, 9],
          },
          ...(societyId && { society_id: Number(societyId) }),
        },
        select: {
          request_id: true,
          creation_date: true,
          assigned_to: true,
          Request_status: {
            select: { status: true },
          },
          assignedUser: {
            select: { user_name: true },
          },
          Route_Request: {
            include: {
              Route: {
                include: {
                  destinationCountry: {
                    select: { country_name: true },
                  },
                },
              },
            },
          },
          AuthorizationRule: {
            select: {
              days_to_validate: true,
            },
          }
        },
      });

      return requests.map((request) => {
        const firstRoute = sortRoutesByIndex(
          request.Route_Request.map((row) => row.Route).filter(Boolean),
        )[0] ?? null;

        return {
          request_id: request.request_id,
          status: request.Request_status?.status ?? null,
          destination_country: firstRoute?.destinationCountry?.country_name ?? null,
          beginning_date: firstRoute?.beginning_date ?? null,
          ending_date: firstRoute?.ending_date ?? null,
          creation_date: request.creation_date,
          assigned_to: request.assigned_to,
          assigned_to_name: request.assignedUser?.user_name ?? null,
          days_to_validate: request.AuthorizationRule?.days_to_validate ?? null,
        };
      });

    } catch (error) {
      console.error("Error in getApplicantRequests:", error);
      throw error;
    }
  },
  
  async getApplicantRequest(userId) {
    try {
      const request = await prisma.request.findUnique({
        where: { request_id: Number(userId) },
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
                  originCountry: {
                    select: { country_name: true },
                  },
                  originCity: {
                    select: { city_name: true },
                  },
                  destinationCountry: {
                    select: { country_name: true },
                  },
                  destinationCity: {
                    select: { city_name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!request) {
        return [];
      }

      const base = {
        request_id: request.request_id,
        request_status: request.Request_status?.status ?? null,
        notes: request.notes,
        requested_fee: request.requested_fee,
        imposed_fee: request.imposed_fee,
        request_days: request.request_days,
        creation_date: request.creation_date,
        last_mod_date: request.last_mod_date,
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
            route_id: null,
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

    } catch (error) {
      console.error("Error in getApplicantRequest:", error);
      throw error;
    }
  },

  /**
   * Get days remaining to validate receipts for a request
   * @param {number} requestId
   * @returns {number|null} days remaining to validate receipts
   */
  async getDaysToValidateReceipts(requestId) {
    try {
      const request = await prisma.request.findUnique({
        where: { request_id: Number(requestId) },
        select: {
          creation_date: true,
          AuthorizationRule: {
            select: {
              days_to_validate: true,
            },
          },
        },
      });

      if (!request) {
        throw new Error("Request not found");
      }

      const daysToValidate = request.AuthorizationRule?.days_to_validate ?? null;
      if (daysToValidate === null) {
        return null;
      }

      const today = new Date();
      const elapsedTime = today - request.creation_date;
      const elapsedDays = Math.floor(elapsedTime / (1000 * 60 * 60 * 24));
      const remainingDays = daysToValidate - elapsedDays;

      return remainingDays;

    } catch (error) {
      console.error("Error getting days to validate receipts:", error);
      throw error;
    }
  },
  
  /**
  * Inserts multiple receipts using receipt_type_id and amount.
  * @param {Array<{receipt_type_id: number, request_id: number, amount: number}>} receipts
  * @returns {number} number of inserted rows
  */
  async createExpenseBatch(receipts) {
    // Get society_id for each request
    const requestIds = [...new Set(receipts.map(r => Number(r.request_id)))];
    const requests = await prisma.request.findMany({
      where: { request_id: { in: requestIds } },
      select: { request_id: true, society_id: true },
    });

    const requestSocietyMap = new Map(requests.map(r => [r.request_id, r.society_id]));

    const created = await prisma.$transaction(
      receipts.map((r) =>
        prisma.receipt.create({
          data: {
            receipt_type_id: Number(r.receipt_type_id),
            request_id: Number(r.request_id),
            route_id: Number(r.route_id),
            amount: Number(r.amount),
            currency: r.currency || "MXN",
            society_id: requestSocietyMap.get(Number(r.request_id)),
          },
        }),
      ),
    );

    return created.length;
  },
  
  // Create draft travel request
  async createDraftTravelRequest(user_id, savedDetails) {
    try {
      // Destructure travel details from request body
      // adding default values
      const {
        router_index = 0,                               // Default value 0
        notes = '',                                     // Default value empty string
        requested_fee = 0,                              // Default value 0
        imposed_fee = 0,                                // Default value 0
        origin_country_name = 'notSelected',            // Default value 'notSelected'
        origin_city_name = 'notSelected',               // Default value 'notSelected'
        destination_country_name = 'notSelected',       // Default value 'notSelected'
        destination_city_name = 'notSelected',          // Default value 'notSelected'
        beginning_date = '0000-01-01',                  // Default value '0000-01-01'
        beginning_time = '00:00:00',                    // Default value '00:00:00'
        ending_date = '0000-01-01',                     // Default value '0000-01-01'
        ending_time = '00:00:00',                       // Default value '00:00:00'
        plane_needed = false,                           // Default value false
        hotel_needed = false,                           // Default value false
        additionalRoutes = [],                          // Default value empty array
      } = savedDetails;
      
      const allRoutes = formatRoutes(
        {
          router_index,
          origin_country_name,
          origin_city_name,
          destination_country_name,
          destination_city_name,
          beginning_date,
          beginning_time,
          ending_date,
          ending_time,
          plane_needed,
          hotel_needed,
        },
        additionalRoutes
      );
      
      // Step 1: Insert into Request table
      const request_days = getRequestDays(allRoutes);

      // Get the boss (checking if they're out of office) and user's society_id
      const bossId = await User.getBossId(user_id);
      const user = await prisma.user.findUnique({
        where: { user_id: Number(user_id) },
        select: { society_id: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const requestId = await prisma.$transaction(async (tx) => {
        const createdRequest = await tx.request.create({
          data: {
            user_id: Number(user_id),
            request_status_id: 1,
            assigned_to: bossId,
            authorization_level: 0,
            society_id: user.society_id,
            notes,
            requested_fee,
            imposed_fee,
            request_days,
          },
        });

        await createRoutesForRequest(tx, createdRequest.request_id, allRoutes);

        return createdRequest.request_id;
      });

      console.log(`Draft travel request created with ID: ${requestId}`);

      return {
        requestId: Number(requestId),
        message: "Draft travel request successfully created",
      };
      
    } catch (error) {
      console.error("Error creating draft travel request:", error);
      throw new Error("Database Error: Unable to fill Request table");
    }
  },
  
  // Confirm draft travel request
  async confirmDraftTravelRequest(userId, requestId) {
    try {
      await prisma.$transaction(async (tx) => {
        const role = await tx.user.findUnique({
          where: { user_id: Number(userId) },
          select: {
            role_id: true,
            role: {
              select: {
                role_name: true,
              },
            },
          },
        });

        let request_status;
        if (role?.role?.role_name === 'Solicitante' || role?.role?.role_name === 'Autorizador') {
          console.log("Role ID:", role.role_id);
          request_status = 2;
        } else {
          throw new Error("User role in not allowed to create a travel request");
        }

        await tx.request.update({
          where: { request_id: Number(requestId) },
          data: {
            request_status_id: request_status,
            last_mod_date: new Date(),
          },
        });
      });

      console.log(`Draft travel request ${requestId} confirmed successfully.`);

      return {
        requestId: Number(requestId),
        message: "Draft travel request successfully confirmed",
      };
      
    } catch (error) {
      console.error("Error confirming draft travel request:", error);
      throw new Error("Database Error: Unable to confirm draft travel request");
    }
  },
  
  // Update request status to validation stage
  async updateRequestStatusToValidationStage(requestId) {
    await prisma.request.updateMany({
      where: { request_id: Number(requestId) },
      data: { request_status_id: 6 },
    });
  },

  // Update request status to a specific status ID
  async updateRequestStatus(requestId, statusId) {
    await prisma.request.updateMany({
      where: { request_id: Number(requestId) },
      data: { request_status_id: Number(statusId) },
    });
  },
  
  // Get a specific receipt by ID
  async getReceipt(receiptId) {
    try {
      const receipt = await prisma.receipt.findUnique({
        where: { receipt_id: Number(receiptId) },
        include: {
          Receipt_Type: {
            select: { receipt_type_name: true },
          },
        },
      });
      
      return receipt ? {
        receipt_id: receipt.receipt_id,
        request_id: receipt.request_id,
        route_id: receipt.route_id,
        validation: receipt.validation,
        amount: receipt.amount,
        currency: receipt.currency,
        submission_date: receipt.submission_date,
        receipt_date: receipt.receipt_date,
        receipt_type_name: receipt.Receipt_Type?.receipt_type_name ?? null,
        pdf_id: receipt.pdf_file_id,
        pdf_name: receipt.pdf_file_name,
        xml_id: receipt.xml_file_id,
        xml_name: receipt.xml_file_name
      } : null;
      
    } catch (error) {
      console.error('Error getting receipt:', error);
      throw error;
    }
  },

  // Update receipt details
  async updateReceipt(receiptId, data) {
    try {
      await prisma.$transaction(async (tx) => {
        const receipt = await tx.receipt.findUnique({
          where: { receipt_id: Number(receiptId) },
          select: { receipt_id: true },
        });

        if (!receipt) {
          throw new Error("Receipt not found");
        }

        const receiptType = await tx.receipt_Type.findUnique({
          where: { receipt_type_name: data.receipt_type_name },
          select: { receipt_type_id: true },
        });

        if (!receiptType) {
          throw new Error("Invalid receipt type");
        }

        const updateData = {
          route_id: Number(data.route_id),
          receipt_type_id: receiptType.receipt_type_id,
          amount: Number(data.amount),
          local_amount: Number(data.local_amount || data.amount),
          currency: data.currency,
          receipt_date: new Date(data.receipt_date),
        };

        if (data.validation) {
          updateData.validation = data.validation;
        }

        await tx.receipt.update({
          where: { receipt_id: Number(receiptId) },
          data: updateData,
        });
      });

      // Return the updated receipt
      return this.getReceipt(receiptId);

    } catch (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }
  },
  
  // Delete a recepit by ID
  async deleteReceipt(receiptId) {
    try {
      await prisma.$transaction(async (tx) => {
        const receipt = await tx.receipt.findUnique({
          where: { receipt_id: Number(receiptId) },
          select: { receipt_id: true },
        });

        if (!receipt) {
          throw new Error("Receipt not found");
        }

        await tx.receipt.delete({
          where: { receipt_id: Number(receiptId) },
        });
      });

      return true;

    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  },

  /**
   * Create an expense with PDF and XML files
   * Validates that files dont already exist
   */
  async createExpenseWithFiles(data) {
    const {
      receipt_type_id,
      request_id,
      route_id,
      amount,
      local_amount,
      currency,
      receipt_date,
      pdfFile,
      xmlFile
    } = data;

    // Get the request to obtain its society_id
    const request = await prisma.request.findUnique({
      where: { request_id: Number(request_id) },
      select: { society_id: true },
    });

    if (!request) {
      throw new Error("Request not found");
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          receipt_type_id: Number(receipt_type_id),
          request_id: Number(request_id),
          route_id: Number(route_id),
          amount: Number(amount),
          local_amount: Number(local_amount || amount),
          currency,
          receipt_date: receipt_date || null,
          society_id: request.society_id,
        },
        select: { receipt_id: true },
      });

      const fileResult = await uploadReceiptFiles(receipt.receipt_id, pdfFile, xmlFile, tx);

      return {
        receipt_id: receipt.receipt_id,
        pdf: fileResult.pdf,
        xml: fileResult.xml,
        cfdiData: fileResult.cfdiData,
      };
    });

    return result;
  }
};

export default Applicant;
