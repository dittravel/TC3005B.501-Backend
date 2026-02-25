/**
* This script initializes the database for development and testing purposes.
* It executes a series of SQL scripts to create the schema, prepopulate data, create triggers and views.
* If the environment is set to 'dev', it also executes a dummy data script and populates 
* the Department table with data from a CSV file.
* 
* To run this script:
*  1. Ensure you have `mariadb` installed and running.
*  2. Set up your `.env` file with the correct database connection parameters.
*  3. Run the script using:
*      - `node database/config/dev_db.js dev` for development. THIS WILL INCLUDE DUMMY DATA.
*      - `node database/config/dev_db.js` for testing.
* 
* Note: This script will drop and recreate the database, so use with caution in a production environment.
*/

import dotenv from 'dotenv';  // For environment variable loading.
import mariadb from 'mariadb';  // For connection to `mariadb` DataBase.

import fs from "fs";  // For accesing the FileSystem an reading the `.sql` scripts.

import { parseCSV } from "../../services/adminService.js"

dotenv.config();

// Create a connection pool to the database using .env variables
const pool = mariadb.createPool({
  multipleStatements: true,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const environment = process.argv[2];

/*
Function to initialize the database for development and testing purposes.
@param - none
@return - none. Executes the SQL scripts to create the schema, prepopulate data, create triggers and views
*/
async function devdb() {
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    console.log("Executing Scheme.sql...");
    await conn.query(fs.readFileSync("./database/Schema/Scheme.sql", "utf8"));
    console.log("Scheme.sql executed.");
    
    console.log("Executing Prepopulate.sql...");
    await conn.query({
      sql: fs.readFileSync("./database/Schema/Prepopulate.sql", "utf8")
    });
    console.log("Prepopulate.sql executed.");
    
    console.log("Executing Triggers.sql...");
    await conn.query(fs.readFileSync("./database/Schema/Triggers.sql", "utf8"));
    console.log("Triggers.sql executed.");
    
    console.log("Executing Views.sql...");
    await conn.query({
      sql: fs.readFileSync("./database/Schema/Views.sql", "utf8")
    });
    console.log("Views.sql executed.");
    
    if (environment === 'dev') {
      console.log("Executing Dummy.sql...");
      const dummySqlContent = fs.readFileSync("./database/Schema/Dummy.sql", "utf8");
      const departmentSql = dummySqlContent.match(/(INSERT INTO Department[^;]*;)/i);
      
      const remainingDummySql = dummySqlContent.replace(departmentSql[0], '').trim();
      
      await conn.query(departmentSql[0]);
      const res = await parseCSV("./database/config/dummy_users.csv", true);
      console.log(res);
      await conn.query(remainingDummySql);
      console.log("Dummy.sql executed.");
    }
    
  } catch (error) {
    console.error("\n!!! ERROR !!!");
    console.error(error);
  } finally {
    if (conn) {
      conn.release();
    }
    pool.end()
    .then(() => {
      console.log("Database connection pool closed.");
      process.exit(0);
    })
    .catch(err => {
      console.error("Error closing database connection pool:", err);
      process.exit(1);
    });
  }
}

devdb();
