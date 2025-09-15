import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Create a database connection pool
const pool = mysql.createConnection({
  host: "localhost.c1ac80sqslkb.ap-southeast-2.rds.amazonaws.com",
  port: 3306,
  user: "root",
  password: "IERG4210",
  database: "ecommerce",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { pid } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Fetch product by pid from the database
    const [rows] = await pool.query('SELECT * FROM products WHERE pid = ?', [pid]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const product = rows[0];
    product.price = Number(product.price);
    res.status(200).json(product);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
