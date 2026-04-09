import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prismaClientPkg from "@prisma/client";

const { PrismaClient } = prismaClientPkg;

const host = process.env.DATABASE_HOST || process.env.DB_HOST;
const user = process.env.DATABASE_USER || process.env.DB_USER;
const password = process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD;
const database = process.env.DATABASE_NAME || process.env.DB_NAME;

const adapter = new PrismaMariaDb({
  host,
  user,
  password,
  database,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

export { prisma };