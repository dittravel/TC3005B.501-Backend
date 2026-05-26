/**
 * E2E – TC-6: Verificación del flujo de restablecimiento de contraseñas
 *
 * Caso de Prueba 6
 * Diseñado por : Luis Emilio Veledíaz Flores
 * Ejecutado por: Isabela Valls
 * Módulo       : Autenticación
 * Prioridad    : Media
 * Tipo         : Integración / E2E
 *
 * Descripción:
 *   Prueba que el flujo de restablecimiento de contraseña se complete correctamente:
 *     Paso 1 – Solicitud de recuperación  (POST /api/user/forgot-password)
 *     Paso 2 – Validación de token        (POST /api/user/reset-password con token válido)
 *     Paso 3 – Actualización de contraseña en base de datos
 *     Paso 4 – Inicio de sesión con la nueva contraseña (POST /api/user/login)
 *
 * Postcondiciones verificadas:
 *   ✓ La nueva contraseña queda almacenada en la base de datos
 *   ✓ El token queda a NULL tras usarse (inválido para cualquier uso posterior)
 *
 * Nota sobre email en E2E:
 *   Los tests no interceptan el correo real. En su lugar, se siembra un token
 *   conocido directamente en la BD (vía Prisma) para poder ejecutar el flujo
 *   completo de forma determinista y sin dependencias externas de SMTP.
 */

import { test, expect } from '@playwright/test';
import { prisma } from '../../../lib/prisma.js';

// ── Constantes de prueba ───────────────────────────────────────────────────────

const USER_NAME  = process.env.TEST_USER_USER  || 'diego.hernandez';
const USER_PASS  = process.env.TEST_USER_PASS  || '123';
const USER_EMAIL = process.env.TEST_USER_EMAIL || 'diego.hernandez@empresa.com';

// Token de 64 caracteres hexadecimales (mismo formato que crypto.randomBytes(32).toString('hex'))
const SEED_TOKEN   = 'cafebabe'.repeat(8); // 64 chars hex
const NEW_PASSWORD = 'NuevaPass1!';        // ≥ 8 chars + símbolo especial

// ── Helpers de BD ─────────────────────────────────────────────────────────────

/** Obtiene el user_id y el hash de contraseña actual del usuario de prueba. */
async function getUserRow() {
  return prisma.user.findFirst({
    where: { user_name: USER_NAME, active: true },
    select: { user_id: true, password: true },
  });
}

/** Siembra un token de restablecimiento conocido con expiración de 1 hora. */
async function seedResetToken(userId) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.user.update({
    where: { user_id: userId },
    data: {
      password_reset_token:   SEED_TOKEN,
      password_reset_expires: expiresAt,
    },
  });
}

/** Limpia el token de restablecimiento sin cambiar la contraseña. */
async function clearResetToken(userId) {
  await prisma.user.update({
    where: { user_id: userId },
    data: {
      password_reset_token:   null,
      password_reset_expires: null,
    },
  });
}

/** Restaura el hash de contraseña original en la BD. */
async function restorePassword(userId, originalHash) {
  await prisma.user.update({
    where: { user_id: userId },
    data: { password: originalHash },
  });
}

// ── Suite principal ────────────────────────────────────────────────────────────

test.describe('TC-6: Flujo de restablecimiento de contraseña', () => {
  let userId;
  let originalPasswordHash;

  test.beforeAll(async () => {
    const row = await getUserRow();
    if (!row) {
      throw new Error(
        `Usuario de prueba "${USER_NAME}" no encontrado en la BD. ` +
        'Ejecuta el seed de la base de datos antes de correr los E2E.',
      );
    }
    userId               = row.user_id;
    originalPasswordHash = row.password;
  });

  test.afterAll(async () => {
    // Siempre restablecer la contraseña original para que los siguientes runs no fallen
    if (userId && originalPasswordHash) {
      await restorePassword(userId, originalPasswordHash);
    }
    await clearResetToken(userId);
    await prisma.$disconnect();
  });

  // ── Paso 1: Solicitud de recuperación ─────────────────────────────────────

  test.describe('Paso 1 – POST /api/user/forgot-password', () => {
    test('regresa 200 con correo registrado (respuesta no revela si existe el usuario)', async ({ request }) => {
      const resp = await request.post('/api/user/forgot-password', {
        data: { email: USER_EMAIL },
      });

      // La endpoint siempre devuelve 200 para evitar user-enumeration
      expect(resp.status()).toBe(200);
      const body = await resp.json();
      expect(body).toHaveProperty('message');
    });

    test('regresa 200 incluso con correo no registrado (anti-enumeración)', async ({ request }) => {
      const resp = await request.post('/api/user/forgot-password', {
        data: { email: 'noexiste.jamas@empresa.com' },
      });
      expect(resp.status()).toBe(200);
    });

    test('regresa 400 cuando el formato de correo es inválido', async ({ request }) => {
      const resp = await request.post('/api/user/forgot-password', {
        data: { email: 'esto-no-es-un-correo' },
      });
      expect(resp.status()).toBe(400);
    });

    test('regresa 400 cuando el campo email está ausente', async ({ request }) => {
      const resp = await request.post('/api/user/forgot-password', {
        data: {},
      });
      expect(resp.status()).toBe(400);
    });
  });

  // ── Paso 2 & 3: Validación de token y actualización de contraseña ──────────

  test.describe('Pasos 2 & 3 – POST /api/user/reset-password (casos de error)', () => {
    test.beforeEach(async () => {
      await seedResetToken(userId);
    });

    test.afterEach(async () => {
      await clearResetToken(userId);
      // Restaurar contraseña original en caso de que algún test la haya cambiado
      await restorePassword(userId, originalPasswordHash);
    });

    test('regresa 400 con token de formato inválido (no es hex de 64 chars)', async ({ request }) => {
      const resp = await request.post('/api/user/reset-password', {
        data: { token: 'token-invalido', new_password: NEW_PASSWORD },
      });
      expect(resp.status()).toBe(400);
    });

    test('regresa 400 cuando la nueva contraseña tiene menos de 8 caracteres', async ({ request }) => {
      const resp = await request.post('/api/user/reset-password', {
        data: { token: SEED_TOKEN, new_password: 'corto' },
      });
      expect(resp.status()).toBe(400);
    });

    test('regresa 400 cuando el token no existe en la BD', async ({ request }) => {
      const tokenDesconocido = 'deadbeef'.repeat(8);
      const resp = await request.post('/api/user/reset-password', {
        data: { token: tokenDesconocido, new_password: NEW_PASSWORD },
      });
      expect(resp.status()).toBe(400);
    });

    test('regresa 400 cuando el token está expirado', async ({ request }) => {
      // Sobreescribir el token con una fecha de expiración en el pasado
      await prisma.user.update({
        where: { user_id: userId },
        data: { password_reset_expires: new Date(Date.now() - 1000) },
      });

      const resp = await request.post('/api/user/reset-password', {
        data: { token: SEED_TOKEN, new_password: NEW_PASSWORD },
      });
      expect(resp.status()).toBe(400);
    });

    test('regresa 400 cuando el cuerpo de la solicitud está vacío', async ({ request }) => {
      const resp = await request.post('/api/user/reset-password', {
        data: {},
      });
      expect(resp.status()).toBe(400);
    });
  });

  // ── Flujo completo (happy path): Pasos 1 → 4 + Postcondiciones ─────────────

  test.describe('Flujo completo — Pasos 1 a 4 + Postcondiciones', () => {
    test(
      'TC-6 completo: solicitud → token → contraseña actualizada → login exitoso → token invalidado',
      async ({ request }) => {
        // ── Paso 1: El usuario solicita recuperación de contraseña ─────────────
        const forgotResp = await request.post('/api/user/forgot-password', {
          data: { email: USER_EMAIL },
        });
        // Entrada: correo electrónico registrado en la app web
        // Resultado esperado: respuesta 200 (el sistema procesa la solicitud)
        expect(forgotResp.status()).toBe(200);

        // Simular la entrega del correo: sembrar un token conocido directamente en la BD
        // (En un entorno real se enviaría por email y el usuario haría clic en el enlace)
        await seedResetToken(userId);

        // ── Paso 2: El usuario usa el token válido recibido por email ──────────
        // ── Paso 3: El usuario escribe su nueva contraseña (≥8 chars + símbolo) ─
        const resetResp = await request.post('/api/user/reset-password', {
          data: {
            token:        SEED_TOKEN,   // Paso 2: token válido
            new_password: NEW_PASSWORD, // Paso 3: nueva contraseña con condiciones
          },
        });
        // Resultado esperado: contraseña actualizada en BD, respuesta 200
        expect(resetResp.status()).toBe(200);
        const resetBody = await resetResp.json();
        expect(resetBody).toHaveProperty('message');

        // ── Postcondición 1: verificar en BD que el token quedó a NULL ─────────
        const rowAfterReset = await prisma.user.findUnique({
          where: { user_id: userId },
          select: {
            password_reset_token:   true,
            password_reset_expires: true,
          },
        });
        expect(rowAfterReset.password_reset_token).toBeNull();
        expect(rowAfterReset.password_reset_expires).toBeNull();

        // ── Paso 4: El usuario inicia sesión con la contraseña actualizada ─────
        const loginResp = await request.post('/api/user/login', {
          data: {
            username: USER_NAME,
            password: NEW_PASSWORD,
          },
        });
        // Resultado esperado: 200 y JWT válido
        expect(loginResp.status()).toBe(200);
        const loginBody = await loginResp.json();
        expect(loginBody).toHaveProperty('token');
        expect(typeof loginBody.token).toBe('string');
        expect(loginBody.token.split('.')).toHaveLength(3); // estructura JWT válida

        // ── Postcondición 2: la contraseña anterior ya no funciona ─────────────
        const oldLoginResp = await request.post('/api/user/login', {
          data: { username: USER_NAME, password: USER_PASS },
        });
        expect(oldLoginResp.status()).toBe(400);

        // ── Postcondición 3: el token no puede reutilizarse ────────────────────
        const reuseResp = await request.post('/api/user/reset-password', {
          data: { token: SEED_TOKEN, new_password: 'OtroPass2@' },
        });
        expect(reuseResp.status()).toBe(400);
      },
    );
  });
});
