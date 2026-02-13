import dotenv from 'dotenv';
import mariadb from 'mariadb';
import fs from 'fs';

dotenv.config();

const pool = mariadb.createPool({
    multipleStatements: true,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const environment = process.argv[2];

async function devdb() {
    let conn;

    try {
        conn = await pool.getConnection();

        console.log("Executing Scheme.sql...");
        await conn.query(fs.readFileSync("./database/Schema/Scheme.sql", "utf8"));
        console.log("Scheme.sql executed.");

        console.log("Executing Prepopulate.sql...");
        await conn.importFile({file: "./database/Schema/Prepopulate.sql"});
        console.log("Prepopulate.sql executed (incluyendo dummy data).");

        console.log("Executing Triggers.sql...");
        await conn.query(fs.readFileSync("./database/Schema/Triggers.sql", "utf8"));
        console.log("Triggers.sql executed.");

        console.log("Executing Views.sql...");
        await conn.importFile({file: "./database/Schema/Views.sql"});
        console.log("Views.sql executed.");

        const userCount = await conn.query("SELECT COUNT(*) as count FROM User");
        console.log(`\nTotal users in database: ${userCount[0].count}`);

    } catch (error) {
        console.error("\n!!! ERROR !!!");
        console.error(error);
    } finally {
        if (conn) {
            conn.release();
        }
        pool.end()
            .then(() => console.log("\nDatabase connection pool closed."))
            .catch(err => console.error("Error closing pool:", err));
    }
}

devdb();
