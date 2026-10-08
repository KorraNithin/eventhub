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

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only the owner can cancel
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised to cancel this booking" });
    }

    // Only confirmed bookings can be cancelled
    if (booking.status !== "confirmed") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    // Mark cancelled and restore seats atomically
    // Both writes must succeed; if restoring seats fails the booking status
    // stays confirmed (safer than leaking seats).
    await Event.findByIdAndUpdate(booking.event, {
      $inc: { availableSeats: booking.seats },
    });

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (err) {
    next(err);
  }
};
