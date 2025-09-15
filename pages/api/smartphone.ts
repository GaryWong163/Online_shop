import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Create a database connection pool
const pool = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Fetch smartphones from the database
    const [rows] = await pool.query(`
      SELECT products.*
      FROM products
      JOIN categories ON products.catid = categories.catid
      WHERE categories.name = 'smartphone'
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
