/**
* Society Group Model
* 
* Database operations for society groups (multitenancy)
*/

import { prisma } from '../lib/prisma.js';

export async function getSocietyGroups() {
  return await prisma.societyGroup.findMany({
    include: { Society: true }
  });
}

export async function getSocietyGroupById(groupId) {
  return await prisma.societyGroup.findUnique({
    where: { id: groupId },
    include: { Society: true }
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
  await prisma.societyGroup.delete({
    where: { id: groupId }
  });
}

export default {
  getSocietyGroups,
  getSocietyGroupById,
  createSocietyGroup,
  updateSocietyGroup,
  deleteSocietyGroup
}