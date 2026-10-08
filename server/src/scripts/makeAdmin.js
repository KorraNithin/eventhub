require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node src/scripts/makeAdmin.js <email>");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { role: "admin" },
    { new: true }
  );
  console.log(user ? `${user.email} is now an admin` : "User not found");
  await mongoose.disconnect();
})();