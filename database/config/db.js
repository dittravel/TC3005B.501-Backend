<<<<<<< Updated upstream
/*DB connection
To use this functionality, please refer to the example
under this same folder 'db_example.js'*/
=======
/**
  * This script sets up the database connection pool for the application.
  * It does not execute any queries itself, so no schema or data is created here.
  */

>>>>>>> Stashed changes
import dotenv from 'dotenv';
import mariadb from 'mariadb';

dotenv.config();

const pool = mariadb.createPool({
     host: process.env.DB_HOST,
     port: process.env.DB_PORT, 
     user:process.env.DB_USER, 
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME
});

export default pool;