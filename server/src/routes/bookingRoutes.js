const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createBooking,
  getMyBookings,
  cancelBooking,
} = require("../controllers/bookingController");

// All booking routes require authentication
router.post("/", protect, createBooking);
router.get("/mine", protect, getMyBookings);
router.patch("/:id/cancel", protect, cancelBooking);

module.exports = router;
