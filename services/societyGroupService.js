/**
* Society Group Service
*
* Business logic for society groups (multitenancy)
*/

import SocietyGroupModel from '../models/societyGroupModel.js';
import SocietyModel from '../models/societyModel.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { seedReferenceData } from '../prisma/seedShared.js';

const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

function encryptValue(value) {
  if (!AES_SECRET_KEY) {
    throw new Error('AES_SECRET_KEY is required for encryption');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), iv);
  let encrypted = cipher.update(String(value), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('hex') + encrypted;
}

function canManageGroups(currentUser = null) {
  const permissionKeys = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions.map((permission) => String(permission).trim())
    : [];
  return currentUser?.role === 'Superadministrador' || permissionKeys.includes('superadmin:manage_groups');
}

export async function getSocietyGroups(currentUser) {
  if (!canManageGroups(currentUser)) {
    const error = new Error('Access denied: requires superadmin privileges');
    error.status = 403;
    throw error;
  }

  return await SocietyGroupModel.getSocietyGroups();
}

export async function getSocietyGroupById(groupId, currentUser) {
  if (!canManageGroups(currentUser)) {
    const error = new Error('Access denied: requires superadmin privileges');
    error.status = 403;
    throw error;
  }

  const group = await SocietyGroupModel.getSocietyGroupById(groupId);

  if (!group) {
    const error = new Error('Society group not found');
    error.status = 404;
    throw error;
  }

  return group;
}

export async function createSocietyGroup(data, currentUser) {
  if (!canManageGroups(currentUser)) {
    const error = new Error('Access denied: requires superadmin privileges');
    error.status = 403;
    throw error;
  }

  if (!data?.description || !String(data.description).trim()) {
    const error = new Error('description is required');
    error.status = 400;
    throw error;
  }

  const group = await SocietyGroupModel.createSocietyGroup(data);

  // Bootstrap tenant-level roles and permissions for the new group.
  await seedReferenceData(prisma, group.id);

  let society = null;
  if (data?.society?.description && data?.society?.local_currency) {
    society = await SocietyModel.createSociety({
      description: data.society.description,
      local_currency: data.society.local_currency,
      society_group_id: group.id,
    });
  }

  let regularAdmin = null;
  if (data?.regular_admin?.user_name && data?.regular_admin?.password && data?.regular_admin?.email) {
    const adminRole = await prisma.role.findUnique({
      where: {
        role_name_society_group_id: {
          role_name: 'Administrador',
          society_group_id: group.id,
        },
      },
      select: { role_id: true },
    });

    const hashedPassword = await bcrypt.hash(data.regular_admin.password, 10);
    const encryptedEmail = encryptValue(data.regular_admin.email);
    const encryptedPhone = data.regular_admin.phone_number
      ? encryptValue(data.regular_admin.phone_number)
      : null;

    regularAdmin = await prisma.user.create({
      data: {
        role_id: adminRole?.role_id || null,
        department_id: data.regular_admin.department_id || null,
        society_id: society?.id || data.regular_admin.society_id || null,
        user_name: data.regular_admin.user_name,
        password: hashedPassword,
        workstation: data.regular_admin.workstation || null,
        email: encryptedEmail,
        phone_number: encryptedPhone,
        boss_id: null,
        active: true,
      },
      select: {
        user_id: true,
        user_name: true,
        society_id: true,
      },
    });
  }

  return {
    ...group,
    bootstrap: {
      society,
      regular_admin: regularAdmin,
    },
  };
}

export async function updateSocietyGroup(groupId, data, currentUser) {
  if (!canManageGroups(currentUser)) {
    const error = new Error('Access denied: requires superadmin privileges');
    error.status = 403;
    throw error;
  }

  // Check if group exists before updating
  const existingGroup = await SocietyGroupModel.getSocietyGroupById(groupId);

  if (!existingGroup) {
    const error = new Error('Society group not found');
    error.status = 404;
    throw error;
  }

  return await SocietyGroupModel.updateSocietyGroup(groupId, data);
}

export async function deleteSocietyGroup(groupId, currentUser) {
  if (!canManageGroups(currentUser)) {
    const error = new Error('Access denied: requires superadmin privileges');
    error.status = 403;
    throw error;
  }

  // Check if group exists before deleting
  const existingGroup = await SocietyGroupModel.getSocietyGroupById(groupId);

  if (!existingGroup) {
    const error = new Error('Society group not found');
    error.status = 404;
    throw error;
  }

  // Prevent deletion of default group
  if (existingGroup.is_default) {
    const error = new Error('Cannot delete the default society group');
    error.status = 403;
    throw error;
  }

  await SocietyGroupModel.deleteSocietyGroup(groupId);
  return existingGroup;
}

export async function transferSocietyToGroup(sourceGroupId, societyId, targetGroupId, currentUser) {
  if (!canManageGroups(currentUser)) {
    const error = new Error('Access denied: requires superadmin privileges');
    error.status = 403;
    throw error;
  }

  if (!Number.isInteger(targetGroupId) || targetGroupId <= 0) {
    const error = new Error('target_group_id is required');
    error.status = 400;
    throw error;
  }

  const sourceGroup = await SocietyGroupModel.getSocietyGroupById(sourceGroupId);
  if (!sourceGroup) {
    const error = new Error('Source society group not found');
    error.status = 404;
    throw error;
  }

  const targetGroup = await SocietyGroupModel.getSocietyGroupById(targetGroupId);
  if (!targetGroup) {
    const error = new Error('Target society group not found');
    error.status = 404;
    throw error;
  }

  const society = await SocietyModel.getSocietyById(societyId);
  if (!society) {
    const error = new Error('Society not found');
    error.status = 404;
    throw error;
  }

  if (society.is_default) {
    const error = new Error('Cannot transfer the default society');
    error.status = 403;
    throw error;
  }

  if (society.society_group_id !== sourceGroupId) {
    const error = new Error('Society does not belong to the selected source group');
    error.status = 400;
    throw error;
  }

  if (sourceGroupId === targetGroupId) {
    const error = new Error('Target group must be different from source group');
    error.status = 400;
    throw error;
  }

  const updatedSociety = await SocietyModel.updateSociety(societyId, {
    description: society.description,
    local_currency: society.local_currency,
    society_group_id: targetGroupId,
  });

  return {
    message: 'Society transferred successfully',
    society: updatedSociety,
    from_group: {
      id: sourceGroup.id,
      description: sourceGroup.description,
    },
    to_group: {
      id: targetGroup.id,
      description: targetGroup.description,
    },
  };
}

export default {
  getSocietyGroups,
  getSocietyGroupById,
  createSocietyGroup,
  updateSocietyGroup,
  deleteSocietyGroup,
  transferSocietyToGroup
};