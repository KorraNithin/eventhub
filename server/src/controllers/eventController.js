const mongoose = require("mongoose");
const Event = require("../models/Event");

// Whitelisted fields for create / update
const ALLOWED_FIELDS = ["title", "description", "venue", "date", "price", "totalSeats"];

function pickAllowed(body) {
  return ALLOWED_FIELDS.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) acc[key] = body[key];
    return acc;
  }, {});
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Inline validation -- returns array of error strings
function validateEventFields(fields, requireAll = true) {
  const errors = [];

  if (requireAll || fields.title !== undefined) {
    if (!fields.title || typeof fields.title !== "string" || fields.title.trim().length < 3) {
      errors.push("title must be at least 3 characters");
    } else if (fields.title.trim().length > 100) {
      errors.push("title cannot exceed 100 characters");
    }
  }

  if (requireAll || fields.description !== undefined) {
    if (!fields.description || typeof fields.description !== "string" || fields.description.trim().length === 0) {
      errors.push("description is required");
    } else if (fields.description.trim().length > 2000) {
      errors.push("description cannot exceed 2000 characters");
    }
  }

  if (requireAll || fields.venue !== undefined) {
    if (!fields.venue || typeof fields.venue !== "string" || fields.venue.trim().length === 0) {
      errors.push("venue is required");
    } else if (fields.venue.trim().length > 200) {
      errors.push("venue cannot exceed 200 characters");
    }
  }

  if (requireAll || fields.date !== undefined) {
    if (!fields.date) {
      errors.push("date is required");
    } else if (isNaN(new Date(fields.date).getTime())) {
      errors.push("date must be a valid date");
    }
  }

  if (requireAll || fields.price !== undefined) {
    const price = Number(fields.price);
    if (fields.price === undefined || fields.price === null || fields.price === "") {
      if (requireAll) errors.push("price is required");
    } else if (isNaN(price) || price < 0) {
      errors.push("price must be a number >= 0");
    }
  }

  if (requireAll || fields.totalSeats !== undefined) {
    const seats = Number(fields.totalSeats);
    if (fields.totalSeats === undefined || fields.totalSeats === null || fields.totalSeats === "") {
      if (requireAll) errors.push("totalSeats is required");
    } else if (isNaN(seats) || !Number.isInteger(seats) || seats < 1) {
      errors.push("totalSeats must be an integer >= 1");
    }
  }

  return errors;
}

// GET /api/events
// Query: ?search=, ?page=, ?limit=, ?upcoming=false (defaults to upcoming only)
exports.getEvents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    // Default: only upcoming events
    const showAll = req.query.upcoming === "false";
    if (!showAll) {
      filter.date = { $gte: new Date() };
    }

    if (req.query.search) {
      const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { venue: rx }];
    }

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email"),
      Event.countDocuments(filter),
    ]);

    res.json({
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id
exports.getEvent = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(req.params.id).populate("createdBy", "name email");
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json(event);
  } catch (err) {
    next(err);
  }
};

// POST /api/events  (admin only)
exports.createEvent = async (req, res, next) => {
  try {
    const fields = pickAllowed(req.body);
    const errors = validateEventFields(fields, true);
    if (errors.length) return res.status(400).json({ errors });

    const event = await Event.create({
      ...fields,
      availableSeats: Number(fields.totalSeats),
      createdBy: req.user._id,
    });

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
};

// PUT /api/events/:id  (admin only)
exports.updateEvent = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const fields = pickAllowed(req.body);
    if (!Object.keys(fields).length) {
      return res.status(400).json({ message: "No updatable fields provided" });
    }

    const errors = validateEventFields(fields, false);
    if (errors.length) return res.status(400).json({ errors });

    // If totalSeats is being updated, adjust availableSeats proportionally
    const update = { ...fields };
    if (fields.totalSeats !== undefined) {
      const event = await Event.findById(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });

      const diff = Number(fields.totalSeats) - event.totalSeats;
      update.availableSeats = Math.max(0, event.availableSeats + diff);
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Event not found" });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/events/:id  (admin only)
exports.deleteEvent = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    next(err);
  }
};
