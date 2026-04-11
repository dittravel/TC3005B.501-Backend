/**
 * Society Service
 *
 * Business logic for society (individual company) administration.
 */

import SocietyModel from '../models/societyModel.js';

export async function getSocieties(societyGroupId) {
  return await SocietyModel.getSocieties(societyGroupId);
}

export async function getSocietyById(societyId) {
  const society = await SocietyModel.getSocietyById(societyId);

  if (!society) {
    const error = new Error('Society not found');
    error.status = 404;
    throw error;
  }

  return society;
}

export async function createSociety(data) {
  if (!data.description || !data.local_currency || !data.society_group_id) {
    const error = new Error('Missing required fields: description, local_currency, society_group_id');
    error.status = 400;
    throw error;
  }

  return await SocietyModel.createSociety(data);
}

export async function updateSociety(societyId, data) {
  const society = await SocietyModel.getSocietyById(societyId);

  if (!society) {
    const error = new Error('Society not found');
    error.status = 404;
    throw error;
  }

  return await SocietyModel.updateSociety(societyId, data);
}

export async function deleteSociety(societyId) {
  const society = await SocietyModel.getSocietyById(societyId);

  if (!society) {
    const error = new Error('Society not found');
    error.status = 404;
    throw error;
  }

  return await SocietyModel.deleteSociety(societyId);
}

export default {
  getSocieties,
  getSocietyById,
  createSociety,
  updateSociety,
  deleteSociety
};
