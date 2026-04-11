/**
* Society Group Service
* 
* Business logic for society groups (multitenancy)
*/

import SocietyGroupModel from '../models/societyGroupModel.js';

export async function getSocietyGroups() {
  return await SocietyGroupModel.getSocietyGroups();
}

export async function getSocietyGroupById(groupId) {
  const group = await SocietyGroupModel.getSocietyGroupById(groupId);
  
  if (!group) {
    const error = new Error('Society group not found');
    error.status = 404;
    throw error;
  }
  
  return group;
}

export async function createSocietyGroup(data) {
  return await SocietyGroupModel.createSocietyGroup(data);
}

export async function updateSocietyGroup(groupId, data) {
  // Check if group exists before updating
  const existingGroup = await SocietyGroupModel.getSocietyGroupById(groupId);
  
  if (!existingGroup) {
    const error = new Error('Society group not found');
    error.status = 404;
    throw error;
  }
  
  return await SocietyGroupModel.updateSocietyGroup(groupId, data);
}

export async function deleteSocietyGroup(groupId) {
  // Check if group exists before deleting
  const existingGroup = await SocietyGroupModel.getSocietyGroupById(groupId);
  
  if (!existingGroup) {
    const error = new Error('Society group not found');
    error.status = 404;
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