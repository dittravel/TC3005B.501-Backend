/**
 * Society Service
 *
 * Business logic for society (individual company) administration.
 */

import SocietyModel from '../models/societyModel.js';
import SocietyGroupModel from '../models/societyGroupModel.js';
import { seedReferenceData } from '../prisma/seedShared.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

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

export async function getSocieties(societyGroupId, currentUser) {
  const societies = await SocietyModel.getSocieties(societyGroupId);

  // Superadministrators see all societies
  if (currentUser?.role === 'Superadministrador') {
    return societies;
  }

  // Check if user belongs to default group
  const isDefaultGroupAdmin = await SocietyGroupModel.isDefaultSocietyGroup(currentUser?.society_group_id);

  // If user is not admin of default group, filter results
  if (!isDefaultGroupAdmin) {
    // Non-default admins can only see societies in their own group
    return societies.filter(s => !s.is_default && s.society_group_id === currentUser?.society_group_id);
  }

  // Default group admin sees all societies including default
  return societies;
}

export async function getSocietyById(societyId, currentUser) {
  const society = await SocietyModel.getSocietyById(societyId);

  if (!society) {
    const error = new Error('Society not found');
    error.status = 404;
    throw error;
  }

  return society;
}

export async function createSociety(data, currentUser) {
  if (!data.description || !data.local_currency || !data.society_group_id) {
    const error = new Error('Missing required fields: description, local_currency, society_group_id');
    error.status = 400;
    throw error;
  }

  // Check if user belongs to default group
  const isDefaultGroupAdmin = await SocietyGroupModel.isDefaultSocietyGroup(currentUser?.society_group_id);

  // Prevent non-default admins from creating societies in other groups
  if (!isDefaultGroupAdmin && data.society_group_id !== currentUser?.society_group_id) {
    const error = new Error('Access denied: cannot create societies in other groups');
    error.status = 403;
    throw error;
  }

  // Create society
  const society = await SocietyModel.createSociety(data);

  // Seed roles and permissions for the new society
  await seedReferenceData(prisma, society.id);

  // Create admin if provided
  let admin = null;
  if (data?.admin?.user_name && data?.admin?.password && data?.admin?.email) {
    const adminRole = await prisma.role.findUnique({
      where: {
        role_name_society_id: {
          role_name: 'Administrador',
          society_id: society.id,
        },
      },
      select: { role_id: true },
    });

    const hashedPassword = await bcrypt.hash(data.admin.password, 10);
    const encryptedEmail = encryptValue(data.admin.email);
    const encryptedPhone = data.admin.phone_number
      ? encryptValue(data.admin.phone_number)
      : null;

    admin = await prisma.user.create({
      data: {
        role_id: adminRole?.role_id || null,
        society_id: society.id,
        user_name: data.admin.user_name,
        password: hashedPassword,
        workstation: data.admin.workstation || null,
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
    ...society,
    bootstrap: {
      admin,
    },
  };
}

export async function updateSociety(societyId, data, currentUser) {
  const society = await SocietyModel.getSocietyById(societyId);

  if (!society) {
    const error = new Error('Society not found');
    error.status = 404;
    throw error;
  }

  // Check if user belongs to default group
  const isDefaultGroupAdmin = await SocietyGroupModel.isDefaultSocietyGroup(currentUser?.society_group_id);

  // Prevent non-default admins from updating societies outside their group
  if (!isDefaultGroupAdmin && society.society_group_id !== currentUser?.society_group_id) {
    const error = new Error('Access denied: cannot modify societies in other groups');
    error.status = 403;
    throw error;
  }

  return await SocietyModel.updateSociety(societyId, data);
}

export async function deleteSociety(societyId, currentUser) {
  const society = await SocietyModel.getSocietyById(societyId);

  if (!society) {
    const error = new Error('Society not found');
    error.status = 404;
    throw error;
  }

  // Prevent deletion of default society
  if (society.is_default) {
    const error = new Error('Cannot delete the default society');
    error.status = 403;
    throw error;
  }

  // Check if user belongs to default group
  const isDefaultGroupAdmin = await SocietyGroupModel.isDefaultSocietyGroup(currentUser?.society_group_id);

  // Prevent non-default admins from deleting societies outside their group
  if (!isDefaultGroupAdmin && society.society_group_id !== currentUser?.society_group_id) {
    const error = new Error('Access denied: cannot delete societies in other groups');
    error.status = 403;
    throw error;
  }

  await SocietyModel.deleteSociety(societyId);
  return society;
}

export async function getSocietyName(societyId) {
  const society = await SocietyModel.getSocietyById(societyId);

  if (!society) {
    const error = new Error('Society not found');
    error.status = 404;
    throw error;
  }

  return society.description;
}

export default {
  getSocieties,
  getSocietyById,
  getSocietyName,
  createSociety,
  updateSociety,
  deleteSociety
};
