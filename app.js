require('dotenv').config();
const express = require('express');
const next = require('next');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const server = express();
server.use(cors());
server.use(express.json());
server.use('/uploads', express.static('uploads'));
server.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected...');
});

// Image Upload Configuration
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

server.get('/api/smartphones', (req, res) => {
  db.query(`
    SELECT products.*
    FROM products
    JOIN categories ON products.catid = categories.catid
    WHERE categories.name = 'smartphone'
  `, (err, result) => {
    if (err) {
      console.error('Error fetching smartphones:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(result);
  });
});

// Express Routes
server.get('/categories', (req, res) => {
    db.query('SELECT * FROM categories', (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

server.post('/categories', (req, res) => {
    const { name } = req.body;
    db.query('INSERT INTO categories (name) VALUES (?)', [name], (err, result) => {
        if (err) throw err;
        res.json({ message: 'Category added!' });
    });
});

server.get('/products', (req, res) => {
    db.query('SELECT * FROM products', (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

server.post('/products', upload.single('image'), (req, res) => {
    const { catid, name, price, description } = req.body;
    const image = req.file ? req.file.filename : null;

    db.query(
        'INSERT INTO products (catid, name, price, description, image) VALUES (?, ?, ?, ?, ?)',
        [catid, name, price, description, image],
        (err, result) => {
            if (err) throw err;
            res.json({ message: 'Product added!' });
        }
    );
});

server.delete('/products/:pid', (req, res) => {
    const { pid } = req.params;

    db.query('SELECT image FROM products WHERE pid = ?', [pid], (err, result) => {
        if (err) {
            console.error('Error finding product:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }

        if (result.length === 0) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        const imagePath = `./uploads/${result[0].image}`;

        db.query('DELETE FROM products WHERE pid = ?', [pid], (err) => {
            if (err) {
                console.error('Error deleting product:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }

            fs.unlink(imagePath, (err) => {
                if (err) console.warn('Image file not found, skipping delete');
            });

            res.json({ message: 'Product deleted!' });
        });
    });
});

// Handle Next.js Pages
app.prepare().then(() => {
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    // Start server on port 3000
    server.listen(3000, () => {
        console.log('🚀 Server running on http://localhost:3000');
    });
});
