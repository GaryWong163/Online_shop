const mysql = require("mysql2");
const AWS = require('aws-sdk');

const pool = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Use promise-based queries
const db = pool.promise();

// AWS RDS client
const rds = new AWS.RDS({ region: process.env.AWS_REGION});

// Health check and restart function
async function checkDatabaseAndRestart() {
  try {
    const [rows] = await db.execute('SELECT 1 AS alive');
    console.log('Database health check: OK', rows);
    return true;
  } catch (err) {
    console.error('Database health check failed:', err);

    // Attempt to restart RDS
    try {
      await rds.rebootDBInstance({
        DBInstanceIdentifier: process.env.DB_INSTANCE_ID, // Set this in .env
        ForceFailover: false // Set to true if Multi-AZ
      }).promise();
      console.log(`RDS reboot initiated for ${process.env.DB_INSTANCE_ID}`);
    } catch (rebootErr) {
      console.error('Failed to reboot RDS:', rebootErr);
    }
    return false;
  }
}

// Run health check every 5 minutes (300,000 ms)
setInterval(() => {
  checkDatabaseAndRestart();
}, 300000);

// Initial check on startup
checkDatabaseAndRestart();


module.exports = db;
