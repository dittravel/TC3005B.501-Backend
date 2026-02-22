/**
 * User Controller
 * 
 * This module handles general user operations and business logic
 * for all user roles in the travel request system. It includes functionality
 * for authentication (login/logout), user data retrieval, travel request queries,
 * and wallet management.
 * 
 * Role-based access control is implemented to ensure users can only access
 * data and operations appropriate to their role and department.
 */
import * as userService from '../services/userService.js';
import User from '../models/userModel.js';
import { decrypt } from '../middleware/decryption.js';

/**
 * Get user data by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data
 */
export async function getUserData(req, res) {
  try {
    console.log('Request received for user ID:', req.params.user_id);
    const userId = parseInt(req.params.user_id);

    if (isNaN(userId)) {
      console.log('Invalid user ID format');
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const userData = await userService.getUserById(userId);

    if (!userData) {
      console.log('No user found for ID:', userId);
      return res.status(404).json({ error: 'No information found for the user' });
    }

    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error retrieving user data', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Authenticate user and set secure session cookies
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Authenticate user credentials through service layer
    const result = await userService.authenticateUser(username, password, req);
    
    // Set secure HTTP-only cookies for session management
    res
      .cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 1000 * 60 * 60, // 1 hour expiration
      })
      .cookie("role", result.role, {
        sameSite: "Strict",
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 24,
      })
      .cookie("username", result.username, {
        sameSite: "Strict",
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60,
      })
      .cookie("id", result.user_id.toString(), {
        sameSite: "Strict",
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60,
      })
      .cookie("department_id", result.department_id.toString(), {
        sameSite: "Strict",
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60,
      })
      .json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

// Get travel requests filtered by department and status with optional limit
export const getTravelRequestsByDeptStatus = async (req, res) => {
  // Parse URL parameters for filtering
  const deptId = Number(req.params.dept_id);
  const statusId = Number(req.params.status_id);
  const n = req.params.n ? Number(req.params.n) : null; // Optional limit

  try {
    const travelRequests = await User.getTravelRequestsByDeptStatus(deptId, statusId, n);

    if (!travelRequests || travelRequests.length === 0) {
      return res.status(404).json({ error: "No travel requests found" });
    }

    // Format response data for frontend consumption
    const formatted = travelRequests.map((req) => ({
      request_id: req.request_id,
      user_id: req.user_id,
      destination_country: req.destination_country,
      beginning_date: formatDate(req.beginning_date),
      ending_date: formatDate(req.ending_date),
      request_status: req.request_status,
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("Error in getTravelRequestsByDeptStatus controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get detailed travel request information by ID with routes and user data
export const getTravelRequestById = async (req, res) => {
  const { request_id } = req.params;

  try {
    const requestData = await User.getTravelRequestById(request_id);

    if (!requestData || requestData.length === 0) {
      return res.status(404).json({ error: "Travel request not found" });
    }

    // Extract base data and decrypt sensitive information
    const base = requestData[0];
    const decryptedEmail = decrypt(base.user_email);
    const decryptedPhone = decrypt(base.user_phone_number);

    // Build comprehensive response with request details and all routes
    const response = {
      request_id: base.request_id,
      request_status: base.request_status,
      notes: base.notes,
      requested_fee: base.requested_fee,
      imposed_fee: base.imposed_fee,
      request_days: base.request_days,
      creation_date: formatDate(base.creation_date),
      user: {
        user_name: base.user_name,
        user_email: decryptedEmail,
        user_phone_number: decryptedPhone
      },
      // Map all rows to routes array (one row per route)
      routes: requestData.map((row) => ({
        router_index: row.router_index,
        origin_country: row.origin_country,
        origin_city: row.origin_city,
        destination_country: row.destination_country,
        destination_city: row.destination_city,
        beginning_date: formatDate(row.beginning_date),
        beginning_time: row.beginning_time,
        ending_date: formatDate(row.ending_date),
        ending_time: row.ending_time,
        hotel_needed: row.hotel_needed,
        plane_needed: row.plane_needed
      }))
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error in getTravelRequestById controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's wallet information and balance
export const getUserWallet = async (req, res) => {
  const { user_id } = req.params;

  try {
    const user = await User.getUserWallet(user_id);

    if (!user) {
      return res.status(404).json({ error: `No user with id ${user_id} found`  });
    }

    // Return formatted wallet data
    const formatted = {
      user_id: user.user_id,
      user_name: user.user_name,
      wallet: user.wallet,
    };

    return res.status(200).json(formatted);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to format dates to YYYY-MM-DD
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

// Clear all session cookies and log user out
export const logout = (req, res) => {
  // Cookie options for secure clearing
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  // Clear all authentication-related cookies
  res
    .clearCookie("token", cookieOptions)
    .clearCookie("role", cookieOptions)
    .clearCookie("username", cookieOptions)
    .clearCookie("id", cookieOptions)
    .clearCookie("department_id", cookieOptions)
    .status(200)
    .json({ message: "Sesión cerrada correctamente" });
};
