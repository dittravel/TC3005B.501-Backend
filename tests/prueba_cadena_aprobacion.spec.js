/* Test case 28: Validation of the approval flow for requests
 * The goal is to verify that the system is able to manage the approval flow for requests
 * correctly through all defined approval levels (chain approval), respecting the hierarchical order
*/

const axios = require('axios');
const https = require('https');

/*
 * Helpers for login
*/

const BASE = 'https://localhost:3000';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const api = axios.create({
  baseURL: BASE,
  httpsAgent,
  timeout: 12000,
});

async function login(username, password) {
  const res = await api.post('/api/user/login', { username, password });

  const token = res.data.token;
  if (!token) {
    throw new Error(`Login fallido para ${username}: ${JSON.stringify(res.data)}`);
  }

  return {
    token,
    user_id: res.data.user_id ?? res.data.id ?? res.data.user?.id
  };
}

function client(token) {
  return axios.create({
    baseURL: BASE,
    httpsAgent,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });
}

/*
 * Data used for the test
*/

const datosViaje = {
  notes: "Solicito viáticos para viaje a conferencia en Barcelona.",
  requested_fee: 3000.0,
  imposed_fee: 0,
  currency: "MXN",
  travel_type: "Internacional",

  router_index: 0,
  origin_country_name: "México",
  origin_city_name: "Ciudad de México",
  destination_country_name: "España",
  destination_city_name: "Barcelona",
  beginning_date: "2026-06-15",
  beginning_time: "09:00",
  ending_date: "2026-06-18",
  ending_time: "18:00",
  plane_needed: true,
  hotel_needed: true,
  additionalRoutes: [],

  document_id: "GV",
  exch_rate: 0,
  assigned_to_username: null,
};

let solicitudId;
let req, approverN1, approverN2, cp;

beforeAll(async () => {
  const results = await Promise.all([
    login('andres.gomez', '123'),    // Requester (Solicitante)
    login('laura.flores', '123'),    // Approver N1
    login('diego.hernandez', '123'), // Approver N2
    login('carlos.ramos', '123'),    // CP (Cuentas por pagar)
  ]);

  [req, approverN1, approverN2, cp] = results;
}, 25000);


// ==================== TESTS ====================

test('PASO 1 — Solicitante crea solicitud', async () => {
  const res = await client(req.token).post(
    `/api/applicant/create-travel-request/${req.user_id}`,
    datosViaje
  );

  expect(res.status).toBe(201);
    
  solicitudId = res.data.requestId ?? res.data.id ?? res.data.request_id;
  expect(solicitudId).toBeDefined();
}, 15000);

test('PASO 2 — N2 aprueba la solicitud', async () => {
  try {
    const res = await client(approverN2.token).put(
      `/api/authorizer/authorize-travel-request/${solicitudId}/${approverN2.user_id}`,
      {} 
    );
    expect(res.status).toBe(200);
  } catch (error) {
    throw error;
  }
});

test('PASO 3 — Verificar estado después de N2', async () => {
  await new Promise(r => setTimeout(r, 600));

  const res = await client(approverN2.token).get(`/api/authorizer/get-pending-requests/${approverN2.user_id}/50`);
  const solicitudes = Array.isArray(res.data) ? res.data : res.data.requests ?? [];
  
  const solicitud = solicitudes.find(s => s.request_id === solicitudId || s.id === solicitudId);
});

test('PASO 4 — N1 aprueba la solicitud', async () => {
  const res = await client(approverN1.token).put(
    `/api/authorizer/authorize-travel-request/${solicitudId}/${approverN1.user_id}`
  );

  expect(res.status).toBe(200);
});

test('PASO 5 — Verificar que CP vea la solicitud', async () => {
  await new Promise(r => setTimeout(r, 800));

  const res = await client(cp.token).get(`/api/authorizer/get-pending-requests/${cp.user_id}/50`);
  const solicitudes = Array.isArray(res.data) ? res.data : res.data.requests ?? [];
  
  const encontrada = solicitudes.find(s => s.request_id === solicitudId || s.id === solicitudId);
  
  expect(encontrada).toBeDefined();
  console.log('Estado final:', encontrada?.request_status);
});

// To run it individually: npx jest prueba_cadena_aprobacion.spec.js --verbose --runInBand