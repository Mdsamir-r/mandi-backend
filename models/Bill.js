const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    weight: { type: Number, required: true }, // Kitna wazan becha
    rate: { type: Number, required: true }, // Kis rate me becha
    total: { type: Number, required: true } // weight * rate
  }],
  previousBalance: { type: Number, required: true }, // Purana baaki udhaar
  billAmount: { type: Number, required: true }, // Aaj ke maal ka total keemat
  grandTotal: { type: Number, required: true }, // previousBalance + billAmount
  paidAmount: { type: Number, default: 0 }, // Aaj customer ne kitna cash diya
  newBalance: { type: Number, required: true }, // grandTotal - paidAmount (Ye automatic customer ke 'User' account me save ho jayega)
  totalProfit: { type: Number, required: true }, // (Selling Rate - Purchase Price) * Weight
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bill', BillSchema);