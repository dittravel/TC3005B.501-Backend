/**
 * Society Service
 *
 * Business logic for society (individual company) administration.
 */

import SocietyModel from '../models/societyModel.js';
import SocietyGroupModel from '../models/societyGroupModel.js';

export async function getSocieties(societyGroupId, currentUser) {
  const societies = await SocietyModel.getSocieties(societyGroupId);

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

  return await SocietyModel.createSociety(data);
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
