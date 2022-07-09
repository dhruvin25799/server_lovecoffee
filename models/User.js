const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  cart: Object,
  wishlist: Array,
  address: Array,
});
module.exports = mongoose.model("User", userSchema);