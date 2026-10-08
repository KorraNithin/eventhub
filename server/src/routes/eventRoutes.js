const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");

// Public
router.get("/", getEvents);
router.get("/:id", getEvent);

// Admin only
router.post("/", protect, authorize("admin"), createEvent);
router.put("/:id", protect, authorize("admin"), updateEvent);
router.delete("/:id", protect, authorize("admin"), deleteEvent);

module.exports = router;
