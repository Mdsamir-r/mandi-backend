const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// 💎 GLOBAL CORS POLICY PASS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// 🌐 CLOUD CONFIGURATION PATH
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://samir014:7jmEJU4dzs8pIhxu@cluster0.d8ui6ol.mongodb.net/mandi_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("💎 SUCCESS: MANDI LIVE PRODUCTION ENGINE SAFELY LINKED CLOUD DATABASE!"))
  .catch(err => console.error("❌ Database Connection Error:", err));

const ADMIN_SECRET_PIN = "1234";

// ================= MONGODB DATA SCHEMAS =================
const UserSchema = new mongoose.Schema({
  name: String, phone: String, role: String, balance: Number, createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
  name: String, stock: Number, purchasePrice: Number, sellingPrice: Number, unitType: String, supplierId: String, supplierName: String
});
const Product = mongoose.model('Product', ProductSchema);

const DepositSchema = new mongoose.Schema({
  userId: String, userName: String, userRole: String, amount: Number, type: String, paymentMode: String, previousBalance: Number, newBalance: Number, date: { type: Date, default: Date.now }
});
const Deposit = mongoose.model('Deposit', DepositSchema);

const BillSchema = new mongoose.Schema({
  id: String, customerId: String, customerName: String, items: Array, rawBillAmount: Number, commissionAmount: Number, previousBalance: Number, billAmount: Number, grandTotal: Number, paidAmount: Number, paymentMode: String, newBalance: Number, totalProfit: Number, date: { type: Date, default: Date.now }
});
const Bill = mongoose.model('Bill', BillSchema);

const InwardSchema = new mongoose.Schema({
  id: String, supplierId: String, supplierName: String, productName: String, quantity: Number, purchasePrice: Number, totalCost: Number, unitType: String, date: { type: Date, default: Date.now }
});
const Inward = mongoose.model('Inward', InwardSchema);

// ================= API ENDPOINTS =================

// Add User
app.post('/api/users', async (req, res) => {
  try {
    const { name, phone, role, initialBalance } = req.body;
    const newUser = new User({ name, phone: phone || 'N/A', role, balance: Number(initialBalance) || 0 });
    await newUser.save();
    res.status(201).json({ message: 'User added', user: { id: newUser._id.toString(), name: newUser.name, phone: newUser.phone, role: newUser.role, balance: newUser.balance } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get All Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(u => ({ id: u._id.toString(), name: u.name, phone: u.phone, role: u.role, balance: u.balance })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE USER (Edit Name, Phone, Balance) - NEW 🚀
app.put('/api/users/update/:id', async (req, res) => {
  try {
    const { name, phone, balance } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User missing' });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (balance !== undefined) user.balance = Number(balance);

    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete User
app.post('/api/users/delete/:id', async (req, res) => {
  try {
    const { secretCode } = req.body;
    if (secretCode !== ADMIN_SECRET_PIN) return res.status(403).json({ error: 'Galat PIN!' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADD STOCK (FIXED: Kisaan ka auto-bill/minus hata diya gaya hai 🥦)
app.post('/api/products', async (req, res) => {
  try {
    const { name, stock, purchasePrice, sellingPrice, unitType, supplierId } = req.body;
    const quantity = Number(stock);
    const buyRate = Number(purchasePrice) || 0;
    let supplierName = 'Unknown Supplier';

    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      const supplier = await User.findById(supplierId);
      if (supplier) {
        supplierName = supplier.name;
        // ❌ BALANCE AUTOMATIC MINUS LOGIC REMOVED AS REQUESTED BY USER
      }
    }

    let product = await Product.findOne({ name: { $regex: new RegExp("^" + name + "$", "i") }, unitType });
    if (product) {
      product.stock += quantity;
      product.purchasePrice = buyRate;
      product.sellingPrice = Number(sellingPrice) || 0;
      product.supplierId = supplierId;
      product.supplierName = supplierName;
    } else {
      product = new Product({ name, stock: quantity, purchasePrice: buyRate, sellingPrice: Number(sellingPrice) || 0, unitType, supplierId, supplierName });
    }
    await product.save();
    res.status(201).json({ message: 'Stock added only under supplier name', product });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get All Products
app.get('/api/products', async (req, res) => {
  try {
    const prods = await Product.find();
    res.json(prods.map(p => ({ id: p._id.toString(), name: p.name, stock: p.stock, purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice, unitType: p.unitType, supplierId: p.supplierId, supplierName: p.supplierName || 'N/A' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE PRODUCT STOCK (Edit Stock/Rates/Wastage) - NEW 🚀
app.put('/api/products/update/:id', async (req, res) => {
  try {
    const { name, stock, purchasePrice, sellingPrice, unitType } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product missing' });

    if (name) product.name = name;
    if (stock !== undefined) product.stock = Number(stock);
    if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (unitType) product.unitType = unitType;

    await product.save();
    res.json({ message: 'Stock updated', product });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE PRODUCT FROM LIVE STOCK - NEW 🚀
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product completely removed from stock vault' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create Customer Bill
app.post('/api/bills', async (req, res) => {
  try {
    const { userId, items, paidAmount, customCommission, paymentMode } = req.body;
    const customer = await User.findById(userId);
    if (!customer) return res.status(404).json({ error: 'Customer missing' });

    let rawBillAmount = 0;
    let totalProfit = 0;
    const billItems = [];

    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= Number(item.weight);
        await product.save();
        const itemTotal = Number(item.weight) * Number(item.rate);
        rawBillAmount += itemTotal;
        totalProfit += (Number(item.rate) - product.purchasePrice) * Number(item.weight);
        billItems.push({ productId: product._id.toString(), productName: product.name, weight: Number(item.weight), rate: Number(item.rate), unitType: product.unitType, total: itemTotal });
      }
    }

    const commissionAmount = Number(customCommission) || 0;
    const billAmount = rawBillAmount + commissionAmount;
    const previousBalance = customer.balance;
    const grandTotal = previousBalance + billAmount;
    const newBalance = grandTotal - Number(paidAmount);

    customer.balance = newBalance;
    await customer.save();

    const newBill = new Bill({
      id: 'BILL-' + Date.now(), customerId: customer._id.toString(), customerName: customer.name,
      items: billItems, rawBillAmount, commissionAmount, previousBalance, billAmount,
      grandTotal, paidAmount: Number(paidAmount), paymentMode, newBalance, totalProfit: totalProfit + commissionAmount
    });
    await newBill.save();
    res.status(201).json({ message: 'Bill saved', bill: newBill });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Edit/Modify Bill
app.put('/api/bills/:id', async (req, res) => {
  try {
    const billId = req.params.id;
    const { items, paidAmount, customCommission, paymentMode } = req.body;
    const oldBill = await Bill.findOne({ id: billId });
    if (!oldBill) return res.status(404).json({ error: 'Bill missing' });
    
    const customer = await User.findById(oldBill.customerId);
    if (!customer) return res.status(404).json({ error: 'Customer missing' });

    for (let oldItem of oldBill.items) {
      const product = await Product.findById(oldItem.productId);
      if (product) {
        product.stock += Number(oldItem.weight);
        await product.save();
      }
    }
    customer.balance = customer.balance - oldBill.billAmount + oldBill.paidAmount;

    let rawBillAmount = 0;
    let totalProfit = 0;
    const updatedBillItems = [];

    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= Number(item.weight);
        await product.save();
        const itemTotal = Number(item.weight) * Number(item.rate);
        rawBillAmount += itemTotal;
        totalProfit += (Number(item.rate) - product.purchasePrice) * Number(item.weight);
        updatedBillItems.push({ productId: product._id.toString(), productName: product.name, weight: Number(item.weight), rate: Number(item.rate), unitType: product.unitType, total: itemTotal });
      }
    }

    const commissionAmount = Number(customCommission) || 0;
    const newBillAmount = rawBillAmount + commissionAmount;
    const previousBalance = customer.balance;

    customer.balance = previousBalance + newBillAmount - Number(paidAmount);
    await customer.save();

    oldBill.items = updatedBillItems;
    oldBill.rawBillAmount = rawBillAmount;
    oldBill.commissionAmount = commissionAmount;
    oldBill.billAmount = newBillAmount;
    oldBill.grandTotal = previousBalance + newBillAmount;
    oldBill.paidAmount = Number(paidAmount);
    oldBill.paymentMode = paymentMode;
    oldBill.newBalance = customer.balance;
    oldBill.totalProfit = totalProfit + commissionAmount;
    
    await oldBill.save();
    res.json({ message: 'Modified', bill: oldBill });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save Cash Deposit
app.post('/api/deposits', async (req, res) => {
  try {
    const { userId, amount, type, paymentMode } = req.body;
    const user = await User.findById(userId);
    const previousBalance = user.balance;

    if (user.role === 'customer') user.balance -= Number(amount);
    else user.balance += Number(amount);
    await user.save();

    const deposit = new Deposit({ userId, userName: user.name, userRole: user.role, amount: Number(amount), type, paymentMode, previousBalance, newBalance: user.balance });
    await deposit.save();
    res.json({ message: 'Deposit Saved', deposit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Timeline Ledger
app.get('/api/users/:id/timeline', async (req, res) => {
  try {
    const uid = req.params.id;
    const bills = await Bill.find({ customerId: uid });
    const deposits = await Deposit.find({ userId: uid });
    const inwards = await Inward.find({ supplierId: uid });

    let timeline = [];
    bills.forEach(b => timeline.push({ id: b.id, date: b.date, type: 'Credit (Bikri Parcha)', description: b.items.map(i => i.productName).join(', '), amount: b.billAmount, cashImpact: 'Jama: Rs. ' + b.paidAmount, finalBalance: b.newBalance, rawObj: b, isCustomerBill: true }));
    inwards.forEach(i => timeline.push({ id: i.id, date: i.date, type: 'Maal Inward (Challan)', description: i.productName, amount: i.totalCost, cashImpact: 'Vault Drop', finalBalance: '-', rawObj: i, isInwardChallan: true }));
    deposits.forEach(d => timeline.push({ id: d.id, date: d.date, type: d.type === 'jama' ? 'Cash Received (Jama)' : 'Cash Paid (Bhugtan)', description: d.paymentMode, amount: d.amount, cashImpact: '-', finalBalance: Math.abs(d.newBalance), rawObj: d, isDeposit: true }));
    
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(timeline);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Dashboard Main Data
app.get('/api/dashboard', async (req, res) => {
  try {
    const bills = await Bill.find();
    const users = await User.find();
    const deposits = await Deposit.find();
    const todayStr = new Date().toDateString();

    let totalSales = 0, totalProfit = 0, totalCashReceived = 0;
    bills.forEach(b => { totalSales += b.billAmount; totalProfit += b.totalProfit; totalCashReceived += b.paidAmount; });
    deposits.forEach(d => { if (d.type === 'jama') totalCashReceived += d.amount; });

    let totalCustomerUdhaar = 0, totalPartyDena = 0;
    users.forEach(u => {
      if (u.role === 'customer' && u.balance > 0) totalCustomerUdhaar += u.balance;
      if (u.role === 'party' && u.balance < 0) totalPartyDena += Math.abs(u.balance);
    });

    let todaySales = 0, todayProfit = 0, todayCashReceived = 0, todayWeightSold = 0;
    let todayItemBreakdown = {};

    bills.forEach(b => {
      if (new Date(b.date).toDateString() === todayStr) {
        todaySales += b.billAmount; todayProfit += b.totalProfit; todayCashReceived += b.paidAmount;
        b.items.forEach(it => {
          todayWeightSold += Number(it.weight);
          const key = it.productName;
          if (!todayItemBreakdown[key]) todayItemBreakdown[key] = { name: it.productName, unit: it.unitType || 'Kg', totalQty: 0, totalRevenue: 0 };
          todayItemBreakdown[key].totalQty += Number(it.weight); todayItemBreakdown[key].totalRevenue += Number(it.total);
        });
      }
    });

    res.json({ totalSales, totalProfit, totalCashReceived, totalCustomerUdhaar, totalPartyDena, todaySales, todayProfit, todayCashReceived, todayWeightSold, todayItemsSoldList: Object.values(todayItemBreakdown) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Deep History Breakdown
app.get('/api/dashboard/deep-history', async (req, res) => {
  try {
    const todayStr = new Date().toDateString();
    const bills = await Bill.find();
    const deposits = await Deposit.find();
    const users = await User.find();
    res.json({ dayBills: bills.filter(b => new Date(b.date).toDateString() === todayStr), dayDeposits: deposits.filter(d => new Date(d.date).toDateString() === todayStr), allUsers: users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Mandi MERN Cloud DB Active on port ' + PORT));