require("dotenv").config();
const express = require("express");
const next = require("next");
const mysql = require("mysql2/promise");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const https = require("https");
const http = require("http");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/auth");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const paypal = require("@paypal/checkout-server-sdk");
const { URLSearchParams } = require("url");
const crypto = require("crypto");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 443;
const httpPort = 80;

const server = express();

// Disable X-Powered-By header
server.disable('x-powered-by');

// Middleware to set generic Server header
server.use((req, res, next) => {
  res.setHeader('Server', 'WebServer');
  next();
});

// Static file serving (before directory indexing middleware)
server.use("/uploads", express.static(path.join(__dirname, "Uploads")));
server.use(express.static(path.join(__dirname, "public")));

// Ensure Uploads directory exists
const uploadsDir = path.join(__dirname, "Uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch((err) => {
  console.error("Failed to create Uploads directory:", err.stack);
});

// Middleware to block directory indexing
server.use(async (req, res, next) => {
  // Skip for Next.js routes and API endpoints
  if (req.path.startsWith('/_next') || req.path.startsWith('/api') || req.path === '/') {
    return next();
  }
  const requestedPath = path.join(__dirname, req.path.startsWith('/uploads') ? 'Uploads' : 'public', req.path.replace(/^\/Uploads/, ''));
  try {
    const stats = await fs.stat(requestedPath);
    if (stats.isDirectory()) {
      return res.status(403).send('403 Forbidden: Directory listing is disabled');
    }
    next();
  } catch (err) {
    // File/directory doesn't exist, proceed to next middleware
    next();
  }
});

// Other middleware
server.use(cookieParser());
server.use(express.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(
  cors({
    origin: ["https://s33.ierg4210.ie.cuhk.edu.hk", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// Database middleware with retry
server.use(async (req, res, next) => {
  let retries = 3;
  while (retries > 0) {
    try {
      req.db = await pool.getConnection();
      await req.db.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
      return next();
    } catch (error) {
      console.error(`Database connection attempt ${4 - retries} failed:`, error.stack);
      retries--;
      if (retries === 0) {
        return res.status(500).json({ error: "Database connection failed after retries" });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
});

// Release DB connection
server.use((req, res, next) => {
  const afterResponse = () => {
    res.removeListener("finish", afterResponse);
    res.removeListener("close", afterResponse);
    if (req.db) req.db.release();
  };
  res.on("finish", afterResponse);
  res.on("close", afterResponse);
  next();
});

// AWS RDS client (v2)
const rds = new AWS.RDS({ region: process.env.AWS_REGION });

// Database health check and restart
async function checkDatabaseAndRestart() {
  try {
    const [rows] = await pool.query("SELECT 1 AS alive");
    console.log("Database health check: OK", rows);
    return true;
  } catch (err) {
    console.error("Database health check failed:", err.stack);
    try {
      await rds.rebootDBInstance({
        DBInstanceIdentifier: process.env.DB_INSTANCE_ID,
        ForceFailover: false,
      }).promise();
      console.log(`RDS reboot initiated for ${process.env.DB_INSTANCE_ID}`);
    } catch (rebootErr) {
      console.error("Failed to reboot RDS:", rebootErr);
    }
    return false;
  }
}

// Initial and periodic health check
checkDatabaseAndRestart();
setInterval(checkDatabaseAndRestart, 300000);

// PayPal SDK setup
const paypalEnv =
  process.env.PAYPAL_ENV === "sandbox" ? paypal.core.SandboxEnvironment : paypal.core.LiveEnvironment;
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypalEnv(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
);

// Routes
server.use("/auth", authRoutes);

// Get user endpoint
server.get("/api/get-user", async (req, res) => {
  try {
    console.log("Cookies received in /api/get-user:", req.cookies);
    const token = req.cookies.authToken;
    if (!token) {
      console.warn("No authToken cookie found");
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    console.log("JWT decoded:", decoded);

    const [users] = await req.db.query("SELECT user_id, email, is_admin FROM users WHERE user_id = ?", [
      decoded.userId,
    ]);

    if (users.length === 0) {
      console.warn("User not found for user_id:", decoded.userId);
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ userId: users[0].user_id, email: users[0].email, role: users[0].is_admin ? "admin" : "user" });
  } catch (error) {
    console.error("Get user error:", error.stack);
    res.status(401).json({ error: `Invalid token: ${error.message}` });
  }
});

// Protect Admin Route
server.get("/admin", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      console.warn("No authToken in /admin");
      return res.status(401).json({ redirect: "/login" });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    if (user.role !== "admin") {
      console.warn("Non-admin attempted /admin:", user);
      return res.status(403).json({ redirect: "/login" });
    }

    res.json({ message: "Welcome, Admin!", role: "admin" });
  } catch (err) {
    console.error("Admin route error:", err.stack);
    return res.status(403).json({ redirect: "/login" });
  }
});

// Image Upload Configuration
const storage = multer.diskStorage({
  destination: "./Uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png, gif) are allowed"));
  },
});

// Discounts endpoint
server.get("/api/discounts", async (req, res) => {
  try {
    const [result] = await req.db.query(`
      SELECT pid, type, discount_condition, description
      FROM discounts
    `);
    const discounts = result.map(row => ({
      pid: row.pid,
      type: row.type,
      condition: typeof row.discount_condition === 'string' ? JSON.parse(row.discount_condition) : row.discount_condition,
      description: row.description,
    }));
    console.log("Fetched discounts:", discounts);
    res.json(discounts);
  } catch (err) {
    console.error("Error fetching discounts:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Product validation endpoint
server.post("/api/products/validate", async (req, res) => {
  try {
    const { pids } = req.body;
    if (!pids || !Array.isArray(pids) || pids.length === 0) {
      return res.status(400).json({ error: "Invalid or empty product IDs" });
    }

    const [products] = await req.db.query(
      "SELECT pid, name, price FROM products WHERE pid IN (?)",
      [pids]
    );
    console.log("Validated products:", products);

    res.json(products);
  } catch (err) {
    console.error("Error validating products:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// PayPal order validation endpoint
server.post("/api/validate-order", async (req, res) => {
  try {
    const { cart, user_id } = req.body;
    console.log("Validate-order input:", { cart, user_id });
    if (!cart || !Array.isArray(cart) || cart.some((item) => item.quantity <= 0 || !item.pid)) {
      console.error("Invalid cart or quantities:", cart);
      return res.status(400).json({ error: "Invalid cart or quantities" });
    }

    const pids = cart.map((item) => parseInt(item.pid));
    const [products] = await req.db.query("SELECT pid, price FROM products WHERE pid IN (?)", [pids]);
    console.log("Fetched products:", products);

    const [discounts] = await req.db.query(`
      SELECT pid, type, discount_condition
      FROM discounts
      WHERE pid IN (?)
    `, [pids]);
    const parsedDiscounts = discounts.map(d => ({
      pid: d.pid,
      type: d.type,
      condition: typeof d.discount_condition === 'string' ? JSON.parse(d.discount_condition) : d.discount_condition,
    }));
    console.log("Fetched discounts:", parsedDiscounts);

    let total = 0;
    const salt = crypto.randomBytes(16).toString("hex");
    const digestData = ["USD", process.env.PAYPAL_MERCHANT_EMAIL, salt];

    for (const item of cart) {
      const product = products.find((p) => p.pid === parseInt(item.pid));
      if (!product) {
        console.error(`Product ${item.pid} not found`);
        return res.status(404).json({ error: `Product ${item.pid} not found` });
      }

      const discount = parsedDiscounts.find((d) => d.pid === parseInt(item.pid));
      let itemTotal = 0;

      if (discount && discount.type === "buy_x_get_y_free") {
        const { buy_quantity, free_quantity } = discount.condition;
        const totalItemsPerSet = buy_quantity + free_quantity;
        const sets = Math.floor(item.quantity / totalItemsPerSet);
        const remainingItems = item.quantity % totalItemsPerSet;
        const itemsToPay = sets * buy_quantity + remainingItems;
        itemTotal = itemsToPay * parseFloat(product.price);
      } else if (discount && discount.type === "tiered_pricing") {
        const { tiers } = discount.condition;
        const sortedTiers = tiers.sort((a, b) => b.quantity - a.quantity);
        let remainingQuantity = item.quantity;

        while (remainingQuantity > 0) {
          const tier = sortedTiers.find((t) => t.quantity <= remainingQuantity);
          if (!tier) break;
          const sets = Math.floor(remainingQuantity / tier.quantity);
          itemTotal += sets * parseFloat(tier.total_price);
          remainingQuantity -= sets * tier.quantity;
        }
        itemTotal += remainingQuantity * parseFloat(product.price);
      } else {
        itemTotal = parseFloat(product.price) * item.quantity;
      }

      total += itemTotal;
      digestData.push(item.pid.toString(), item.quantity.toString(), product.price.toString());
    }

    const digest = crypto.createHash("sha256").update(digestData.join("|")).digest("hex");
    console.log("Generated digest:", digest);

    const [orderResult] = await req.db.query(
      "INSERT INTO orders (user_id, total, digest, salt, created_at) VALUES (?, ?, ?, ?, NOW())",
      [user_id || null, total, digest, salt]
    );
    const orderId = orderResult.insertId;
    console.log("Order created:", { orderId, user_id, total });

    for (const item of cart) {
      const product = products.find((p) => p.pid === parseInt(item.pid));
      await req.db.query(
        "INSERT INTO order_items (order_id, pid, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, parseInt(item.pid), item.quantity, parseFloat(product.price)]
      );
    }

    res.json({ orderId, digest });
  } catch (error) {
    console.error("Order validation error:", error.stack);
    res.status(500).json({ error: `Failed to validate order: ${error.message}` });
  }
});

// User Orders endpoint
server.get("/api/user-orders", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    const userId = user.userId;

    try {
      const [orders] = await req.db.query(`
        SELECT 
          o.id,
          o.user_id,
          u.email AS username,
          COALESCE(CAST(o.total AS DECIMAL(10,2)), 0.00) AS total,
          o.created_at,
          t.payment_status,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'pid', oi.pid,
              'name', COALESCE(p.name, 'Unknown'),
              'quantity', oi.quantity,
              'price', COALESCE(CAST(oi.price AS DECIMAL(10,2)), 0.00)
            )
          ) as items
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN transactions t ON o.id = t.order_id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.pid = p.pid
        WHERE o.user_id = ? AND oi.pid IS NOT NULL
        GROUP BY o.id, o.user_id, u.email, o.total, o.created_at, t.payment_status
        ORDER BY o.created_at DESC
        LIMIT 5
      `, [userId]);

      res.json(
        orders.map((order) => ({
          ...order,
          total: parseFloat(order.total) || 0,
          items:
            typeof order.items === "string"
              ? JSON.parse(order.items).map((item) => ({
                  ...item,
                  price: parseFloat(item.price) || 0,
                }))
              : (order.items || []).map((item) => ({
                  ...item,
                  price: parseFloat(item.price) || 0,
                })),
        }))
      );
    } catch (jsonErr) {
      console.error("JSON query failed, falling back to simpler query:", jsonErr.stack);
      const [orders] = await req.db.query(`
        SELECT 
          o.id,
          o.user_id,
          u.email AS username,
          COALESCE(CAST(o.total AS DECIMAL(10,2)), 0.00) AS total,
          o.created_at,
          t.payment_status,
          oi.pid,
          COALESCE(p.name, 'Unknown') AS name,
          oi.quantity,
          COALESCE(CAST(oi.price AS DECIMAL(10,2)), 0.00) AS price
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN transactions t ON o.id = t.order_id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.pid = p.pid
        WHERE o.user_id = ? AND oi.pid IS NOT NULL
        ORDER BY o.created_at DESC
        LIMIT 5
      `, [userId]);

      const orderMap = new Map();
      orders.forEach((row) => {
        if (!orderMap.has(row.id)) {
          orderMap.set(row.id, {
            id: row.id,
            user_id: row.user_id,
            username: row.email,
            total: parseFloat(row.total) || 0,
            created_at: row.created_at,
            payment_status: row.payment_status,
            items: [],
          });
        }
        if (row.pid) {
          orderMap.get(row.id).items.push({
            pid: row.pid,
            name: row.name,
            quantity: row.quantity,
            price: parseFloat(row.price) || 0,
          });
        }
      });

      res.json(Array.from(orderMap.values()));
    }
  } catch (err) {
    console.error("Error fetching user orders:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Orders endpoint
server.get("/api/orders", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    try {
      const [orders] = await req.db.query(`
        SELECT 
          o.id,
          o.user_id,
          u.email AS username,
          COALESCE(CAST(o.total AS DECIMAL(10,2)), 0.00) AS total,
          o.created_at,
          t.payment_status,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'pid', oi.pid,
              'name', COALESCE(p.name, 'Unknown'),
              'quantity', oi.quantity,
              'price', COALESCE(CAST(oi.price AS DECIMAL(10,2)), 0.00)
            )
          ) as items
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN transactions t ON o.id = t.order_id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.pid = p.pid
        WHERE oi.pid IS NOT NULL
        GROUP BY o.id, o.user_id, u.email, o.total, o.created_at, t.payment_status
      `);

      res.json(
        orders.map((order) => ({
          ...order,
          total: parseFloat(order.total) || 0,
          items:
            typeof order.items === "string"
              ? JSON.parse(order.items).map((item) => ({
                  ...item,
                  price: parseFloat(item.price) || 0,
                }))
              : (order.items || []).map((item) => ({
                  ...item,
                  price: parseFloat(item.price) || 0,
                })),
        }))
      );
    } catch (jsonErr) {
      console.error("JSON query failed, falling back to simpler query:", jsonErr.stack);
      const [orders] = await req.db.query(`
        SELECT 
          o.id,
          o.user_id,
          u.email AS username,
          COALESCE(CAST(o.total AS DECIMAL(10,2)), 0.00) AS total,
          o.created_at,
          t.payment_status,
          oi.pid,
          COALESCE(p.name, 'Unknown') AS name,
          oi.quantity,
          COALESCE(CAST(oi.price AS DECIMAL(10,2)), 0.00) AS price
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN transactions t ON o.id = t.order_id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.pid = p.pid
        WHERE oi.pid IS NOT NULL
      `);

      const orderMap = new Map();
      orders.forEach((row) => {
        if (!orderMap.has(row.id)) {
          orderMap.set(row.id, {
            id: row.id,
            user_id: row.user_id,
            username: row.email,
            total: parseFloat(row.total) || 0,
            created_at: row.created_at,
            payment_status: row.payment_status,
            items: [],
          });
        }
        if (row.pid) {
          orderMap.get(row.id).items.push({
            pid: row.pid,
            name: row.name,
            quantity: row.quantity,
            price: parseFloat(row.price) || 0,
          });
        }
      });

      res.json(Array.from(orderMap.values()));
    }
  } catch (err) {
    console.error("Error fetching orders:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// Product routes
server.get("/api/smartphones", async (req, res) => {
  try {
    const [result] = await req.db.query(`
      SELECT products.pid, products.name, products.price, products.description, products.image
      FROM products
      JOIN categories ON products.catid = categories.catid
      WHERE categories.name = 'smartphone'
    `);
    res.json(result);
  } catch (err) {
    console.error("Error fetching smartphones:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

server.get("/api/laptop", async (req, res) => {
  try {
    const [result] = await req.db.query(`
      SELECT products.pid, products.name, products.price, products.description, products.image
      FROM products
      JOIN categories ON products.catid = categories.catid
      WHERE categories.name = 'laptop'
    `);
    res.json(result);
  } catch (err) {
    console.error("Error fetching laptops:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

server.get("/api/:pid", async (req, res) => {
  const { pid } = req.params;
  try {
    const [result] = await req.db.query(
      "SELECT pid, name, price, description, image, catid FROM products WHERE pid = ?",
      [pid]
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(result[0]);
  } catch (err) {
    console.error("Error fetching product:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

server.get("/categories", async (req, res) => {
  try {
    const [result] = await req.db.query("SELECT * FROM categories");
    res.json(result);
  } catch (err) {
    console.error("Error fetching categories:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

server.post("/categories", async (req, res) => {
  const { name } = req.body;
  try {
    await req.db.query("INSERT INTO categories (name) VALUES (?)", [name]);
    res.json({ message: "Category added!" });
  } catch (err) {
    console.error("Error adding category:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

server.get("/products", async (req, res) => {
  try {
    const [result] = await req.db.query("SELECT pid, name, price, description, image FROM products");
    res.json(result);
  } catch (err) {
    console.error("Error fetching products:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

server.post("/products", upload.single("image"), async (req, res) => {
  const { catid, name, price, description } = req.body;
  const image = req.file ? req.file.filename : null;
  try {
    if (!req.file && !image) {
      console.warn("No image uploaded for product:", name);
    } else {
      console.log("Image uploaded:", image, "Path:", req.file?.path);
    }
    await req.db.query(
      "INSERT INTO products (catid, name, price, description, image) VALUES (?, ?, ?, ?, ?)",
      [catid, name, parseFloat(price), description, image]
    );
    res.json({ message: "Product added!" });
  } catch (err) {
    console.error("Error adding product:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

server.delete("/products/:pid", async (req, res) => {
  const { pid } = req.params;
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const user = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const [product] = await req.db.query("SELECT image FROM products WHERE pid = ?", [pid]);
    if (product.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    await req.db.query("DELETE FROM order_items WHERE pid = ?", [pid]);
    await req.db.query("DELETE FROM products WHERE pid = ?", [pid]);

    if (product[0].image) {
      const imagePath = path.join(__dirname, "Uploads", product[0].image);
      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
        console.log(`Deleted image: ${imagePath}`);
      } catch (err) {
        console.warn(`Failed to delete image ${imagePath}: ${err.message}`);
      }
    }

    res.json({ message: "Product deleted!" });
  } catch (err) {
    console.error("Error deleting product:", err.stack);
    res.status(500).json({ error: `Failed to delete product: ${err.message}` });
  }
});

server.delete("/categories/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.query("DELETE FROM categories WHERE catid = ?", [id]);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Error deleting category:", err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// PayPal Webhook endpoint
server.post("/api/paypal-webhook", express.json(), async (req, res) => {
  try {
    console.log("Webhook received:", { body: req.body, headers: req.headers, ip: req.ip });
    // TODO: Implement PayPal webhook verification
    console.warn("Webhook verification skipped");

    const eventType = req.body.event_type;
    if (eventType === "CHECKOUT.ORDER.COMPLETED" || eventType === "PAYMENT.SALE.COMPLETED") {
      const orderId = req.body.resource.custom_id || req.body.resource.invoice_id;
      const txnId = req.body.resource.id || req.body.resource.sale_id;
      const paymentStatus =
        (req.body.resource.status || "Completed").toLowerCase() === "completed"
          ? "Completed"
          : req.body.resource.status;
      const amount = parseFloat(req.body.resource.amount?.total || req.body.resource.gross_amount?.value || 0);
      const currency = req.body.resource.amount?.currency_code || req.body.resource.gross_amount?.currency_code || "USD";

      const [existing] = await req.db.query("SELECT id FROM transactions WHERE txn_id = ?", [txnId]);
      if (existing.length > 0) {
        console.log("Transaction already processed:", { txn_id: txnId });
        return res.status(200).send("Already processed");
      }

      const [order] = await req.db.query("SELECT * FROM orders WHERE id = ?", [orderId]);
      if (!order[0]) {
        console.error("Order not found:", { orderId });
        return res.status(400).send("Order not found");
      }

      const [orderItems] = await req.db.query("SELECT pid, quantity, price FROM order_items WHERE order_id = ?", [
        orderId,
      ]);
      const digestData = [currency, process.env.PAYPAL_MERCHANT_EMAIL, order[0].salt];
      orderItems.forEach((item) => {
        digestData.push(item.pid.toString(), item.quantity.toString(), item.price.toString());
      });
      const regeneratedDigest = crypto.createHash("sha256").update(digestData.join("|")).digest("hex");
      if (regeneratedDigest !== order[0].digest) {
        console.error("Digest mismatch:", { regeneratedDigest, expected: order[0].digest });
        return res.status(400).send("Digest mismatch");
      }

      await req.db.query(
        "INSERT INTO transactions (order_id, txn_id, payment_status, amount, created_at) VALUES (?, ?, ?, ?, NOW())",
        [orderId, txnId, paymentStatus, amount]
      );
      console.log("Transaction recorded:", { order_id: orderId, txn_id: txnId, payment_status: paymentStatus, amount });
    } else {
      console.log("Ignored webhook event:", { eventType });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook processing error:", error.stack);
    res.status(500).send("Server error");
  }
});

// PayPal IPN endpoint
server.post("/api/paypal-ipn", bodyParser.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log("IPN received:", { body: req.body, headers: req.headers });
    const verificationUrl =
      process.env.PAYPAL_ENV === "sandbox"
        ? "https://ipnpb.sandbox.paypal.com/cgi-bin/webscr"
        : "https://ipnpb.paypal.com/cgi-bin/webscr";
    const params = new URLSearchParams({ cmd: "_notify-validate", ...req.body });
    const response = await fetch(verificationUrl, {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const verificationResult = await response.text();

    if (verificationResult !== "VERIFIED") {
      console.error("IPN verification failed:", { result: verificationResult });
      return res.status(400).send("Invalid IPN");
    }
    console.log("IPN verified successfully");

    const paymentStatus = req.body.payment_status.toLowerCase() === "completed" ? "Completed" : req.body.payment_status;
    const orderId = req.body.custom || req.body.invoice;
    const txnId = req.body.txn_id;
    const amount = parseFloat(req.body.mc_gross || 0);
    const currency = req.body.mc_currency || "USD";

    if (paymentStatus === "Completed") {
      const [existing] = await req.db.query("SELECT id FROM transactions WHERE txn_id = ?", [txnId]);
      if (existing.length > 0) {
        console.log("IPN transaction already processed:", { txn_id: txnId });
        return res.status(200).send("Already processed");
      }

      const [order] = await req.db.query("SELECT * FROM orders WHERE id = ?", [orderId]);
      if (!order[0]) {
        console.error("Order not found:", { orderId });
        return res.status(400).send("Order not found");
      }

      const [orderItems] = await req.db.query("SELECT pid, quantity, price FROM order_items WHERE order_id = ?", [
        orderId,
      ]);
      const digestData = [currency, process.env.PAYPAL_MERCHANT_EMAIL, order[0].salt];
      orderItems.forEach((item) => {
        digestData.push(item.pid.toString(), item.quantity.toString(), item.price.toString());
      });
      const regeneratedDigest = crypto.createHash("sha256").update(digestData.join("|")).digest("hex");
      if (regeneratedDigest !== order[0].digest) {
        console.error("Digest mismatch:", { regeneratedDigest, expected: order[0].digest });
        return res.status(400).send("Digest mismatch");
      }

      await req.db.query(
        "INSERT INTO transactions (order_id, txn_id, payment_status, amount, created_at) VALUES (?, ?, ?, ?, NOW())",
        [orderId, txnId, paymentStatus, amount]
      );
      console.log("IPN transaction recorded:", { order_id: orderId, txn_id: txnId, payment_status: paymentStatus, amount });
    } else {
      console.log("Ignored IPN payment status:", { paymentStatus });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("IPN processing error:", error.stack);
    res.status(500).send("Server error");
  }
});

// Check transaction status endpoint
server.get("/api/check-transaction", async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      console.error("Missing orderId in check-transaction");
      return res.status(400).json({ error: "Missing orderId" });
    }

    const parsedOrderId = parseInt(orderId, 10);
    if (isNaN(parsedOrderId)) {
      console.error("Invalid orderId format:", orderId);
      return res.status(400).json({ error: "Invalid orderId format" });
    }

    console.log("Checking transaction for orderId:", parsedOrderId);
    let transaction = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Check transaction attempt ${attempt} for orderId: ${parsedOrderId}`);
      try {
        [transaction] = await req.db.query("SELECT * FROM transactions WHERE order_id = ?", [parsedOrderId]);
        console.log(`Query result attempt ${attempt}:`, transaction);
        if (transaction.length > 0) break;
        console.log(`No transaction found on attempt ${attempt}, waiting 2 seconds`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (dbError) {
        console.error(`Database query error on attempt ${attempt} for orderId ${parsedOrderId}:`, dbError.stack);
        if (attempt === 3) throw dbError;
      }
    }

    if (transaction.length === 0) {
      console.log("No transaction found for orderId:", parsedOrderId);
      return res.status(404).json({ error: "No transaction found" });
    }

    console.log("Transaction found:", { orderId: parsedOrderId, paymentStatus: transaction[0].payment_status });
    const paymentStatus =
      transaction[0].payment_status.toLowerCase() === "completed" ? "Completed" : transaction[0].payment_status;
    res.json({ paymentStatus });
  } catch (error) {
    console.error("Check transaction error:", error.stack);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

// PayPal redirect routes
server.get("/success", async (req, res) => {
  try {
    const { invoice } = req.query;
    console.log("Success redirect:", { invoice, fullQuery: req.query });

    if (!invoice) {
      console.error("Missing invoice parameter");
      return res.redirect("/order-confirmation?status=error&reason=missing_invoice");
    }

    const orderId = invoice;
    let transaction = [];
    for (let attempt = 1; attempt <= 6; attempt++) {
      console.log(`Checking transaction, attempt ${attempt} for orderId: ${orderId}`);
      [transaction] = await req.db.query(
        "SELECT * FROM transactions WHERE order_id = ? AND payment_status = ?",
        [parseInt(orderId), "Completed"]
      );
      console.log(`Success query result attempt ${attempt}:`, transaction);
      if (transaction.length > 0) break;
      console.log(`No transaction found on attempt ${attempt}, waiting 5 seconds`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (transaction.length === 0) {
      console.warn("No completed transaction found for orderId:", orderId);
      await req.db.query("START TRANSACTION");
      try {
        const [order] = await req.db.query("SELECT total FROM orders WHERE id = ?", [parseInt(orderId)]);
        if (!order[0]) {
          console.error("Order not found for orderId:", orderId);
          await req.db.query("ROLLBACK");
          return res.redirect(`/order-confirmation?status=error&reason=no_order&orderId=${orderId}`);
        }
        const [existing] = await req.db.query("SELECT * FROM transactions WHERE order_id = ?", [parseInt(orderId)]);
        if (existing.length > 0) {
          console.log("Transaction found after attempts:", existing);
          transaction = existing;
        } else {
          await req.db.query(
            "INSERT INTO transactions (order_id, txn_id, payment_status, amount, created_at) VALUES (?, ?, ?, ?, NOW())",
            [parseInt(orderId), `WEBHOOK-PENDING-${orderId}`, "Pending", order[0].total]
          );
          console.log("Placeholder transaction inserted:", {
            orderId,
            txn_id: `WEBHOOK-PENDING-${orderId}`,
            payment_status: "Pending",
          });
        }
        await req.db.query("COMMIT");
      } catch (error) {
        console.error("Placeholder transaction error:", error.stack);
        await req.db.query("ROLLBACK");
        throw error;
      }
    }

    if (transaction.length > 0) {
      transaction = [transaction.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]];
    }

    if (transaction.length === 0) {
      return res.redirect(`/order-confirmation?status=error&reason=no_transaction&orderId=${orderId}`);
    }

    const paymentStatus = transaction[0].payment_status.toLowerCase();
    console.log("Transaction found:", { orderId, paymentStatus });

    if (paymentStatus === "completed") {
      res.redirect("/order-confirmation?status=success");
    } else {
      console.error("Transaction not completed:", { orderId, paymentStatus });
      return res.redirect(`/order-confirmation?status=error&reason=payment_status_${paymentStatus}&orderId=${orderId}`);
    }
  } catch (error) {
    console.error("Success route error:", error.stack);
    res.redirect("/order-confirmation?status=error&reason=server_error");
  }
});

server.get("/cancel", (req, res) => {
  console.log("Payment cancelled:", req.query);
  res.redirect("/order-confirmation?status=cancelled");
});

// Next.js handler for all other routes
server.all("*", (req, res) => {
  return handle(req, res);
});

// HTTPS Server
const httpsOptions = {
  key: require("fs").readFileSync("/etc/letsencrypt/live/s33.ierg4210.ie.cuhk.edu.hk/privkey.pem"),
  cert: require("fs").readFileSync("/etc/letsencrypt/live/s33.ierg4210.ie.cuhk.edu.hk/fullchain.pem"),
};

// Start server
app.prepare().then(() => {
  const httpsServer = https.createServer(httpsOptions, server);
  httpsServer.listen(port, () => {
    console.log(`HTTPS Server running on https://s33.ierg4210.ie.cuhk.edu.hk`);
  });

  const httpServer = http.createServer((req, res) => {
    res.writeHeader(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  });
  httpServer.listen(httpPort, () => {
    console.log(`HTTP server redirecting to HTTPS on port ${httpPort}`);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("SIGINT received. Closing servers...");
    httpServer.close(() => console.log("HTTP server closed."));
    httpsServer.close(() => console.log("HTTPS server closed."));
    await pool.end();
    console.log("Database pool closed.");
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received. Closing servers...");
    httpServer.close(() => console.log("HTTP server closed."));
    httpsServer.close(() => console.log("HTTPS server closed."));
    await pool.end();
    console.log("Database pool closed.");
    process.exit(0);
  });
}).catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});