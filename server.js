require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS block: Access denied'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mandi_db";

mongoose.connect(MONGO_URI)
  .then(() => console.log("💎 MANDI CLOUD PRODUCTION ENGINE ONLINE"))
  .catch(err => console.error("❌ Database Connection Error:", err));

const ADMIN_SECRET_PIN = process.env.ADMIN_SECRET_PIN || "1234";

// ================= SCHEMAS =================
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, default: 'N/A' },
  role: { type: String, default: 'customer' },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stock: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  unitType: { type: String, default: 'Kg' },
  supplierId: { type: String, default: null },
  supplierName: { type: String, default: 'Unknown Supplier' }
});
const Product = mongoose.model('Product', ProductSchema);

const DepositSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  userRole: String,
  amount: Number,
  type: String,
  paymentMode: String,
  previousBalance: Number,
  newBalance: Number,
  date: { type: Date, default: Date.now }
});
const Deposit = mongoose.model('Deposit', DepositSchema);

const BillSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  customerId: String,
  customerName: String,
  isDirectBill: { type: Boolean, default: false },
  note: { type: String, default: '' },
  items: Array,
  rawBillAmount: Number,
  commissionAmount: Number,
  previousBalance: Number,
  billAmount: Number,
  grandTotal: Number,
  paidAmount: Number,
  paymentMode: String,
  newBalance: Number,
  totalProfit: Number,
  date: { type: Date, default: Date.now }
});
const Bill = mongoose.model('Bill', BillSchema);

const InwardSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  supplierId: String,
  supplierName: String,
  productName: String,
  quantity: Number,
  purchasePrice: Number,
  totalCost: Number,
  unitType: String,
  date: { type: Date, default: Date.now }
});
const Inward = mongoose.model('Inward', InwardSchema);

// ================= USER ROUTES =================
app.post('/api/users', async (req, res) => {
  try {
    const { name, phone, role, initialBalance } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const newUser = new User({ 
      name, 
      phone: phone || 'N/A', 
      role: role || 'customer', 
      balance: Number(initialBalance) || 0 
    });
    await newUser.save();
    res.status(201).json({ message: 'User added', user: newUser });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(u => ({ 
      id: u._id.toString(), 
      name: u.name, 
      phone: u.phone, 
      role: u.role, 
      balance: u.balance 
    })));
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

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
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/users/delete/:id', async (req, res) => {
  try {
    const { secretCode } = req.body;
    if (secretCode !== ADMIN_SECRET_PIN) return res.status(403).json({ error: 'Galat PIN!' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ================= PRODUCT / STOCK ROUTES =================
app.post('/api/products', async (req, res) => {
  try {
    const { name, stock, purchasePrice, sellingPrice, unitType, supplierId } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name required' });
    const quantity = Number(stock) || 0;
    const buyRate = Number(purchasePrice) || 0;
    let supplierName = 'Unknown Supplier';

    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      const supplier = await User.findById(supplierId);
      if (supplier) supplierName = supplier.name;
    }

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let product = await Product.findOne({ name: { $regex: new RegExp("^" + escapedName + "$", "i") }, unitType });
    if (product) {
      product.stock += quantity;
      product.purchasePrice = buyRate;
      product.sellingPrice = Number(sellingPrice) || 0;
      product.supplierId = supplierId;
      product.supplierName = supplierName;
    } else {
      product = new Product({ 
        name, 
        stock: quantity, 
        purchasePrice: buyRate, 
        sellingPrice: Number(sellingPrice) || 0, 
        unitType: unitType || 'Kg', 
        supplierId, 
        supplierName 
      });
    }
    await product.save();
    res.status(201).json({ message: 'Stock added', product });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const prods = await Product.find();
    res.json(prods.map(p => ({ 
      id: p._id.toString(), 
      name: p.name, 
      stock: p.stock, 
      purchasePrice: p.purchasePrice, 
      sellingPrice: p.sellingPrice, 
      unitType: p.unitType, 
      supplierId: p.supplierId, 
      supplierName: p.supplierName || 'N/A' 
    })));
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

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
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product removed' });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ================= BILL ROUTES =================
app.post('/api/bills', async (req, res) => {
  try {
    const { userId, items, directAmount, note, paidAmount, customCommission, paymentMode, date } = req.body;
    const customer = await User.findById(userId);
    if (!customer) return res.status(404).json({ error: 'Customer missing' });

    let rawBillAmount = 0;
    let totalProfit = 0;
    const billItems = [];
    const isDirect = directAmount !== undefined && Number(directAmount) > 0;

    if (isDirect) {
      rawBillAmount = Number(directAmount);
      billItems.push({
        productId: null,
        productName: note && note.trim() !== '' ? note.trim() : 'Direct Manual Bill',
        weight: 1,
        rate: rawBillAmount,
        unitType: 'Lump-sum',
        total: rawBillAmount
      });
    } else if (Array.isArray(items) && items.length > 0) {
      for (let item of items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const weight = Number(item.weight) || 0;
          const rate = Number(item.rate) || 0;
          product.stock -= weight;
          await product.save();

          const itemTotal = weight * rate;
          rawBillAmount += itemTotal;
          totalProfit += (rate - product.purchasePrice) * weight;
          billItems.push({
            productId: product._id.toString(),
            productName: product.name,
            weight,
            rate,
            unitType: product.unitType,
            total: itemTotal
          });
        }
      }
    } else {
      return res.status(400).json({ error: 'Items ya direct amount provide karein' });
    }

    const commissionAmount = Number(customCommission) || 0;
    const billAmount = rawBillAmount + commissionAmount;
    const previousBalance = customer.balance;
    const grandTotal = previousBalance + billAmount;
    const newBalance = grandTotal - (Number(paidAmount) || 0);

    customer.balance = newBalance;
    await customer.save();

    const newBill = new Bill({
      id: 'BILL-' + Date.now(),
      customerId: customer._id.toString(),
      customerName: customer.name,
      isDirectBill: isDirect,
      note: note || '',
      items: billItems,
      rawBillAmount,
      commissionAmount,
      previousBalance,
      billAmount,
      grandTotal,
      paidAmount: Number(paidAmount) || 0,
      paymentMode: paymentMode || 'Cash',
      newBalance,
      totalProfit: totalProfit + commissionAmount,
      date: date ? new Date(date) : new Date()
    });

    await newBill.save();
    res.status(201).json({ message: 'Bill saved successfully', bill: newBill });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Bill Edit (Resilient ID lookup)
app.put('/api/bills/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const { amount, directAmount, date, note } = req.body;

    let bill = await Bill.findOne({ id: targetId });
    if (!bill && mongoose.Types.ObjectId.isValid(targetId)) {
      bill = await Bill.findById(targetId);
    }
    if (!bill) return res.status(404).json({ error: 'Bill missing' });

    const customer = await User.findById(bill.customerId);
    if (!customer) return res.status(404).json({ error: 'Customer missing' });

    const newAmt = Number(directAmount !== undefined ? directAmount : amount);
    if (!isNaN(newAmt)) {
      const diff = newAmt - bill.billAmount;
      customer.balance += diff;
      await customer.save();

      bill.billAmount = newAmt;
      bill.rawBillAmount = newAmt;
      bill.newBalance = customer.balance;
    }

    if (note !== undefined) bill.note = note;
    if (date) bill.date = new Date(date);

    await bill.save();
    res.json({ message: 'Bill modified successfully', bill });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ================= DEPOSIT ROUTES =================
app.post('/api/deposits', async (req, res) => {
  try {
    const { userId, amount, type, paymentMode, date } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User missing' });

    const previousBalance = user.balance;
    const depositAmount = Number(amount) || 0;

    if (user.role === 'customer') {
      user.balance -= depositAmount;
    } else {
      user.balance += depositAmount;
    }
    await user.save();

    const deposit = new Deposit({
      userId,
      userName: user.name,
      userRole: user.role,
      amount: depositAmount,
      type: type || 'jama',
      paymentMode: paymentMode || 'Offline (Cash)',
      previousBalance,
      newBalance: user.balance,
      date: date ? new Date(date) : new Date()
    });
    await deposit.save();
    res.json({ message: 'Deposit Saved', deposit });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Deposit Edit (Resilient ID lookup: ObjectId & String)
app.put('/api/deposits/:id', async (req, res) => {
  try {
    const { amount, date, paymentMode } = req.body;
    const targetId = req.params.id;

    let deposit = null;
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      deposit = await Deposit.findById(targetId);
    }
    if (!deposit) {
      deposit = await Deposit.findOne({ id: targetId });
    }
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit record missing or not found' });
    }

    const user = await User.findById(deposit.userId);
    if (!user) {
      return res.status(404).json({ error: 'Linked user missing' });
    }

    const oldAmount = Number(deposit.amount) || 0;
    const newAmount = Number(amount) || 0;
    const diff = newAmount - oldAmount;

    if (user.role === 'customer') {
      user.balance -= diff;
    } else {
      user.balance += diff;
    }
    await user.save();

    deposit.amount = newAmount;
    if (date) deposit.date = new Date(date);
    if (paymentMode) deposit.paymentMode = paymentMode;
    deposit.newBalance = user.balance;

    await deposit.save();
    res.json({ message: 'Deposit successfully updated', deposit });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ================= TIMELINE & LEDGER ROUTES =================
app.get('/api/users/:id/timeline', async (req, res) => {
  try {
    const uid = req.params.id;
    const bills = await Bill.find({ customerId: uid });
    const deposits = await Deposit.find({ userId: uid });
    const inwards = await Inward.find({ supplierId: uid });

    let timeline = [];
    bills.forEach(b => timeline.push({
      id: b.id,
      date: b.date,
      type: b.isDirectBill ? 'Direct Bill (Kharcha/Parcha)' : 'Credit (Bikri Parcha)',
      description: b.items.map(i => i.productName).join(', '),
      amount: b.billAmount,
      cashImpact: 'Jama: Rs. ' + b.paidAmount,
      finalBalance: b.newBalance,
      rawObj: b,
      isCustomerBill: true
    }));

    inwards.forEach(i => timeline.push({
      id: i.id,
      date: i.date,
      type: 'Maal Inward (Challan)',
      description: i.productName,
      amount: i.totalCost,
      cashImpact: 'Vault Drop',
      finalBalance: '-',
      rawObj: i,
      isInwardChallan: true
    }));

    deposits.forEach(d => timeline.push({
      id: d._id ? d._id.toString() : d.id,
      date: d.date,
      type: d.type === 'jama' ? 'Cash Received (Jama)' : 'Cash Paid (Bhugtan)',
      description: d.paymentMode,
      amount: d.amount,
      cashImpact: '-',
      finalBalance: Math.abs(d.newBalance),
      rawObj: d,
      isDeposit: true
    }));

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(timeline);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ================= DASHBOARD & DEEP HISTORY =================
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
        todaySales += b.billAmount;
        todayProfit += b.totalProfit;
        todayCashReceived += b.paidAmount;
        b.items.forEach(it => {
          if (!b.isDirectBill) todayWeightSold += Number(it.weight) || 0;
          const key = it.productName;
          if (!todayItemBreakdown[key]) todayItemBreakdown[key] = { name: it.productName, unit: it.unitType || 'Kg', totalQty: 0, totalRevenue: 0 };
          todayItemBreakdown[key].totalQty += Number(it.weight) || 0;
          todayItemBreakdown[key].totalRevenue += Number(it.total) || 0;
        });
      }
    });

    res.json({
      totalSales,
      totalProfit,
      totalCashReceived,
      totalCustomerUdhaar,
      totalPartyDena,
      todaySales,
      todayProfit,
      todayCashReceived,
      todayWeightSold,
      todayItemsSoldList: Object.values(todayItemBreakdown)
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Deep History: Provides all bills & deposits for date filter drill-down modals
app.get('/api/dashboard/deep-history', async (req, res) => {
  try {
    const bills = await Bill.find();
    const deposits = await Deposit.find();
    const users = await User.find();
    res.json({
      allBills: bills,
      allDeposits: deposits,
      allUsers: users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Mandi Backend Engine live on port ${PORT}`));