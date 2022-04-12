const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  img: String,
  discount: String,
  price: String,
  inStock: Boolean,
  rating: String,
});
module.exports = mongoose.model("Product", productSchema);
