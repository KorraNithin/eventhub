const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Event = require("../models/Event");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// POST /api/bookings
// Body: { eventId, seats }
exports.createBooking = async (req, res, next) => {
  try {
    const { eventId, seats } = req.body;

    // --- Input validation ---
    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }
    if (!isValidObjectId(eventId)) {
      return res.status(400).json({ message: "Invalid eventId" });
    }

    const seatsNum = Number(seats);
    if (!seats || isNaN(seatsNum) || !Number.isInteger(seatsNum) || seatsNum < 1 || seatsNum > 4) {
      return res.status(400).json({ message: "seats must be an integer between 1 and 4" });
    }

    // --- Atomic seat reservation ---
    // Finds the event only if it has enough available seats AND the date is in the future.
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        availableSeats: { $gte: seatsNum },
        date: { $gt: new Date() },
      },
      { $inc: { availableSeats: -seatsNum } },
      { new: true }
    );

    if (!event) {
      // Distinguish sold-out from not-found / past-event
      const exists = await Event.findById(eventId).select("_id availableSeats date");
      if (!exists) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (exists.date <= new Date()) {
        return res.status(400).json({ message: "Cannot book a past event" });
      }
      // Seats were not enough
      return res.status(409).json({ message: "Not enough seats available" });
    }

    // --- Create the booking ---
    let booking;
    try {
      booking = await Booking.create({
        user: req.user._id,
        event: eventId,
        seats: seatsNum,
        status: "confirmed",
      });
    } catch (createErr) {
      // Roll back the reserved seats before surfacing the error
      await Event.findByIdAndUpdate(eventId, { $inc: { availableSeats: seatsNum } });

      // Duplicate confirmed booking (partial unique index violation)
      if (createErr.code === 11000) {
        return res.status(409).json({ message: "You already have a confirmed booking for this event" });
      }
      throw createErr;
    }

    await booking.populate("event", "title venue date availableSeats");
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/mine
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("event", "title venue date price availableSeats")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/bookings/:id/cancel
exports.cancelBooking = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Atomically flip confirmed -> cancelled. Only one concurrent request can match.
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "confirmed" },
      { status: "cancelled" },
      { new: true }
    );

    if (!booking) {
      // Not found, not yours, or already cancelled
      const existing = await Booking.findOne({ _id: req.params.id, user: req.user._id }).select("status");
      if (!existing) {
        return res.status(404).json({ message: "Booking not found" });
      }
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    // Restore seats exactly once. If this fails, undo the status change.
    try {
      await Event.updateOne({ _id: booking.event }, { $inc: { availableSeats: booking.seats } });
    } catch (restoreErr) {
      await Booking.updateOne({ _id: booking._id }, { status: "confirmed" });
      throw restoreErr;
    }

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (err) {
    next(err);
  }
};
