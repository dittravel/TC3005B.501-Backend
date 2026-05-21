/* Test case 28: Validation of the approval flow for requests
 * Flujo: Solicitante → Diego (N1) → Laura (N2) → Cuentas por Pagar → Solicitante
*/

const axios = require('axios');
const https = require('https');

const BASE = 'https://localhost:3000';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const api = axios.create({ 
  baseURL: BASE, 
  httpsAgent, 
  timeout: 12000 
});

async function login(username, password) {
  const res = await api.post('/api/user/login', { username, password });
  const token = res.data.token;
  if (!token) throw new Error(`Login fallido para ${username}`);
  
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

/* Data */
const datosViaje = {
  notes: "Solicito viáticos para viaje a conferencia en Barcelona.",
  requested_fee: 1800.0,
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
  plane_needed: false,
  hotel_needed: false,
  additionalRoutes: [],
  document_id: "GV",
  exch_rate: 0,
  assigned_to_username: null,
};

let solicitudId;
let solicitante, diego, laura, cuentasPorPagar;

beforeAll(async () => {
  const results = await Promise.all([
    login('andres.gomez', '123'),     // Solicitante
    login('diego.hernandez', '123'),  // Autorizador N1
    login('laura.flores', '123'),     // Autorizador N2
    login('carlos.ramos', '123'),     // Cuentas por Pagar
  ]);
  [solicitante, diego, laura, cuentasPorPagar] = results;
}, 25000);

// ==================== TESTS ====================

test('PASO 1 — Solicitante crea solicitud', async () => {
  const res = await client(solicitante.token).post(
    `/api/applicant/create-travel-request/${solicitante.user_id}`,
    datosViaje
  );
  expect(res.status).toBe(201);
  solicitudId = res.data.requestId ?? res.data.id ?? res.data.request_id;
  expect(solicitudId).toBeDefined();
}, 15000);

test('PASO 2 — Diego (N1) puede ver la solicitud pendiente', async () => {
  await new Promise(r => setTimeout(r, 600));
  const res = await client(diego.token).get(
    `/api/authorizer/get-pending-requests/${diego.user_id}/50`
  );
  const solicitudes = Array.isArray(res.data) ? res.data : res.data.requests ?? [];
  expect(solicitudes.find(s => s.request_id === solicitudId)).toBeDefined();
});

test('PASO 3 — Diego (N1) aprueba la solicitud', async () => {
  const res = await client(diego.token).put(
    `/api/authorizer/authorize-travel-request/${solicitudId}/${diego.user_id}`
  );
  expect(res.status).toBe(200);
});

test('PASO 4 — Laura (N2) puede ver la solicitud pendiente', async () => {
  await new Promise(r => setTimeout(r, 800));
  const res = await client(laura.token).get(
    `/api/authorizer/get-pending-requests/${laura.user_id}/50`
  );
  const solicitudes = Array.isArray(res.data) ? res.data : res.data.requests ?? [];
  expect(solicitudes.find(s => s.request_id === solicitudId)).toBeDefined();
});

test('PASO 5 — Laura (N2) aprueba la solicitud', async () => {
  const res = await client(laura.token).put(
    `/api/authorizer/authorize-travel-request/${solicitudId}/${laura.user_id}`
  );
  expect(res.status).toBe(200);
});

test('PASO 6 — Cuentas por Pagar atiende la solicitud', async () => {
  await new Promise(r => setTimeout(r, 800));
  const res = await client(cuentasPorPagar.token).put(
    `/api/accounts-payable/attend-travel-request/${solicitudId}`,
    { imposed_fee: 1800.0 }
  );
  expect(res.status).toBe(200);
});

test('PASO 7 — Solicitante ve la solicitud lista para subir comprobantes', async () => {
  const res = await client(solicitante.token).get(
    `/api/applicant/get-user-requests/${solicitante.user_id}`
  );
  expect(res.status).toBe(200);
  expect(Array.isArray(res.data) && res.data.length > 0).toBe(true);
  
  solicitudId = res.data[0].request_id;
  expect(solicitudId).toBeDefined();
}, 15000);