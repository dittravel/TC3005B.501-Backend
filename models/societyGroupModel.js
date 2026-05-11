/**
* Society Group Model
* 
* Database operations for society groups (multitenancy)
*/

import { prisma } from '../lib/prisma.js';

export async function getSocietyGroups() {
  return await prisma.societyGroup.findMany({
    where: { active: true },
    include: {
      Society: {
        where: { active: true }
      }
    }
  });
}

export async function getSocietyGroupById(groupId) {
  return await prisma.societyGroup.findUnique({
    where: { id: groupId },
    include: {
      Society: {
        where: { active: true }
      }
    }
  });
}

export async function createSocietyGroup(data) {
  return await prisma.societyGroup.create({
    data: {
      description: data.description,
    },
    include: { Society: true }
  });
}

export async function updateSocietyGroup(groupId, data) {
  return await prisma.societyGroup.update({
    where: { id: groupId },
    data: {
      description: data.description,
    },
    include: { Society: true }
  });
}

export async function deleteSocietyGroup(groupId) {
  // Deactivate all societies in the group
  await prisma.society.updateMany({
    where: { society_group_id: groupId },
    data: { active: false }
  });

  // Deactivate the group
  return await prisma.societyGroup.update({
    where: { id: groupId },
    data: { active: false }
  });
}

export async function isDefaultSocietyGroup(groupId) {
  if (!groupId) {
    return false;
  }

  const group = await prisma.societyGroup.findUnique({
    where: { id: groupId },
    select: { is_default: true }
  });

  return group?.is_default === true;
}

export default {
  getSocietyGroups,
  getSocietyGroupById,
  createSocietyGroup,
  updateSocietyGroup,
  deleteSocietyGroup,
  isDefaultSocietyGroup
}