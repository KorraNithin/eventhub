const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    seats: {
      type: Number,
      required: [true, "seats is required"],
      min: [1, "seats must be at least 1"],
      max: [4, "seats cannot exceed 4"],
    },
    status: {
      type: String,
      enum: {
        values: ["confirmed", "cancelled"],
        message: "status must be confirmed or cancelled",
      },
      default: "confirmed",
    },
  },
  { timestamps: true }
);

// Partial unique index: a user may only have one *confirmed* booking per event.
// Cancelled bookings are excluded so a user can re-book after cancelling.
bookingSchema.index(
  { user: 1, event: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "confirmed" },
    name: "unique_confirmed_booking",
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
