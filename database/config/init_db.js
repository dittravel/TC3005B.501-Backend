/*
 * This script initializes the database by creating the specified database and user with appropriate privileges.
 * - It connects to the MariaDB server using root credentials, creates the database if it doesn't exist,
 * - creates a user with the specified username and password, and grants SELECT, INSERT, UPDATE privileges on the database to that user.
 * - Finally, it releases the connection and ends the connection pool.
*/

import dotenv from 'dotenv';
import mariadb from 'mariadb';

dotenv.config({ path: '../../.env' });

// Load database credentials from environment variables
const db_user = process.env.DB_USER;
const db_password = process.env.DB_PASSWORD;
const db_name = process.env.DB_NAME;

// Create a connection pool to the database using root credentials
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_ROOT_USER,
  password: process.env.DB_ROOT_PASSWORD,
});

/*
Function to initialize the database by creating the specified database and user with appropriate privileges.
@param - none
@return - none. Executes the SQL queries to create the database, user and grant privileges.
*/
pool.getConnection()
  .then(async (conn) => {
    try {
      await conn.query(`CREATE DATABASE IF NOT EXISTS ${db_name};`);
      await conn.query(`USE ${db_name};`);
      await conn.query(
        `CREATE USER IF NOT EXISTS '${db_user}'@'%' IDENTIFIED BY ?`,
        [db_password]
      );
      await conn.query(
        `GRANT SELECT, INSERT, UPDATE ON ${db_name}.* TO '${db_user}'@'%'`
      );
      console.log('User created with privileges successfully.');
    } catch (err) {
      console.error('Error creating user or granting privileges:', err);
    } finally {
      conn.release();
      pool.end()
      .then(() => console.log("Pool has ended"))
      .catch(err => console.log(err));
    }
  })
  .catch((err) => {
    console.error('Error getting connection:', err);
  });
