import db from '../../../db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pids } = req.body;
  if (!Array.isArray(pids) || pids.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty pids array' });
  }

  try {
    const [rows] = await db.query(
      'SELECT pid, name, price FROM products WHERE pid IN (?)',
      [pids]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch product data' });
  }
}