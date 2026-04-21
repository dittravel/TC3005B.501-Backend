import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';

import applicantRoutes from './routes/applicantRoutes.js';
import authorizerRoutes from './routes/authorizerRoutes.js';
import userRoutes from './routes/userRoutes.js';
import travelAgentRoutes from "./routes/travelAgentRoutes.js";
import adminRoutes from './routes/adminRoutes.js';
import accountsPayableRoutes from './routes/accountsPayableRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import systemRoutes from "./routes/systemRoutes.js";
import exchangeRateRoutes from "./routes/exchangeRateRoutes.js";
import reimbursementPolicyRoutes from "./routes/reimbursementPolicyRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import emailActionsRoutes from './routes/emailActionsRoutes.js';
import cfdiRoutes from './routes/cfdiRoutes.js';
import accountabilityRoutes from "./routes/accountabilityRoutes.js";
import societyGroupRoutes from "./routes/societyGroupRoutes.js";
import societyRoutes from "./routes/societyRoutes.js";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:4321']
    : ['https://localhost:4321', 'http://localhost:4321'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());
app.use(cookieParser());

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  cookieName: 'csrfToken',
  cookieOptions: {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
});

app.use('/api', doubleCsrfProtection);

app.use("/api/applicant", applicantRoutes);
app.use("/api/authorizer", authorizerRoutes);
app.use("/api/user", userRoutes);
app.use("/api/travel-agent", travelAgentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/accounts-payable", accountsPayableRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/exchange-rate", exchangeRateRoutes);
app.use("/api/reimbursement-policy", reimbursementPolicyRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/audit-log", auditLogRoutes);
app.use("/api/email-actions", emailActionsRoutes);
app.use("/api/cfdi", cfdiRoutes);
app.use("/api/accounting/export", accountabilityRoutes);
app.use("/api/society-groups", societyGroupRoutes);
app.use("/api/societies", societyRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "Travel management system API" });
});

export default app;
