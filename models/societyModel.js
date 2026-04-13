/**
 * Society Model
 *
 * Data access layer for societies (individual companies).
 */

import { prisma } from '../lib/prisma.js';

export async function getSocieties(societyGroupId) {
  return await prisma.society.findMany({
    where: societyGroupId ? { society_group_id: societyGroupId } : undefined,
    include: {
      SocietyGroup: true,
    }
  });
}

export async function getSocietyById(societyId) {
  return await prisma.society.findUnique({
    where: { id: societyId },
    include: {
      SocietyGroup: true
    }
  });
}

export async function getSocietyByNameAndGroup(description, societyGroupId) {
  return await prisma.society.findFirst({
    where: {
      description: description,
      society_group_id: societyGroupId
    },
    include: {
      SocietyGroup: true
    }
  });
}

export async function createSociety(data) {
  return await prisma.society.create({
    data: {
      description: data.description,
      local_currency: data.local_currency,
      society_group_id: data.society_group_id
    },
    include: {
      SocietyGroup: true,
    }
  });
}

export async function updateSociety(societyId, data) {
  return await prisma.society.update({
    where: { id: societyId },
    data: {
      description: data.description,
      local_currency: data.local_currency,
      society_group_id: data.society_group_id
    },
    include: {
      SocietyGroup: true,
    }
  });
}

export async function deleteSociety(societyId) {
  return await prisma.society.delete({
    where: { id: societyId }
  });
}

export default {
  getSocieties,
  getSocietyById,
  getSocietyByNameAndGroup,
  createSociety,
  updateSociety,
  deleteSociety
};
