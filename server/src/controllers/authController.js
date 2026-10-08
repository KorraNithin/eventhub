const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Sign a JWT for the given user id.
 */
function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // --- Input validation ---
    const errors = [];
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      errors.push("Name must be at least 2 characters.");
    }
    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push("A valid email is required.");
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      errors.push("Password must be at least 6 characters.");
    }
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // --- Duplicate check ---
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    // --- Create user (password hashed by pre-save hook) ---
    const user = await User.create({ name: name.trim(), email, password });

    const token = signToken(user._id);

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // --- Input validation ---
    const errors = [];
    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push("A valid email is required.");
    }
    if (!password || typeof password !== "string") {
      errors.push("Password is required.");
    }
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // --- Look up user (re-select password which is excluded by default) ---
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(user._id);

    return res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};


/**
 * GET /api/auth/me
 * Returns the currently authenticated user (no password).
 */
exports.getMe = (req, res) => {
  const { _id, name, email, role, createdAt, updatedAt } = req.user;
  res.status(200).json({
    user: { id: _id, name, email, role, createdAt, updatedAt },
  });
};
