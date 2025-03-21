require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


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


app.get('/categories', (req, res) => {
    db.query('SELECT * FROM categories', (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});


app.post('/categories', (req, res) => {
    const { name } = req.body;
    db.query('INSERT INTO categories (name) VALUES (?)', [name], (err, result) => {
        if (err) throw err;
        res.json({ message: 'Category added!' });
    });
});


app.get('/products', (req, res) => {
    db.query('SELECT * FROM products', (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});


app.post('/products', upload.single('image'), (req, res) => {
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

const fs = require('fs'); 

app.delete('/products/:pid', (req, res) => {
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


app.listen(5000, () => {
    console.log('Server running on port 5000');
});