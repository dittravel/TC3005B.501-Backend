import dotenv from 'dotenv';
import mariadb from 'mariadb';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_ROOT_USER,
    password: process.env.DB_ROOT_PASSWORD,
    database: process.env.DB_NAME,
});

async function hashPasswords() {
    let conn;
    
    try {
        conn = await pool.getConnection();
        
        // Get all users with their plain text passwords
        const users = await conn.query('SELECT user_id, user_name, password FROM User');
        
        console.log(`Found ${users.length} users to update...`);
        
        for (const user of users) {
            // Check if password is already hashed (bcrypt hashes start with $2b$)
            if (user.password.startsWith('$2b$')) {
                console.log(`Password for ${user.user_name} is already hashed, skipping...`);
                continue;
            }
            
            // Hash the plain text password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            
            // Update the user's password
            await conn.query(
                'UPDATE User SET password = ? WHERE user_id = ?',
                [hashedPassword, user.user_id]
            );
            
            console.log(`Updated password for user: ${user.user_name}`);
        }
        
        console.log('All passwords have been hashed successfully!');
        
    } catch (error) {
        console.error('Error hashing passwords:', error);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

hashPasswords();