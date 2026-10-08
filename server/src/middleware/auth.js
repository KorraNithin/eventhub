const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * protect
 * Verifies the Bearer token from the Authorization header,
 * loads the user from the DB, and attaches it to req.user.
 *
 * Responds with 401 if:
 *  - Authorization header is missing or not a Bearer token
 *  - Token is invalid or expired
 *  - The user no longer exists in the DB
 */
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorised. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Not authorised. Token has expired."
          : "Not authorised. Invalid token.";
      return res.status(401).json({ message });
    }

    // Load fresh user from DB (token could be valid but account deleted)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Not authorised. User no longer exists." });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * authorize(...roles)
 * Factory that returns middleware restricting access to the given roles.
 * Must be used AFTER protect (req.user must already be set).
 *
 * Responds with 403 if req.user.role is not in the allowed list.
 *
 * Usage:
 *   router.delete("/users/:id", protect, authorize("admin"), deleteUser);
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: `Forbidden. Requires role: ${roles.join(" or ")}.` });
    }
    next();
  };
};
