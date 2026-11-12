const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Jaise: Aloo, Tamatar, Pyaz
  stock: { type: Number, default: 0 }, // Kitna kilo ya crate stock bacha hai
  purchasePrice: { type: Number, required: true }, // Per kg khareed rate (Profit/Loss nikalne ke liye)
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);