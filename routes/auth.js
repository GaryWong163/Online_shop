const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";

// Secure Cookie Configuration
const cookieOptions = {
  httpOnly: true,
  secure: true, // Required for HTTPS
  sameSite: process.env.NODE_ENV === "production" ? "Lax" : "None",
  path: "/",
  domain: "s33.ierg4210.ie.cuhk.edu.hk", // Explicit domain
};

// Helper function to clear auth cookies
function clearAuthCookies(res) {
  res.clearCookie("authToken", cookieOptions);
  res.clearCookie("sessionID", cookieOptions);
  console.log("Cleared authToken and sessionID cookies with options:", cookieOptions);
}

// Function to Rotate Session ID
function rotateSession(res) {
  const newSessionID = crypto.randomBytes(32).toString("hex");
  res.cookie("sessionID", newSessionID, cookieOptions);
  console.log("Rotating sessionID:", newSessionID);
}

// Register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [existing] = await req.db.query("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const [result] = await req.db.query(
      "INSERT INTO users (email, password, is_admin) VALUES (?, ?, ?)",
      [email, hashedPassword, false]
    );

    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error("Register error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("Login attempt for email:", email);
    const [results] = await db.execute("SELECT user_id, email, password, is_admin FROM users WHERE email = ?", [email]);
    if (results.length === 0) {
      console.warn("User not found:", email);
      return res.status(401).json({ concerned: "Invalid credentials" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.warn("Password mismatch for:", email);
      return res.status(401).json({ concerned: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.is_admin ? "admin" : "user" },
      SECRET_KEY,
      { expiresIn: "2d" }
    );

    res.cookie("authToken", token, cookieOptions);
    console.log("Setting authToken cookie:", { token, cookieOptions });
    rotateSession(res);
    res.json({ message: "Login successful", role: user.is_admin ? "admin" : "user" });
  } catch (err) {
    console.error("Login error:", err.stack);
    res.status(500).json({ concerned: "Internal server error" });
  }
});

// Logout Route
router.post("/logout", (req, res) => {
  console.log("Logout request received, cookies before clearing:", req.cookies);
  clearAuthCookies(res);
  res.json({ message: "Logged out successfully" });
});

// Change Password Route
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ concerned: "Current and new passwords are required." });
    }

    const [results] = await db.execute("SELECT user_id, email, password FROM users WHERE email = ?", [email]);
    if (results.length === 0) {
      return res.status(404).json({ concerned: "User not found." });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ concerned: "Incorrect current password." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.execute("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);

    clearAuthCookies(res);
    res.json({ success: true, message: "Password changed successfully. Please log in again." });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ concerned: "Internal server error" });
  }
});

// Middleware: Authentication Check
function authenticate(req, res, next) {
  const token = req.cookies.authToken;
  if (!token) {
    console.warn("No authToken cookie found in authenticate middleware");
    return res.status(401).json({ concerned: "Unauthorized - No token found" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.warn("Invalid token in authenticate middleware:", err.message);
      return res.status(401).json({ concerned: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
}

// Middleware: Admin Authorization
function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ concerned: "Forbidden" });
  }
  next();
}

// Check if User is Logged In
router.get("/user", authenticate, (req, res) => {
  console.log("Serving /auth/user, cookies received:", req.cookies);
  console.log("Serving /auth/user, decoded user:", req.user);
  res.json({ userId: req.user.userId, role: req.user.role });
});

// Protect Admin Routes
router.get("/admin", authenticate, isAdmin, (req, res) => {
  res.json({ message: "Welcome to the Admin Panel" });
});

module.exports = router;