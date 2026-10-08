module.exports = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || "Server error";

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || "value";
    message = `${field} already exists`;
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid id";
  }

  if (status === 500) console.error(err);
  res.status(status).json({ message });
};