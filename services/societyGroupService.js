/**
* Society Group Service
*
* Business logic for society groups (multitenancy)
*/

import SocietyGroupModel from '../models/societyGroupModel.js';

export async function getSocietyGroups(currentUser) {
  const groups = await SocietyGroupModel.getSocietyGroups();

  // Filter out default group if user is not admin of default group
  const isDefaultGroupAdmin = await SocietyGroupModel.isDefaultSocietyGroup(currentUser?.society_group_id);
  if (!isDefaultGroupAdmin) {
    return groups.filter(g => !g.is_default);
  }

  return groups;
}

export async function getSocietyGroupById(groupId, currentUser) {
  const group = await SocietyGroupModel.getSocietyGroupById(groupId);

  if (!group) {
    const error = new Error('Society group not found');
    error.status = 404;
    throw error;
  }

  // Prevent non-default admins from viewing the default group
  const isDefaultGroupAdmin = await SocietyGroupModel.isDefaultSocietyGroup(currentUser?.society_group_id);
  if (group.is_default && !isDefaultGroupAdmin) {
    const error = new Error('Society group not found');
    error.status = 404;
    throw error;
  }

  return group;
}

export async function createSocietyGroup(data) {
  return await SocietyGroupModel.createSocietyGroup(data);
}

export async function updateSocietyGroup(groupId, data, currentUser) {
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
}

export default {
  getSocietyGroups,
  getSocietyGroupById,
  createSocietyGroup,
  updateSocietyGroup,
  deleteSocietyGroup
};