import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Receipt, Package, Users, Printer, Wallet, Search, ArrowLeft, Plus, Edit3, Trash2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0, totalProfit: 0, totalCashReceived: 0, totalCustomerUdhaar: 0, totalPartyDena: 0,
    todaySales: 0, todayProfit: 0, todayCashReceived: 0, todayWeightSold: 0, todayItemsSoldList: []
  });

  const [customers, setCustomers] = useState([]);
  const [parties, setParties] = useState([]);
  const [stock, setStock] = useState([]);
  
  // Panels states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileUser, setSelectedProfileUser] = useState(null); 
  const [userTimeline, setUserTimeline] = useState([]); 
  const [isEditingMode, setIsEditingMode] = useState(false); 
  const [editingBillId, setEditingBillId] = useState(null);

  // Deep History Modal Triggers
  const [deepHistoryList, setDeepHistoryList] = useState([]);
  const [deepHistoryTitle, setDeepHistoryTitle] = useState('');
  const [showDeepHistoryModal, setShowDeepHistoryModal] = useState(false);
  const [showTodayItemsModal, setShowTodayItemsSoldModal] = useState(false); 

  // Printable states
  const [lastGeneratedBill, setLastGeneratedBill] = useState(null);
  const [lastDepositSlip, setLastDepositSlip] = useState(null); 
  const [lastInwardChallan, setLastInwardChallan] = useState(null); 

  // Fast Global billing
  const [globalBillCustomer, setGlobalBillCustomer] = useState('');
  const [globalBillItems, setGlobalBillItems] = useState([{ productId: '', weightInput: '', rate: '' }]);
  const [globalCommCash, setGlobalCommCash] = useState('0'); 
  const [globalPaidAmount, setGlobalPaidAmount] = useState('');
  const [globalPayMode, setGlobalPayMode] = useState('Offline (Cash)');

  // Profile forms
  const [profBillItems, setProfBillItems] = useState([{ productId: '', weightInput: '', rate: '' }]);
  const [profCommCash, setProfCommCash] = useState('0'); 
  const [profPaidAmount, setProfPaidAmount] = useState('');
  const [profPayMode, setProfPayMode] = useState('Offline (Cash)');
  const [profDepositAmount, setProfDepositAmount] = useState('');
  const [profDepositMode, setProfDepositMode] = useState('Offline (Cash)'); 

  // Master fields
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('customer');
  const [newUserBalance, setNewUserBalance] = useState('');

  const [newProdName, setNewProdName] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdSellingPrice, setNewProdSellingPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('Kg');
  const [newProdSupplier, setNewProdSupplier] = useState('');

  const API_URL = 'https://mandi-backend-wk26.onrender.com/api';

  // 100% SECURE DYNAMIC DATA RETRIEVAL
  const fetchData = async () => {
    try {
      try {
        const dbRes = await fetch(API_URL + '/dashboard');
        if (dbRes.ok) setDashboardData(await dbRes.json());
      } catch (e) { console.log("Dashboard fetch waiting..."); }

      const usersRes = await fetch(API_URL + '/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          setCustomers([...usersData.filter(u => u.role === 'customer')]);
          setParties([...usersData.filter(u => u.role === 'party')]);
        }
      }

      const prodRes = await fetch(API_URL + '/products');
      if (prodRes.ok) setStock(await prodRes.json());
    } catch (err) { console.error("Global Sync Error: ", err); }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const loadUserProfile = async (user) => {
    const targetId = user.id || user._id;
    setSelectedProfileUser(user);
    try {
      const res = await fetch(API_URL + '/users/' + targetId + '/timeline');
      if (res.ok) setUserTimeline(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleDeleteUser = async (userId, userName) => {
    const pinInput = prompt(`⚠️ WARNING: Secret code lock verify karein:`);
    if (pinInput === null) return;

    try {
      const res = await fetch(`${API_URL}/users/delete/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretCode: pinInput })
      });
      if (res.ok) {
        alert('Khata kamyabi se uda diya gaya!');
        setSelectedProfileUser(null);
        fetchData();
      }
    } catch (err) { alert('Network Issue!'); }
  };

  const parseMultiBoraWeight = (inputString) => {
    if (!inputString) return 0;
    return inputString.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val)).reduce((sum, current) => sum + current, 0);
  };

  const triggerDeepHistory = async (modeType) => {
    try {
      const res = await fetch(API_URL + '/dashboard/deep-history');
      if (!res.ok) return;
      const { dayBills, dayDeposits, allUsers } = await res.json();
      
      let listData = [];
      if (modeType === 'profit') {
        setDeepHistoryTitle("Aaj Ka Kul Profit Breakdown (Mandi Aadat + Margins)");
        listData = dayBills.map(b => ({ field1: b.customerName, field2: 'Bill No: ' + b.id, field3: 'Profit: Rs.' + b.totalProfit }));
      } else if (modeType === 'sales') {
        setDeepHistoryTitle("Aaj Ki Kul Bikri Records (Invoices List)");
        listData = dayBills.map(b => ({ field1: b.customerName, field2: b.items.map(i => i.productName).join(', '), field3: 'Bill Amt: Rs.' + b.billAmount }));
      } else if (modeType === 'galla') {
        setDeepHistoryTitle("Aaj Ka Galla Recovery Cash Collection Summary");
        const fromBills = dayBills.filter(b => b.paidAmount > 0).map(b => ({ field1: b.customerName + ' (Counter Jama)', field2: 'Bill Payment - ' + b.paymentMode, field3: 'Rs.' + b.paidAmount }));
        const fromDeposits = dayDeposits.map(d => ({ field1: d.userName, field2: d.type === 'jama' ? 'Customer Entry (' + d.paymentMode + ')' : 'Supplier Paid Out (' + d.paymentMode + ')', field3: 'Rs.' + d.amount }));
        listData = [...fromBills, ...fromDeposits];
      } else if (modeType === 'udhaar') {
        setDeepHistoryTitle("Market Outstanding (Grahak Udhaar Summary List)");
        listData = allUsers.filter(u => u.role === 'customer' && u.balance > 0).map(u => ({ field1: u.name, field2: 'Mobile: ' + u.phone, field3: 'Udhaar: Rs.' + u.balance }));
      } else if (modeType === 'supplier_dena') {
        setDeepHistoryTitle("Kisaan / Supplier Outstanding (Kisko Kitna Paisa Dena Hai)");
        listData = allUsers.filter(u => u.role === 'party' && u.balance < 0).map(u => ({ field1: u.name, field2: 'Party Supplier | Mob: ' + u.phone, field3: 'Net Dena: Rs.' + Math.abs(u.balance) }));
      }
      
      setDeepHistoryList(listData);
      setShowDeepHistoryModal(true);
    } catch (err) { }
  };

  const startBillEdit = (bill) => {
    setIsEditingMode(true);
    setEditingBillId(bill.id);
    setProfCommCash(bill.commissionAmount.toString());
    setProfPaidAmount(bill.paidAmount.toString());
    setProfPayMode(bill.paymentMode);
    setProfBillItems(bill.items.map(i => ({ productId: (i.productId || i._id), weightInput: i.weight.toString(), rate: i.rate.toString() })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCustomerBill = async () => {
    const targetUrl = isEditingMode ? API_URL + '/bills/' + editingBillId : API_URL + '/bills';
    const targetMethod = isEditingMode ? 'PUT' : 'POST';
    const targetUserId = selectedProfileUser.id || selectedProfileUser._id;
    const processedItems = profBillItems.map(item => ({ productId: item.productId, weight: parseMultiBoraWeight(item.weightInput), rate: Number(item.rate) || 0 }));
    
    try {
      const res = await fetch(targetUrl, { method: targetMethod, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: targetUserId, items: processedItems, paidAmount: Number(profPaidAmount) || 0, customCommission: Number(profCommCash), paymentMode: profPayMode }) });
      const data = await res.json();
      if (res.ok) { 
        setLastGeneratedBill(data.bill); 
        setProfBillItems([{ productId: '', weightInput: '', rate: '' }]); 
        setProfCommCash('0'); 
        setProfPaidAmount(''); 
        setIsEditingMode(false); 
        await fetchData(); 
        if (selectedProfileUser) loadUserProfile(selectedProfileUser); 
      }
    } catch (err) { }
  };

  const handleGlobalCreateBill = async () => {
    if (!globalBillCustomer || !globalBillItems[0].productId) return alert('Details bharein!');
    const processedItems = globalBillItems.map(item => ({ productId: item.productId, weight: parseMultiBoraWeight(item.weightInput), rate: Number(item.rate) || 0 }));
    try {
      const res = await fetch(API_URL + '/bills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: globalBillCustomer, items: processedItems, paidAmount: Number(globalPaidAmount) || 0, customCommission: Number(globalCommCash), paymentMode: globalPayMode }) });
      const data = await res.json();
      if (res.ok) { setLastGeneratedBill(data.bill); setGlobalBillCustomer(''); setGlobalBillItems([{ productId: '', weightInput: '', rate: '' }]); setGlobalCommCash('0'); setGlobalPaidAmount(''); fetchData(); }
    } catch (err) { }
  };

  const handleProfileDeposit = async (e) => {
    e.preventDefault();
    const targetUserId = selectedProfileUser.id || selectedProfileUser._id;
    try {
      const res = await fetch(API_URL + '/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: targetUserId, amount: profDepositAmount, type: 'jama', paymentMode: profDepositMode }) });
      const data = await res.json();
      if (res.ok) { setLastDepositSlip(data.deposit); setProfDepositAmount(''); await fetchData(); if (selectedProfileUser) loadUserProfile(selectedProfileUser); }
    } catch (err) { }
  };

  const handleMasterAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    try {
      const res = await fetch(API_URL + '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName, phone: newUserPhone || 'N/A', role: newUserRole, initialBalance: Number(newUserBalance) || 0 })
      });
      if (res.ok) { 
        alert('Khata khul gaya safaltapoorvak!'); 
        setNewUserName(''); 
        setNewUserPhone(''); 
        setNewUserBalance(''); 
        await fetchData(); 
      }
    } catch (err) { alert('Server network unreachable! Check console.'); }
  };

  const handleMasterAddStock = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API_URL + '/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newProdName, stock: newProdStock, purchasePrice: newProdPrice, sellingPrice: newProdSellingPrice, unitType: newProdUnit, supplierId: newProdSupplier }) });
      const data = await res.json();
      if (res.ok) { setLastInwardChallan(data.inward); setNewProdName(''); setNewProdStock(''); setNewProdPrice(''); setNewProdSellingPrice(''); fetchData(); }
    } catch (err) { }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredParties = parties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-gray-800">
      
      <style>{`
        @media print {
          body, .min-h-screen { bg-color: white !important; color: black !important; }
          .print\\:hidden, nav, sidebar, button, .print-hidden-element { display: none !important; }
          .print-container-receipt { border: none !important; shadow: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; position: absolute; top: 0; left: 0; }
        }
      `}</style>

      {/* SIDEBAR */}
      <div className="w-full md:w-64 bg-green-800 text-white flex flex-col p-5 shadow-lg print:hidden">
        <h2 className="text-xl font-bold text-center border-b border-green-700 pb-2">Samim And Sons</h2>
        <p className="text-center text-xs text-green-200 mb-6">9955494854, 7488376554</p>
        <nav className="flex flex-col gap-2 flex-1">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedProfileUser(null); setShowTodayItemsSoldModal(false); setShowDeepHistoryModal(false); }} className="flex items-center gap-3 p-3 rounded-lg text-left w-full hover:bg-green-700">
            <LayoutDashboard size={18} /> Mandi Dashboard
          </button>
          <button onClick={() => { setActiveTab('customers'); setSelectedProfileUser(null); }} className="flex items-center gap-3 p-3 rounded-lg text-left w-full hover:bg-green-700">
            <Users size={18} /> Customers Ledger
          </button>
          <button onClick={() => { setActiveTab('parties'); setSelectedProfileUser(null); }} className="flex items-center gap-3 p-3 rounded-lg text-left w-full hover:bg-green-700">
            <Users size={18} /> Parties / Suppliers
          </button>
          <button onClick={() => { setActiveTab('stock'); setSelectedProfileUser(null); }} className="flex items-center gap-3 p-3 rounded-lg text-left w-full hover:bg-green-700">
            <Package size={18} /> Mandi Live Stock
          </button>
        </nav>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 p-6 md:p-8 print:p-0">
        
        {/* PARCHA OVERLAYS */}
        {lastGeneratedBill && (
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md mx-auto border-2 border-green-600 mb-6 print-container-receipt">
            <div className="text-center border-b pb-2 mb-4">
              <h2 className="text-xl font-bold uppercase text-green-800">Samim And Sons</h2>
              <p className="text-xs text-gray-500">Vegetable Trading Company | Mob: 9955494854</p>
            </div>
            <p className="text-sm mb-2"><strong>Grahak:</strong> {lastGeneratedBill.customerName}</p>
            <table className="w-full text-xs text-left mb-3 border-b">
              <thead><tr className="bg-gray-100 font-bold"><th className="p-1">Item</th><th className="p-1 text-center">Wazan</th><th className="p-1 text-right">Rate</th><th className="p-1 text-right">Total</th></tr></thead>
              <tbody>
                {lastGeneratedBill.items.map((it, i) => (
                  <tr key={i} className="border-b"><td className="p-1">{it.productName}</td><td className="p-1 text-center font-bold">{it.weight} {it.unitType}</td><td className="p-1 text-right">Rs. {it.rate}</td><td className="p-1 text-right">Rs. {it.total}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-xs space-y-1">
              <p>Maal Amount: Rs. {lastGeneratedBill.rawBillAmount}</p>
              <p className="text-green-700 font-bold">Mandi Commission Amount: +Rs. {lastGeneratedBill.commissionAmount}</p>
              <p>Purana Baaki Khata: Rs. {lastGeneratedBill.previousBalance}</p>
              <p className="font-extrabold text-sm border-t pt-1 text-gray-900">Grand Total: Rs. {lastGeneratedBill.grandTotal}</p>
              <p className="text-blue-700 font-bold">Jama Payment ({lastGeneratedBill.paymentMode}): -Rs. {lastGeneratedBill.paidAmount}</p>
              <p className="text-base font-black text-red-600 border-t-2 border-double pt-1">Naya Balance Baaki: Rs. {lastGeneratedBill.newBalance}</p>
            </div>
            <div className="mt-4 flex gap-2 print:hidden"><button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white p-2 rounded font-bold">Print Parcha</button><button onClick={() => setLastGeneratedBill(null)} className="bg-gray-200 p-2 rounded font-bold">Close</button></div>
          </div>
        )}

        {lastDepositSlip && (
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm mx-auto border border-green-300 mb-6 print-container-receipt">
            <div className="text-center border-b pb-2 mb-4">
              <h2 className="text-lg font-bold uppercase text-green-800">Samim And Sons</h2>
              <p className="text-xs text-gray-500">Mandi Cash Galla Receipt</p>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {lastDepositSlip.userName}</p>
              <p><strong>Payment Mode:</strong> {lastDepositSlip.paymentMode}</p>
              <p className="text-lg font-bold bg-green-5 p-2 rounded">Amount: Rs. {lastDepositSlip.amount}</p>
              <p className="text-sm font-bold">Closing Balance: Rs. {Math.abs(lastDepositSlip.newBalance)}</p>
            </div>
            <div className="mt-4 flex gap-2 print:hidden"><button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white p-2 rounded font-bold">Print Receipt</button><button onClick={() => setLastDepositSlip(null)} className="bg-gray-200 p-2 rounded font-bold">Close</button></div>
          </div>
        )}

        {lastInwardChallan && (
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md mx-auto border-2 border-amber-600 mb-6 print-container-receipt">
            <div className="text-center border-b pb-2 mb-4">
              <h2 className="text-xl font-bold uppercase text-amber-800">Samim And Sons</h2>
              <p className="text-xs text-gray-600">Kisaan/Supplier Stock Inward Challan</p>
            </div>
            <p className="text-sm mb-2"><strong>Kisaan/Supplier Name:</strong> {lastInwardChallan.supplierName}</p>
            <table className="w-full text-xs text-left mb-4 border-b">
              <thead><tr className="bg-gray-100 font-bold"><th className="p-2">Sabji Item</th><th className="p-2 text-center">Quantity</th><th className="p-2 text-right">Khareed Bhav</th><th className="p-2 text-right">Total Credit</th></tr></thead>
              <tbody>
                <tr className="font-semibold">
                  <td className="p-2 uppercase">{lastInwardChallan.productName}</td>
                  <td className="p-2 text-center text-blue-700">{lastInwardChallan.quantity} {lastInwardChallan.unitType}</td>
                  <td className="p-2 text-right">Rs. {lastInwardChallan.purchasePrice}</td>
                  <td className="p-2 text-right text-green-700 font-bold">Rs. {lastInwardChallan.totalCost}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 flex gap-2 print:hidden"><button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white p-2 rounded font-bold">Print Challan Slip</button><button onClick={() => setLastInwardChallan(null)} className="bg-gray-200 p-2 rounded font-bold">Close</button></div>
          </div>
        )}

        {/* MAIN PANEL CONTENT */}
        {!lastGeneratedBill && !lastDepositSlip && !lastInwardChallan && (
          <div className="print:hidden">
            
            {/* PROFILE 360 DASHBOARD VIEW */}
            {selectedProfileUser ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border">
                  <button onClick={() => { setSelectedProfileUser(null); setIsEditingMode(false); }} className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">
                    <ArrowLeft size={16} /> Back To Main List
                  </button>

                  <button 
                    onClick={() => handleDeleteUser((selectedProfileUser.id || selectedProfileUser._id), selectedProfileUser.name)}
                    className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition"
                  >
                    <Trash2 size={16} /> Delete Account 🔒
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">{selectedProfileUser.name}</h2>
                    <p className="text-sm text-gray-500">Mob: {selectedProfileUser.phone || 'N/A'}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${selectedProfileUser.role === 'customer' ? 'bg-green-600':'bg-amber-600'}`}>
                      {selectedProfileUser.role === 'customer' ? 'Grahak / Customer':'Kisaan / Supplier'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase">Outstanding Ledger</p>
                    <p className="text-2xl font-black text-red-600">Rs. {Math.abs(selectedProfileUser.balance)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Billing Form For Customer WITH Commission box */}
                  {selectedProfileUser.role === 'customer' && (
                    <div className="bg-white p-6 rounded-2xl border">
                      <h3 className="text-base font-bold mb-3 border-b pb-1 text-blue-900">🧾 Instant Parcha Billing</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Mandi Commission (Add Rs.)</label>
                            <input type="number" className="w-full p-2 border rounded-lg bg-yellow-50 font-black text-gray-950" placeholder="Rs. Commission" value={profCommCash} onChange={(e) => setProfCommCash(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">Payment Channel</label>
                            <select className="w-full p-2 border rounded-lg text-xs font-bold" value={profPayMode} onChange={(e) => setProfPayMode(e.target.value)}><option value="Offline (Cash)">Cash Desk</option><option value="Online (UPI/PhonePe)">Online Mode</option></select>
                          </div>
                        </div>
                        {profBillItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <select className="flex-1 p-2 border rounded text-xs" value={item.productId} onChange={(e) => { const n=[...profBillItems]; n[idx].productId=e.target.value; const m=stock.find(s=>(s.id || s._id)===e.target.value); if(m)n[idx].rate=m.sellingPrice; setProfBillItems(n); }}><option value="">-- Sabji --</option>{stock.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.stock} left)</option>)}</select>
                            <input type="text" placeholder="30,35,40 support" className="w-28 p-2 border rounded text-xs font-bold" value={item.weightInput} onChange={(e) => { const n = [...profBillItems]; n[idx].weightInput = e.target.value; setProfBillItems(n); }} />
                            <input type="number" placeholder="Rate" className="w-16 p-2 border rounded text-xs font-bold" value={item.rate} onChange={(e) => { const n = [...profBillItems]; n[idx].rate = e.target.value; setProfBillItems(n); }} />
                          </div>
                        ))}
                        <button onClick={() => setProfBillItems([...profBillItems, { productId: '', weightInput: '', rate: '' }])} className="text-xs font-bold text-blue-600">+ Add Multi-Bora Row</button>
                        <input type="number" placeholder="Counter Cash Received (Rs.)" className="w-full p-2 border rounded bg-green-50 font-bold" value={profPaidAmount} onChange={(e) => setProfPaidAmount(e.target.value)} />
                        <button onClick={handleSaveCustomerBill} className="w-full bg-green-700 text-white p-2 rounded font-bold">Cut Bill Invoice 🚀</button>
                      </div>
                    </div>
                  )}

                  {/* Cash Counter Entry form */}
                  <div className="bg-white p-6 rounded-2xl border flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold mb-3 border-b pb-1">💰 Galla Entry Desk</h3>
                      <form onSubmit={handleProfileDeposit} className="space-y-4">
                        <input type="number" required placeholder="Amount (Rs.)" className="w-full p-2 border rounded bg-green-50 font-bold" value={profDepositAmount} onChange={(e) => setProfDepositAmount(e.target.value)} />
                        <select className="w-full p-2 border rounded text-xs" value={profDepositMode} onChange={(e) => setProfDepositMode(e.target.value)}><option value="Offline (Cash)">Offline Cash</option><option value="Online (PhonePe/UPI)">Online UPI</option></select>
                        <button type="submit" className="w-full bg-gray-900 text-white p-2 rounded font-bold">Save Cash Deposit</button>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Profile history timeline ledger data records */}
                <div className="bg-white p-4 rounded-2xl border">
                  <h3 className="font-bold text-gray-800 mb-2">Detailed Khata Ledger Record History</h3>
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-gray-50 font-bold"><th>Date/Time</th><th>Type</th><th>Particulars</th><th className="text-right">Amount</th><th>Status</th><th className="text-center">Action</th></tr></thead>
                    <tbody className="divide-y">
                      {userTimeline.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 font-medium">
                          <td>{new Date(item.date).toLocaleString()}</td>
                          <td className="font-bold">{item.type}</td>
                          <td>{item.description}</td>
                          <td className="text-right font-bold text-gray-900">Rs. {item.amount}</td>
                          <td>{item.cashImpact}</td>
                          <td className="text-center flex justify-center gap-1">
                            {item.isCustomerBill && <button onClick={() => startBillEdit(item.rawObj)} className="bg-orange-50 text-orange-600 p-1 rounded"><Edit3 size={12} /></button>}
                            <button onClick={() => { 
                              if(item.isCustomerBill) setLastGeneratedBill(item.rawObj); 
                              if(item.isInwardChallan) setLastInwardChallan(item.rawObj); 
                              if(item.isDeposit) setLastDepositSlip(item.rawObj); 
                            }} className="bg-blue-50 text-blue-600 p-1 rounded"><Printer size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* GLOBAL DIRECTORIES PANEL VIEW AREA */
              <div>
                {/* INTERACTIVE CARDS HISTORY LIST POPUP DOCK MODAL */}
                {showDeepHistoryModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="text-base font-black text-green-900">{deepHistoryTitle}</h4>
                        <button onClick={() => setShowDeepHistoryModal(false)} className="text-gray-400 font-bold text-lg hover:text-black">✕</button>
                      </div>
                      <div className="overflow-y-auto max-h-72 divide-y text-xs font-semibold">
                        {deepHistoryList.map((item, index) => (
                          <div key={index} className="py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded">
                            <div><p className="text-gray-900 font-bold uppercase">{item.field1}</p><p className="text-gray-400 text-[10px]">{item.field2}</p></div>
                            <span className="font-extrabold text-gray-900">{item.field3}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TODAY TOTAL WEIGHT BROKED MODAL */}
                {showTodayItemsModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="text-base font-bold text-green-900">🥦 Aaj Ka Sabji Bikri Breakdown</h4>
                        <button onClick={() => setShowTodayItemsSoldModal(false)} className="text-gray-400 font-bold text-lg hover:text-black">✕</button>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead><tr className="bg-gray-100 font-bold text-gray-600"><th>Sabji Naam</th><th className="text-center">Qty sold</th><th className="text-right">Collection</th></tr></thead>
                        <tbody>
                          {dashboardData.todayItemsSoldList?.map((item, index) => (
                            <tr key={index} className="font-semibold border-b"><td className="p-2 uppercase">{item.name}</td><td className="p-2 text-center text-blue-700">{item.totalQty} {item.unit}</td><td className="p-2 text-right font-black">Rs. {item.totalRevenue}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="bg-white p-3 rounded-xl border mb-6 flex items-center gap-3">
                  <Search className="text-gray-400" size={18} />
                  <input type="text" placeholder="🔍 Grahak ya Kisaan ka naam search karein..." className="w-full focus:outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                {searchQuery && (
                  <div className="bg-white p-4 border rounded-xl shadow mb-6 space-y-1">
                    {filteredCustomers.map(c => <div key={c.id || c._id} onClick={() => { loadUserProfile(c); setSearchQuery(''); }} className="p-2 hover:bg-green-5 cursor-pointer rounded flex justify-between"><span>{c.name} (Khareedar)</span><span className="font-bold text-red-600">Rs. {c.balance}</span></div>)}
                    {filteredParties.map(p => <div key={p.id || p._id} onClick={() => { loadUserProfile(p); setSearchQuery(''); }} className="p-2 hover:bg-amber-50 cursor-pointer rounded flex justify-between"><span>{p.name} (Party)</span><span className="font-bold text-amber-600">Rs. {Math.abs(p.balance)}</span></div>)}
                  </div>
                )}

                {/* Dashboard Tab rendering units layout */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border">
                      <div>
                        <h2 className="text-xl font-bold text-green-950 uppercase">Samim And Sons vegetable trading</h2>
                        <p className="text-xs text-gray-500">Mandi Live Ledger Panel System</p>
                      </div>
                      <button onClick={() => setActiveTab('global-billing-tab')} className="bg-green-700 hover:bg-green-900 text-white font-bold p-3 rounded-xl flex items-center gap-2 shadow"><Receipt size={16} /> Naya Parcha / Billing (+)</button>
                    </div>

                    {/* TODAY'S STATS BOX CARDS BLOCK */}
                    <div className="bg-gradient-to-r from-green-900 to-green-700 p-6 rounded-2xl text-white shadow-md">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-green-200 mb-4">📈 Aaj Ka Mandi Vyapaar Hisab</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div onClick={() => triggerDeepHistory('profit')} className="bg-white/10 p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/20 transition transform hover:scale-105 shadow-sm">
                          <p className="text-xs text-green-100 font-semibold">Aaj Ka Kul Munafa (Net Profit) 💰</p>
                          <p className="text-2xl font-black mt-1">Rs. {dashboardData.todayProfit}</p>
                        </div>
                        <div onClick={() => triggerDeepHistory('sales')} className="bg-white/10 p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/20 transition transform hover:scale-105 shadow-sm">
                          <p className="text-xs text-green-100 font-semibold">Aaj Ki Kul Bikri (Today Sales)</p>
                          <p className="text-2xl font-black mt-1">Rs. {dashboardData.todaySales}</p>
                        </div>
                        <div onClick={() => triggerDeepHistory('galla')} className="bg-white/10 p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/20 transition transform hover:scale-105 shadow-sm">
                          <p className="text-xs text-green-100 font-semibold">Aaj Ka Galla Cash Collection</p>
                          <p className="text-2xl font-black mt-1 text-yellow-300">Rs. {dashboardData.todayCashReceived}</p>
                        </div>
                        <div onClick={() => setShowTodayItemsSoldModal(true)} className="bg-white/20 p-4 rounded-xl border-2 border-dashed border-white/40 cursor-pointer hover:bg-white/30 transition transform hover:scale-105">
                          <p className="text-xs text-yellow-200 font-bold flex items-center gap-1">👉 Aaj Kitna Maal Bika (Click)</p>
                          <p className="text-2xl font-black mt-1 text-white">{dashboardData.todayWeightSold} Units</p>
                        </div>
                      </div>
                    </div>

                    {/* GLOBAL TIME TOTAL ACCUMULATED RECORDS SUMMARY */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">💼 Global Ledger Accounts (All-Time Summary)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border"><p className="text-xs font-bold text-gray-400">TOTAL BIKRI</p><p className="text-xl font-black mt-1">Rs. {dashboardData.totalSales}</p></div>
                        <div className="bg-white p-5 rounded-xl border"><p className="text-xs font-bold text-gray-400">TOTAL MUNAFA</p><p className="text-xl font-black mt-1 text-green-700">Rs. {dashboardData.totalProfit}</p></div>
                        <div className="bg-white p-5 rounded-xl border"><p className="text-xs font-bold text-gray-400">TOTAL CASH RECEIVED</p><p className="text-xl font-black mt-1">Rs. {dashboardData.totalCashReceived}</p></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div onClick={() => triggerDeepHistory('udhaar')} className="bg-red-50 p-5 rounded-xl border border-red-200 cursor-pointer hover:bg-red-100 transition transform hover:scale-[1.02] shadow-sm">
                          <p className="text-xs font-bold text-red-800 uppercase flex items-center gap-1">👉 BAZAAR MEIN TOTAL UDHAAR (Click to View List)</p>
                          <p className="text-2xl font-black text-red-700 mt-1">Rs. {dashboardData.totalCustomerUdhaar}</p>
                        </div>
                        <div onClick={() => triggerDeepHistory('supplier_dena')} className="bg-amber-50 p-5 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100 transition transform hover:scale-[1.02] shadow-sm">
                          <p className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">👉 KISAAN / PARTY KO KITNA PAISA DENA HAI (Click to View List)</p>
                          <p className="text-2xl font-black text-amber-700 mt-1">Rs. {dashboardData.totalPartyDena}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TODAY TOTAL INVOICE GEN TAB */}
                {activeTab === 'global-billing-tab' && (
                  <div className="bg-white p-6 rounded-xl border shadow max-w-3xl mx-auto">
                    <h3 className="text-lg font-bold mb-4 border-b pb-2">🧾 Mandi Vyapaar Fast Invoice Generator</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-bold mb-1">Grahak Chunein</label>
                        <select className="w-full p-2 border rounded-lg text-sm bg-gray-50" value={globalBillCustomer} onChange={(e) => setGlobalBillCustomer(e.target.value)}>
                          <option value="">-- Customer Name --</option>
                          {customers.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name} (Purana Baaki: Rs.{c.balance})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-1">Mandi Commission Cash Add</label>
                        <input type="number" className="w-full p-2 border rounded-lg bg-yellow-50 font-bold" value={globalCommCash} onChange={(e) => setGlobalCommCash(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-1">Channel Mode</label>
                        <select className="w-full p-2 border rounded-lg" value={globalPayMode} onChange={(e) => setGlobalPayMode(e.target.value)}><option value="Offline (Cash)">Offline Cash</option><option value="Online (UPI/PhonePe)">Online UPI</option></select>
                      </div>
                    </div>
                    {globalBillItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 mb-2 items-center">
                        <select className="flex-1 p-2 border rounded text-sm" value={item.productId} onChange={(e) => { const n=[...globalBillItems]; n[idx].productId=e.target.value; const m=stock.find(s=>(s.id || s._id)===e.target.value); if(m)n[idx].rate=m.sellingPrice; setGlobalBillItems(n); }}><option value="">-- Select Sabji --</option>{stock.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}</select>
                        <input type="text" placeholder="30,35,40 support" className="w-36 p-2 border rounded text-sm font-bold" value={item.weightInput} onChange={(e) => { const n = [...globalBillItems]; n[idx].weightInput = e.target.value; setGlobalBillItems(n); }} />
                        <input type="number" placeholder="Rate" className="w-20 p-2 border rounded text-sm bg-yellow-50 font-bold" value={item.rate} onChange={(e) => { const n = [...globalBillItems]; n[idx].rate = e.target.value; setGlobalBillItems(n); }} />
                      </div>
                    ))}
                    <button onClick={() => setGlobalBillItems([...globalBillItems, { productId: '', weightInput: '', rate: '' }])} className="text-xs font-bold text-blue-600 mb-3">+ Add Row</button>
                    <input type="number" placeholder="Counter Cash Received (Rs.)" className="w-full p-2 border rounded bg-green-50 font-black mb-3" value={globalPaidAmount} onChange={(e) => setGlobalPaidAmount(e.target.value)} />
                    <div className="flex gap-2"><button onClick={handleGlobalCreateBill} className="flex-1 bg-green-800 text-white p-3 rounded-lg font-bold">Generate Invoice 🚀</button><button onClick={() => setActiveTab('dashboard')} className="bg-gray-200 p-3 rounded-lg font-bold">Cancel</button></div>
                  </div>
                )}

                {/* DIRECTORIES SECTIONS */}
                {activeTab === 'customers' && (
                  <div className="space-y-4">
                    <form onSubmit={handleMasterAddUser} className="bg-white p-4 rounded-xl border grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <input type="text" placeholder="Grahak Naam" className="p-2 border rounded text-sm" value={newUserName} onChange={(e) => { setNewUserName(e.target.value); setNewUserRole('customer'); }} required />
                      <input type="text" placeholder="Phone" className="p-2 border rounded text-sm" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} />
                      <input type="number" placeholder="Opening Udhaar" className="p-2 border rounded text-sm" value={newUserBalance} onChange={(e) => setNewUserBalance(e.target.value)} />
                      <button type="submit" className="bg-green-700 text-white p-2 rounded font-bold text-sm">Open Account</button>
                    </form>
                    <div className="bg-white p-4 rounded-xl border">
                      <h3 className="font-bold mb-2">Khareedar List (Click profile to open or delete)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customers.map((c, i) => (
                          <div key={c.id || c._id} onClick={() => loadUserProfile(c)} className="p-3 border rounded-lg flex justify-between cursor-pointer hover:bg-green-50 transition">
                            <span>{i+1}. <strong>{c.name}</strong></span>
                            <span className="font-bold text-red-600">Rs. {c.balance}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'parties' && (
                  <div className="space-y-4">
                    <form onSubmit={handleMasterAddUser} className="bg-white p-4 rounded-xl border grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <input type="text" placeholder="Supplier Naam" className="p-2 border rounded text-sm" value={newUserName} onChange={(e) => { setNewUserName(e.target.value); setNewUserRole('party'); }} required />
                      <input type="text" placeholder="Phone" className="p-2 border rounded text-sm" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} />
                      <input type="number" placeholder="Purana Rakam (-)" className="p-2 border rounded text-sm" value={newUserBalance} onChange={(e) => setNewUserBalance(e.target.value)} />
                      <button type="submit" className="bg-amber-600 text-white p-2 rounded font-bold text-sm">Add Party</button>
                    </form>
                    <div className="bg-white p-4 rounded-xl border">
                      <h3 className="font-bold mb-2">Supplier List (Click profile to open or delete)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {parties.map((p, i) => (
                          <div key={p.id || p._id} onClick={() => loadUserProfile(p)} className="p-3 border rounded-lg flex justify-between cursor-pointer hover:bg-amber-50 transition">
                            <span>{i+1}. <strong>{p.name}</strong></span>
                            <span className="font-bold text-amber-600">Rs. {Math.abs(p.balance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'stock' && (
                  <div className="space-y-4">
                    <form onSubmit={handleMasterAddStock} className="bg-white p-4 rounded-xl border grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                      <input type="text" placeholder="Sabji Naam" className="p-2 border rounded text-xs" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} required />
                      <select className="p-2 border rounded text-xs" value={newProdUnit} onChange={(e) => setNewProdUnit(e.target.value)}><option value="Kg">Kg Wise</option><option value="Krate">Krate Wise</option><option value="Piece">Piece Wise</option><option value="Packet">Packet Wise</option></select>
                      <input type="number" placeholder="Qty" className="p-2 border rounded text-xs" value={newProdStock} onChange={(e) => setNewProdStock(e.target.value)} required />
                      <input type="number" placeholder="Purchase Rate" className="p-2 border rounded text-xs" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} required />
                      <input type="number" placeholder="Selling Rate" className="p-2 border rounded text-xs" value={newProdSellingPrice} onChange={(e) => setNewProdSellingPrice(e.target.value)} required />
                      <select className="p-2 border rounded text-xs bg-amber-50" value={newProdSupplier} onChange={(e) => setNewProdSupplier(e.target.value)} required><option value="">-- Select Supplier --</option>{parties.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}</select>
                      <button type="submit" className="bg-blue-600 text-white p-2 rounded text-xs font-bold">Unload Stock</button>
                    </form>
                    <div className="bg-white p-4 rounded-xl border">
                      <table className="w-full text-left text-xs">
                        <thead><tr className="bg-gray-100 font-bold"><th>Sabji Item</th><th>Live Stock Vault</th><th>Khareed Bhav</th><th>Selling Rate</th></tr></thead>
                        <tbody>{stock.map(s => <tr key={s.id || s._id}><td className="p-2 font-bold uppercase">{s.name}</td><td className="p-2 text-blue-600 font-black">{s.stock} {s.unitType}</td><td className="p-2">Rs. {s.purchasePrice}/{s.unitType}</td><td className="p-2 font-black text-green-700">Rs. {s.sellingPrice}/{s.unitType}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}