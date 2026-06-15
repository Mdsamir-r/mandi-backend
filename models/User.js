const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['customer', 'party'], required: true }, // customer = maal khareedne wala, party = maal supply karne wala
  balance: { type: Number, default: 0 }, // (+) positive matlab hume customer se paisa lena hai, (-) negative matlab hume party ko paisa dena hai
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);