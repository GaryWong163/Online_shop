const bcrypt = require('bcrypt');
const mysql = require('mysql2');
require('dotenv').config();

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

const users = [
    { email: 'admin@gmail.com', password: 'Admin1234', is_admin: true },
    { email: 'user@gmail.com', password: 'User1234', is_admin: false }
];

users.forEach(async user => {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);

    db.query(
        'INSERT INTO users (email, password, is_admin) VALUES (?, ?, ?)',
        [user.email, hashedPassword, user.is_admin],
        (err, result) => {
            if (err) throw err;
            console.log(`User ${user.email} added.`);
            if (index === users.length - 1) {
                db.end(err => {
                    if (err) throw err;
                    console.log('MySQL Connection Closed.');
                });
            }
        }
    );
});