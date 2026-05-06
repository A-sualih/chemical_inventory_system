const Supplier = require('../../models/Supplier');
const PurchaseOrder = require('../../models/PurchaseOrder');
const { logAudit } = require('../../middleware/authMiddleware');

// === SUPPLIER MANAGEMENT ===

exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'supplier',
      targetId: supplier._id,
      targetName: supplier.name,
      details: `Created new supplier: ${supplier.name}`
    });
    
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    
    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'supplier',
      targetId: supplier._id,
      targetName: supplier.name,
      details: `Updated supplier details for ${supplier.name}`
    });

    res.json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// === PURCHASE ORDER MANAGEMENT ===

exports.getPurchaseOrders = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate('supplier_id', 'name contact_email')
      .populate('ordered_by', 'name')
      .populate('approved_by', 'name')
      .sort({ createdAt: -1 });
    res.json(pos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    // Generate PO Number
    const count = await PurchaseOrder.countDocuments();
    const po_number = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    
    const poData = {
      ...req.body,
      po_number,
      ordered_by: req.user.id,
      order_date: new Date()
    };
    
    const po = new PurchaseOrder(poData);
    await po.save();
    
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'purchase_order',
      targetId: po._id,
      targetName: po.po_number,
      details: `Created Purchase Order ${po.po_number}`
    });
    
    res.status(201).json(po);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const po = await PurchaseOrder.findById(req.params.id).populate('supplier_id');
    if (!po) return res.status(404).json({ error: 'PO not found' });
    
    const oldStatus = po.status;
    po.status = status;
    if (notes) po.notes = (po.notes ? po.notes + '\n' : '') + `${new Date().toLocaleDateString()}: ${notes}`;
    
    // Auto-fill dates based on status
    if (status === 'Approved') po.approved_by = req.user.id;
    if (status === 'Received') po.actual_delivery = new Date();
    
    await po.save();

    // If Received, update Supplier performance
    if (status === 'Received' && po.expected_delivery && po.actual_delivery && po.order_date) {
        const supplier = await Supplier.findById(po.supplier_id._id);
        if (supplier) {
            supplier.total_orders_fulfilled += 1;
            
            // Calculate lead time
            const leadTimeMs = po.actual_delivery - po.order_date;
            const leadTimeDays = Math.ceil(leadTimeMs / (1000 * 60 * 60 * 24));
            
            // Running average
            const currentTotalLead = supplier.average_lead_time_days * (supplier.total_orders_fulfilled - 1);
            supplier.average_lead_time_days = Math.round((currentTotalLead + leadTimeDays) / supplier.total_orders_fulfilled);
            
            // On Time Delivery Rate
            const wasOnTime = po.actual_delivery <= po.expected_delivery;
            const currentOnTimeCount = (supplier.on_time_delivery_rate / 100) * (supplier.total_orders_fulfilled - 1);
            const newOnTimeCount = currentOnTimeCount + (wasOnTime ? 1 : 0);
            supplier.on_time_delivery_rate = Math.round((newOnTimeCount / supplier.total_orders_fulfilled) * 100);
            
            await supplier.save();
        }
    }

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'purchase_order',
      targetId: po._id,
      targetName: po.po_number,
      details: `Updated PO ${po.po_number} status from ${oldStatus} to ${status}`
    });

    res.json(po);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
