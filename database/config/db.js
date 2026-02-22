/**
  * This script sets up the database connection pool for the application.
  * It does not execute any queries itself, so no schema or data is created here.
  */

import dotenv from 'dotenv';
import mariadb from 'mariadb';

dotenv.config();

// Create a connection pool to the database using .env variables
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, 
  user:process.env.DB_USER, 
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

export default pool;