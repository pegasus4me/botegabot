const { Client } = require('pg');
require('dotenv').config();

const config = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password', // Identified working password
    database: 'postgres' // Connect to default DB to create new one
};

async function createDatabase() {
    const client = new Client(config);
    try {
        await client.connect();
        console.log("✅ Connected to 'postgres' database.");

        // Check if DB exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'botegabot'");
        if (res.rows.length === 0) {
            console.log("Creating database 'botegabot'...");
            await client.query('CREATE DATABASE botegabot');
            console.log("✅ Database 'botegabot' created!");
        } else {
            console.log("ℹ️ Database 'botegabot' already exists.");
        }
    } catch (err) {
        console.error("❌ Error creating database:", err.message);
    } finally {
        await client.end();
    }
}

createDatabase();
