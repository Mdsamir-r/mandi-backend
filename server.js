const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// 💎 GLOBAL CORS POLICY PASS WITH PRODUCTION EXPANSION
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// 🌐 CLOUD CONFIGURATION PATH
// Note: Local machine par test karne ke liye aap is string ko "mongodb://127.0.0.1:27017/mandi_db" se replace kar sakte hain.
const MONGO_URI = process.env.MONGO_URI || "mongodb://samir014:7jmEJU4dzs8pIhxu@cluster0-shard-00-00.d8ui6ol.mongodb.net:27017,cluster0-shard-00-01.d8ui6ol.mongodb.net:27017,cluster0-shard-00-02.d8ui6ol.mongodb.net:27017/mandi_db?ssl=true&replicaSet=atlas-d8ui6ol-shard-0&authSource=admin&retryWrites=true&w=majority";

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
  name: String, stock: Number, purchasePrice: Number, sellingPrice: Number, unitType: String, supplierId: String
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

app.post('/api/users', async (req, res) => {
  try {
    const { name, phone, role, initialBalance } = req.body;
    const newUser = new User({ name, phone: phone || 'N/A', role, balance: Number(initialBalance) || 0 });
    await newUser.save();
    res.status(201).json({ message: 'User added', user: { id: newUser._id.toString(), name: newUser.name, phone: newUser.phone, role: newUser.role, balance: newUser.balance } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(u => ({ id: u._id.toString(), name: u.name, phone: u.phone, role: u.role, balance: u.balance })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users/delete/:id', async (req, res) => {
  try {
    const { secretCode } = req.body;
    if (secretCode !== ADMIN_SECRET_PIN) return res.status(403).json({ error: 'Galat PIN!' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, stock, purchasePrice, sellingPrice, unitType, supplierId } = req.body;
    const quantity = Number(stock);
    const buyRate = Number(purchasePrice);
    const totalCost = quantity * buyRate;
    let supplierName = 'Unknown Supplier';

    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      const supplier = await User.findById(supplierId);
      if (supplier) {
        supplier.balance -= totalCost;
        supplierName = supplier.name;
        await supplier.save();
      }
    }

    const newInward = new Inward({ id: 'CHALLAN-' + Date.now(), supplierId, supplierName, productName: name, quantity, purchasePrice: buyRate, totalCost, unitType });
    await newInward.save();

    let product = await Product.findOne({ name: { $regex: new RegExp("^" + name + "$", "i") }, unitType });
    if (product) {
      product.stock += quantity;
      product.purchasePrice = buyRate;
      product.sellingPrice = Number(sellingPrice);
    } else {
      product = new Product({ name, stock: quantity, purchasePrice: buyRate, sellingPrice: Number(sellingPrice), unitType, supplierId });
    }
    await product.save();
    res.status(201).json({ message: 'Stock added', inward: newInward });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products', async (req, res) => {
  try {
    const prods = await Product.find();
    res.json(prods.map(p => ({ id: p._id.toString(), name: p.name, stock: p.stock, purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice, unitType: p.unitType })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

app.put('/api/bills/:id', async (req, res) => {
  try {
    const billId = req.params.id;
    const { items, paidAmount, customCommission, paymentMode } = req.body;
    const oldBill = await Bill.findOne({ id: billId });
    const customer = await User.findById(oldBill.customerId);

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
      product.stock -= Number(item.weight);
      await product.save();
      const itemTotal = Number(item.weight) * Number(item.rate);
      rawBillAmount += itemTotal;
      totalProfit += (Number(item.rate) - product.purchasePrice) * Number(item.weight);
      updatedBillItems.push({ productId: product._id.toString(), productName: product.name, weight: Number(item.weight), rate: Number(item.rate), unitType: product.unitType, total: itemTotal });
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

app.get('/api/dashboard/deep-history', async (req, res) => {
  try {
    const todayStr = new Date().toDateString();
    const bills = await Bill.find();
    const deposits = await Deposit.find();
    const users = await User.find();
    res.json({ dayBills: bills.filter(b => new Date(b.date).toDateString() === todayStr), dayDeposits: deposits.filter(d => new Date(d.date).toDateString() === todayStr), allUsers: users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🚀 FIXED FOR LIVE SERVERS (Render provides dynamic ports)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Mandi MERN Cloud DB Active on port ' + PORT));