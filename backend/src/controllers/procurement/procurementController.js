const mongoose = require('mongoose');
const Supplier = require('../../models/Supplier');
const PurchaseOrder = require('../../models/PurchaseOrder');
const VendorPerformance = require('../../models/VendorPerformance');
const ShipmentTracking = require('../../models/ShipmentTracking');
const ProcurementLog = require('../../models/ProcurementLog');

// ─── Helper ────────────────────────────────────────────────────────────────
const logAction = async ({ entityType, entityId, entityName, action, req, details, changes }) => {
  try {
    await ProcurementLog.create({
      entity_type: entityType,
      lab: req.activeLabId,
      entity_id: entityId,
      entity_name: entityName,
      action,
      performed_by: req.user?.id,
      performed_by_name: req.user?.name || req.user?.email,
      role: req.user?.role,
      details,
      changes,
      ip_address: req.ip
    });
  } catch (e) { /* non-blocking */ }
};

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

exports.getSuppliers = async (req, res) => {
  try {
    const { search, status, category, page = 1, limit = 20, sort = 'name' } = req.query;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = { is_deleted: false, ...labQuery };

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { contact_email: { $regex: search, $options: 'i' } },
        { supplier_id: { $regex: search, $options: 'i' } }
      ];
    }

    const sortMap = {
      name: { name: 1 },
      rating: { rating: -1 },
      reliability: { reliability_score: -1 },
      newest: { createdAt: -1 },
      spending: { total_spending: -1 }
    };

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query)
      .sort(sortMap[sort] || { name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ suppliers, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers', details: err.message });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const supplier = await Supplier.findOne({ _id: req.params.id, ...labQuery, is_deleted: false });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    // Fetch last 5 orders for this supplier
    const recentOrders = await PurchaseOrder.find({ supplier_id: req.params.id, ...labQuery, is_deleted: false })
      .sort({ createdAt: -1 }).limit(5)
      .populate('requested_by', 'name');

    // Fetch last 5 performance reviews
    const reviews = await VendorPerformance.find({ supplier_id: req.params.id, ...labQuery })
      .sort({ review_date: -1 }).limit(5)
      .populate('reviewed_by', 'name');

    res.json({ supplier, recentOrders, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const supplier = new Supplier({ ...req.body, lab: req.activeLabId });
    await supplier.save();
    await logAction({ entityType: 'Supplier', entityId: supplier._id, entityName: supplier.name, action: 'CREATED', req, details: `New supplier "${supplier.name}" added` });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, ...labQuery, is_deleted: false },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    await logAction({ entityType: 'Supplier', entityId: supplier._id, entityName: supplier.name, action: 'UPDATED', req, details: `Updated supplier "${supplier.name}"` });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, ...labQuery },
      { is_deleted: true, deleted_at: new Date() },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    await logAction({ entityType: 'Supplier', entityId: supplier._id, entityName: supplier.name, action: 'DELETED', req, details: `Soft-deleted supplier "${supplier.name}"` });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.blacklistSupplier = async (req, res) => {
  try {
    const { reason } = req.body;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, ...labQuery },
      { status: 'Blacklisted', notes: `BLACKLISTED: ${reason}` },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    await logAction({ entityType: 'Supplier', entityId: supplier._id, entityName: supplier.name, action: 'BLACKLISTED', req, details: `Blacklisted: ${reason}` });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSupplierHistory = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const orders = await PurchaseOrder.find({ supplier_id: req.params.id, ...labQuery, is_deleted: false })
      .sort({ createdAt: -1 })
      .populate('requested_by', 'name')
      .populate('approved_by', 'name');
    const reviews = await VendorPerformance.find({ supplier_id: req.params.id, ...labQuery })
      .sort({ review_date: -1 })
      .populate('reviewed_by', 'name');
    res.json({ orders, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDER MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

exports.getPurchaseOrders = async (req, res) => {
  try {
    const { status, supplier_id, priority, page = 1, limit = 20, search, dateFrom, dateTo } = req.query;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = { is_deleted: false, ...labQuery };

    if (status) query.status = status;
    if (supplier_id) query.supplier_id = supplier_id;
    if (priority) query.priority = priority;
    if (search) query.po_number = { $regex: search, $options: 'i' };
    if (dateFrom || dateTo) {
      query.order_date = {};
      if (dateFrom) query.order_date.$gte = new Date(dateFrom);
      if (dateTo) query.order_date.$lte = new Date(dateTo);
    }

    const total = await PurchaseOrder.countDocuments(query);
    const orders = await PurchaseOrder.find(query)
      .populate('supplier_id', 'name contact_email supplier_id status')
      .populate('requested_by', 'name email')
      .populate('approved_by', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchase orders', details: err.message });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const po = await PurchaseOrder.findOne({ _id: req.params.id, ...labQuery, is_deleted: false })
      .populate('supplier_id', 'name contact_email contact_phone supplier_id country')
      .populate('requested_by', 'name email')
      .populate('approved_by', 'name')
      .populate('approval_history.performed_by', 'name');

    if (!po) return res.status(404).json({ error: 'Purchase order not found' });

    const shipment = await ShipmentTracking.findOne({ purchase_order_id: req.params.id, ...labQuery });
    res.json({ po, shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const count = await PurchaseOrder.countDocuments({ lab: req.activeLabId });
    const po_number = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const poData = {
      ...req.body,
      po_number,
      lab: req.activeLabId,
      requested_by: req.user.id,
      ordered_by: req.user.id,
      order_date: new Date(),
      approval_history: [{
        action: 'Created',
        performed_by: req.user.id,
        performed_by_name: req.user.name || req.user.email,
        comment: 'Purchase order created as Draft',
        timestamp: new Date()
      }]
    };

    const po = new PurchaseOrder(poData);
    await po.save();

    // Auto-create shipment tracking record
    await ShipmentTracking.create({
      purchase_order_id: po._id,
      lab: req.activeLabId,
      supplier_id: po.supplier_id,
      status: 'Pending',
      estimated_arrival: po.expected_delivery,
      timeline: [{ status: 'Pending', description: 'Purchase order created', timestamp: new Date(), recorded_by: req.user.name || req.user.email }]
    });

    await logAction({ entityType: 'PurchaseOrder', entityId: po._id, entityName: po.po_number, action: 'CREATED', req, details: `Created PO ${po.po_number}` });
    res.status(201).json(po);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const po = await PurchaseOrder.findOne({ _id: req.params.id, ...labQuery, status: 'Draft', is_deleted: false });
    if (!po) return res.status(404).json({ error: 'PO not found or not editable (only Draft POs can be edited)' });

    Object.assign(po, req.body);
    await po.save();
    await logAction({ entityType: 'PurchaseOrder', entityId: po._id, entityName: po.po_number, action: 'UPDATED', req, details: `Updated Draft PO ${po.po_number}` });
    res.json(po);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status, comment, rejection_reason } = req.body;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const po = await PurchaseOrder.findOne({ _id: req.params.id, ...labQuery, is_deleted: false })
      .populate('supplier_id');
    if (!po) return res.status(404).json({ error: 'PO not found' });

    // RBAC checks
    const role = req.user?.role;
    if (status === 'Approved' && !['Admin', 'Lab Manager'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to approve purchase orders' });
    }
    if (status === 'Rejected' && !['Admin', 'Lab Manager'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to reject purchase orders' });
    }

    const oldStatus = po.status;
    po.status = status;

    if (status === 'Approved') {
      po.approved_by = req.user.id;
      po.approved_by_name = req.user.name || req.user.email;
    }
    if (status === 'Rejected') po.rejection_reason = rejection_reason || comment;
    if (['Completed', 'Partially Received'].includes(status)) {
      po.actual_delivery = po.actual_delivery || new Date();
    }

    // Append to approval history
    po.approval_history.push({
      action: status,
      performed_by: req.user.id,
      performed_by_name: req.user.name || req.user.email,
      comment: comment || '',
      timestamp: new Date()
    });

    await po.save();

    // Update shipment tracking status in sync
    const shipmentStatusMap = {
      'Ordered': 'Processing',
      'Submitted': 'Pending',
      'Approved': 'Pending',
      'Completed': 'Delivered',
      'Cancelled': 'Cancelled'
    };
    if (shipmentStatusMap[status]) {
      await ShipmentTracking.findOneAndUpdate(
        { purchase_order_id: po._id, ...labQuery },
        {
          status: shipmentStatusMap[status],
          $push: { timeline: { status: shipmentStatusMap[status], description: `PO status changed to ${status}`, timestamp: new Date(), recorded_by: req.user.name || req.user.email } }
        }
      );
    }

    // Update vendor stats when order is completed
    if (status === 'Completed' && po.supplier_id) {
      const supplierId = po.supplier_id._id || po.supplier_id;
      const supplier = await Supplier.findOne({ _id: supplierId, ...labQuery });
      if (supplier) {
        supplier.total_orders += 1;
        supplier.total_spending += po.total_cost || 0;

        if (po.expected_delivery && po.actual_delivery) {
          const leadMs = po.actual_delivery - po.order_date;
          const leadDays = Math.max(0, Math.ceil(leadMs / 86400000));
          const prevTotal = supplier.average_lead_time_days * (supplier.total_orders - 1);
          supplier.average_lead_time_days = Math.round((prevTotal + leadDays) / supplier.total_orders);

          const wasOnTime = po.actual_delivery <= po.expected_delivery;
          if (!wasOnTime) supplier.delayed_orders += 1;
          const prevOnTimeCount = (supplier.on_time_delivery_rate / 100) * (supplier.total_orders - 1);
          supplier.on_time_delivery_rate = Math.round(((prevOnTimeCount + (wasOnTime ? 1 : 0)) / supplier.total_orders) * 100);
        }

        // Recalculate reliability score
        supplier.reliability_score = Math.round(
          (supplier.on_time_delivery_rate * 0.5) +
          (supplier.order_accuracy_rate * 0.3) +
          ((supplier.quality_score / 5) * 100 * 0.2)
        );

        await supplier.save();
      }
    }

    await logAction({
      entityType: 'PurchaseOrder', entityId: po._id, entityName: po.po_number,
      action: `STATUS_CHANGED_TO_${status.toUpperCase().replace(/ /g, '_')}`,
      req, details: `PO ${po.po_number}: ${oldStatus} → ${status}`, changes: { from: oldStatus, to: status }
    });

    const updated = await PurchaseOrder.findById(po._id)
      .populate('supplier_id', 'name contact_email supplier_id')
      .populate('requested_by', 'name')
      .populate('approved_by', 'name');

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, ...labQuery, is_deleted: false },
      { is_deleted: true },
      { new: true }
    );
    if (!po) return res.status(404).json({ error: 'PO not found' });
    await logAction({ entityType: 'PurchaseOrder', entityId: po._id, entityName: po.po_number, action: 'DELETED', req, details: `Deleted PO ${po.po_number}` });
    res.json({ message: 'Purchase order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// SHIPMENT TRACKING
// ════════════════════════════════════════════════════════════════════════════

exports.getShipments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = status ? { status, ...labQuery } : { ...labQuery };
    const total = await ShipmentTracking.countDocuments(query);
    const shipments = await ShipmentTracking.find(query)
      .populate('purchase_order_id', 'po_number total_cost currency')
      .populate('supplier_id', 'name')
      .populate('received_by', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ shipments, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateShipment = async (req, res) => {
  try {
    const { status, tracking_number, carrier, shipped_date, estimated_arrival, location, description, condition, damage_description, quantity_mismatch_details } = req.body;

    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const shipment = await ShipmentTracking.findOne({ purchase_order_id: req.params.poId, ...labQuery });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    if (status) shipment.status = status;
    if (tracking_number) shipment.tracking_number = tracking_number;
    if (carrier) shipment.carrier = carrier;
    if (shipped_date) shipment.shipped_date = new Date(shipped_date);
    if (estimated_arrival) shipment.estimated_arrival = new Date(estimated_arrival);
    if (condition) shipment.condition = condition;
    if (damage_description) { shipment.damage_description = damage_description; shipment.status = 'Returned'; }
    if (quantity_mismatch_details) shipment.quantity_mismatch_details = quantity_mismatch_details;

    if (status === 'Delivered') {
      shipment.actual_arrival = new Date();
      shipment.received_by = req.user.id;
      shipment.received_by_name = req.user.name || req.user.email;
      shipment.received_date = new Date();
    }

    // Check for delay
    if (shipment.estimated_arrival && new Date() > shipment.estimated_arrival && !['Delivered', 'Cancelled'].includes(shipment.status)) {
      shipment.is_delayed = true;
    }

    // Push timeline event
    shipment.timeline.push({
      status: status || shipment.status,
      location: location || '',
      description: description || `Status updated to ${status}`,
      timestamp: new Date(),
      recorded_by: req.user.name || req.user.email
    });

    await shipment.save();

    await logAction({ entityType: 'Shipment', entityId: shipment._id, entityName: shipment.tracking_number || 'Shipment', action: `SHIPMENT_${(status || 'UPDATED').toUpperCase()}`, req, details: description });
    res.json(shipment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// VENDOR PERFORMANCE
// ════════════════════════════════════════════════════════════════════════════

exports.getVendorReviews = async (req, res) => {
  try {
    const { supplier_id } = req.query;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = supplier_id ? { supplier_id, ...labQuery } : { ...labQuery };
    const reviews = await VendorPerformance.find(query)
      .populate('supplier_id', 'name supplier_id')
      .populate('reviewed_by', 'name')
      .populate('purchase_order_id', 'po_number')
      .sort({ review_date: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createVendorReview = async (req, res) => {
  try {
    const review = new VendorPerformance({
      ...req.body,
      lab: req.activeLabId,
      reviewed_by: req.user.id,
      reviewed_by_name: req.user.name || req.user.email
    });
    await review.save();

    // Update supplier rating (running average of overall_rating)
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const allReviews = await VendorPerformance.find({ supplier_id: review.supplier_id, ...labQuery });
    const avgRating = allReviews.reduce((s, r) => s + (r.overall_rating || 0), 0) / allReviews.length;
    await Supplier.findOneAndUpdate({ _id: review.supplier_id, ...labQuery }, {
      rating: Math.round(avgRating * 10) / 10,
      quality_score: review.chemical_quality,
      order_accuracy_rate: Math.round(allReviews.filter(r => !r.had_quantity_mismatch).length / allReviews.length * 100),
      rejected_shipments: allReviews.filter(r => r.shipment_rejected).length
    });

    await logAction({ entityType: 'VendorReview', entityId: review._id, entityName: review.supplier_id?.toString(), action: 'REVIEW_CREATED', req, details: `Vendor review submitted. Rating: ${review.overall_rating}/5` });
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS & REPORTS
// ════════════════════════════════════════════════════════════════════════════

exports.getProcurementAnalytics = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const labId = req.activeLabId;
    const isAdminGlobal = req.user.role === 'Admin' && !labId;
    
    // For aggregate, we need a match object
    const matchQuery = isAdminGlobal ? {} : { lab: new mongoose.Types.ObjectId(labId) };

    const [
      totalSpending,
      ordersByStatus,
      monthlySpending,
      topSuppliers,
      topChemicals,
      supplierCount,
      activeSupplierCount,
      poCount,
      avgOrderValue
    ] = await Promise.all([
      // Total spending (completed orders)
      PurchaseOrder.aggregate([
        { $match: { ...matchQuery, status: { $in: ['Completed', 'Partially Received'] }, is_deleted: false } },
        { $group: { _id: null, total: { $sum: '$total_cost' } } }
      ]),

      // Orders by status
      PurchaseOrder.aggregate([
        { $match: { ...matchQuery, is_deleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Monthly spending for selected year
      PurchaseOrder.aggregate([
        { $match: { ...matchQuery, status: { $in: ['Completed', 'Partially Received'] }, is_deleted: false, order_date: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
        { $group: { _id: { month: { $month: '$order_date' } }, total: { $sum: '$total_cost' }, count: { $sum: 1 } } },
        { $sort: { '_id.month': 1 } }
      ]),

      // Top suppliers by spending
      PurchaseOrder.aggregate([
        { $match: { ...matchQuery, status: { $in: ['Completed', 'Partially Received'] }, is_deleted: false } },
        { $group: { _id: '$supplier_id', totalSpent: { $sum: '$total_cost' }, orderCount: { $sum: 1 } } },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'suppliers', localField: '_id', foreignField: '_id', as: 'supplier' } },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } }
      ]),

      // Top chemicals ordered
      PurchaseOrder.aggregate([
        { $match: { ...matchQuery, is_deleted: false } },
        { $unwind: '$items' },
        { $group: { _id: '$items.chemical_name', totalQty: { $sum: '$items.quantity' }, totalCost: { $sum: '$items.total_price' }, orderCount: { $sum: 1 } } },
        { $sort: { totalCost: -1 } },
        { $limit: 10 }
      ]),

      Supplier.countDocuments({ ...matchQuery, is_deleted: false }),
      Supplier.countDocuments({ ...matchQuery, status: 'Active', is_deleted: false }),
      PurchaseOrder.countDocuments({ ...matchQuery, is_deleted: false }),
      PurchaseOrder.aggregate([
        { $match: { ...matchQuery, is_deleted: false } },
        { $group: { _id: null, avg: { $avg: '$total_cost' } } }
      ])
    ]);

    // Build monthly chart (fill missing months with 0)
    const months = Array.from({ length: 12 }, (_, i) => {
      const found = monthlySpending.find(m => m._id.month === i + 1);
      return { month: i + 1, total: found?.total || 0, count: found?.count || 0 };
    });

    res.json({
      summary: {
        totalSpending: totalSpending[0]?.total || 0,
        totalOrders: poCount,
        totalSuppliers: supplierCount,
        activeSuppliers: activeSupplierCount,
        avgOrderValue: avgOrderValue[0]?.avg || 0
      },
      ordersByStatus,
      monthlySpending: months,
      topSuppliers,
      topChemicals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProcurementLogs = async (req, res) => {
  try {
    const { entity_type, page = 1, limit = 50 } = req.query;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = entity_type ? { entity_type, ...labQuery } : { ...labQuery };
    const total = await ProcurementLog.countDocuments(query);
    const logs = await ProcurementLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSupplierRankings = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const suppliers = await Supplier.find({ ...labQuery, status: 'Active', is_deleted: false })
      .select('name supplier_id rating reliability_score on_time_delivery_rate total_orders total_spending delayed_orders rejected_shipments quality_score')
      .sort({ reliability_score: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


