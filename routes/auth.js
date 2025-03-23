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
  secure: false, // Set to true in production (HTTPS)
  sameSite: "Strict",
  maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
};

// Function to Rotate Session ID
function rotateSession(res) {
  const newSessionID = crypto.randomBytes(32).toString("hex");
  res.cookie("sessionID", newSessionID, cookieOptions);
}

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.userid, role: user.is_admin ? "admin" : "user" },
      SECRET_KEY,
      { expiresIn: "2d" }
    );

    res.cookie("authToken", token, cookieOptions);
    rotateSession(res);
    res.json({ message: "Login successful", role: user.is_admin ? "admin" : "user" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout Route
router.post("/logout", (req, res) => {
  res.clearCookie("authToken");
  res.clearCookie("sessionID");
  res.json({ message: "Logged out successfully" });
});

// Change Password Route
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required." });
    }

    // Get user from database
    const [results] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (results.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = results[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await db.execute("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);

    // Clear authentication cookies (force logout)
    res.clearCookie("authToken");
    res.clearCookie("sessionID");

    res.json({ success: true, message: "Password changed successfully. Please log in again." });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware: Authentication Check
function authenticate(req, res, next) {
  const token = req.cookies.authToken;
  if (!token) return res.status(401).json({ error: "Unauthorized - No token found" });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });

    req.user = decoded;
    next();
  });
}

// Middleware: Admin Authorization
function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Check if User is Logged In
router.get("/user", authenticate, (req, res) => {
  res.json({ userId: req.user.userId, role: req.user.role });
});

// Protect Admin Routes
router.get("/admin", authenticate, isAdmin, (req, res) => {
  res.json({ message: "Welcome to the Admin Panel" });
});

module.exports = router;