import dotenv from 'dotenv';
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prismaClientPkg from "@prisma/client";

dotenv.config({ override: true });

const { PrismaClient } = prismaClientPkg;

const host = process.env.DB_HOST || process.env.DATABASE_HOST;
const port = Number(process.env.DB_PORT || process.env.DATABASE_PORT || 3306);
const user = process.env.DB_USER || process.env.DATABASE_USER;
const password = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD;
const database = process.env.DB_NAME || process.env.DATABASE_NAME;

const adapter = new PrismaMariaDb({
  host,
  port,
  user,
  password,
  database,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

export { prisma };