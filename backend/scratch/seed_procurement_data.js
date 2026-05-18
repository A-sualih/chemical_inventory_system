const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Supplier = require('../src/models/Supplier');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const VendorPerformance = require('../src/models/VendorPerformance');
const ShipmentTracking = require('../src/models/ShipmentTracking');
const User = require('../src/models/User');
const Lab = require('../src/models/Lab');

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ role: 'Admin' });
    console.log('Admin found:', admin ? admin.email : 'None');
    if (!admin) throw new Error("No admin user found");

    const lab = await Lab.findOne();
    const labId = lab ? lab._id : undefined;
    console.log('Lab found:', labId);

    // Clear existing dummy data first
    console.log('Clearing existing data...');
    await Supplier.deleteMany({});
    console.log('Cleared Suppliers');
    await PurchaseOrder.deleteMany({});
    console.log('Cleared POs');
    await VendorPerformance.deleteMany({});
    console.log('Cleared VendorPerformance');
    await ShipmentTracking.deleteMany({});
    console.log('Cleared ShipmentTracking');

    // 1. Create Suppliers
    const suppliersData = [
      {
        supplier_id: 'SUP-0001',
        name: 'Fisher Scientific',
        contact_person: 'Alice Fisher',
        contact_email: 'sales@fishersci.com',
        contact_phone: '+1-800-766-7000',
        country: 'USA',
        category: 'Distributor',
        chemical_types_supplied: ['Reagents', 'Solvents', 'Acids'],
        status: 'Active',
        rating: 4.8,
        total_orders: 15,
        total_spending: 45000,
        average_lead_time_days: 3,
        on_time_delivery_rate: 98,
        order_accuracy_rate: 99,
        quality_score: 4.9,
        reliability_score: 98,
        lab: labId
      },
      {
        supplier_id: 'SUP-0002',
        name: 'Sigma-Aldrich',
        contact_person: 'Bob Sigma',
        contact_email: 'support@sigmaaldrich.com',
        contact_phone: '+1-800-325-3010',
        country: 'USA',
        category: 'Chemical Manufacturer',
        chemical_types_supplied: ['Specialty Chemical', 'Biochemicals'],
        status: 'Active',
        is_preferred: true,
        rating: 4.5,
        total_orders: 10,
        total_spending: 32000,
        average_lead_time_days: 5,
        on_time_delivery_rate: 95,
        order_accuracy_rate: 96,
        quality_score: 4.6,
        reliability_score: 95,
        lab: labId
      },
      {
        supplier_id: 'SUP-0003',
        name: 'VWR International',
        contact_person: 'Carol V.',
        contact_email: 'info@vwr.com',
        contact_phone: '+1-800-932-5000',
        country: 'USA',
        category: 'Laboratory Supplier',
        chemical_types_supplied: ['Consumables', 'Salts'],
        status: 'Active',
        rating: 4.2,
        total_orders: 8,
        total_spending: 15000,
        average_lead_time_days: 4,
        on_time_delivery_rate: 90,
        order_accuracy_rate: 95,
        quality_score: 4.3,
        reliability_score: 92,
        lab: labId
      },
      {
        supplier_id: 'SUP-0004',
        name: 'ChemLabs Supplies',
        contact_person: 'Dave Labs',
        contact_email: 'dave@chemlabs.com',
        contact_phone: '+1-555-123-4567',
        country: 'UK',
        category: 'Wholesaler',
        chemical_types_supplied: ['Raw Materials'],
        status: 'Inactive',
        rating: 3.5,
        total_orders: 2,
        total_spending: 4000,
        average_lead_time_days: 14,
        on_time_delivery_rate: 70,
        order_accuracy_rate: 80,
        quality_score: 3.8,
        reliability_score: 75,
        lab: labId
      }
    ];

    const createdSuppliers = await Supplier.insertMany(suppliersData);
    console.log(`Created ${createdSuppliers.length} suppliers`);

    const fishersci = createdSuppliers.find(s => s.name === 'Fisher Scientific');
    const sigma = createdSuppliers.find(s => s.name === 'Sigma-Aldrich');
    const vwr = createdSuppliers.find(s => s.name === 'VWR International');

    // Helper to get past dates
    const getPastDate = (daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d;
    };

    // 2. Create Purchase Orders
    const posData = [
      {
        po_number: 'PO-2026-0001',
        lab: labId,
        supplier_id: fishersci._id,
        requested_by: admin._id,
        approved_by: admin._id,
        approved_by_name: admin.name,
        status: 'Completed',
        priority: 'High',
        payment_status: 'Paid',
        delivery_status: 'Delivered',
        order_date: getPastDate(45),
        expected_delivery: getPastDate(40),
        actual_delivery: getPastDate(41),
        department: 'Organic Chemistry',
        items: [
          { chemical_name: 'Acetone', quantity: 50, unit: 'L', unit_price: 25, total_price: 1250, received_quantity: 50 },
          { chemical_name: 'Methanol', quantity: 30, unit: 'L', unit_price: 20, total_price: 600, received_quantity: 30 }
        ],
        subtotal: 1850,
        tax_amount: 185,
        shipping_fee: 50,
        total_cost: 2085,
        currency: 'USD'
      },
      {
        po_number: 'PO-2026-0002',
        lab: labId,
        supplier_id: sigma._id,
        requested_by: admin._id,
        approved_by: admin._id,
        approved_by_name: admin.name,
        status: 'Completed',
        priority: 'Normal',
        payment_status: 'Paid',
        delivery_status: 'Delivered',
        order_date: getPastDate(30),
        expected_delivery: getPastDate(25),
        actual_delivery: getPastDate(25),
        department: 'Biochemistry',
        items: [
          { chemical_name: 'Sulfuric Acid', quantity: 10, unit: 'L', unit_price: 45, total_price: 450, received_quantity: 10 },
          { chemical_name: 'Hydrochloric Acid', quantity: 15, unit: 'L', unit_price: 35, total_price: 525, received_quantity: 15 }
        ],
        subtotal: 975,
        tax_amount: 97.5,
        shipping_fee: 0,
        total_cost: 1072.5,
        currency: 'USD'
      },
      {
        po_number: 'PO-2026-0003',
        lab: labId,
        supplier_id: fishersci._id,
        requested_by: admin._id,
        approved_by: admin._id,
        approved_by_name: admin.name,
        status: 'Ordered',
        priority: 'Urgent',
        payment_status: 'Unpaid',
        delivery_status: 'In Transit',
        order_date: getPastDate(5),
        expected_delivery: getPastDate(1), // delayed
        department: 'Analytical Chemistry',
        items: [
          { chemical_name: 'Ethanol', quantity: 100, unit: 'L', unit_price: 30, total_price: 3000, received_quantity: 0 },
          { chemical_name: 'Isopropanol', quantity: 50, unit: 'L', unit_price: 28, total_price: 1400, received_quantity: 0 }
        ],
        subtotal: 4400,
        tax_amount: 440,
        shipping_fee: 100,
        total_cost: 4940,
        currency: 'USD'
      },
      {
        po_number: 'PO-2026-0004',
        lab: labId,
        supplier_id: vwr._id,
        requested_by: admin._id,
        approved_by: admin._id,
        approved_by_name: admin.name,
        status: 'Submitted',
        priority: 'Normal',
        payment_status: 'Unpaid',
        delivery_status: 'Pending',
        order_date: getPastDate(1),
        expected_delivery: getPastDate(-7), // 7 days in future
        department: 'General Lab',
        items: [
          { chemical_name: 'Sodium Chloride', quantity: 200, unit: 'kg', unit_price: 5, total_price: 1000, received_quantity: 0 }
        ],
        subtotal: 1000,
        tax_amount: 100,
        shipping_fee: 150,
        total_cost: 1250,
        currency: 'USD'
      },
      {
        po_number: 'PO-2026-0005',
        lab: labId,
        supplier_id: sigma._id,
        requested_by: admin._id,
        status: 'Draft',
        priority: 'Low',
        payment_status: 'Unpaid',
        delivery_status: 'Pending',
        order_date: new Date(),
        department: 'Research',
        items: [
          { chemical_name: 'Dichloromethane', quantity: 20, unit: 'L', unit_price: 40, total_price: 800, received_quantity: 0 }
        ],
        subtotal: 800,
        tax_amount: 80,
        shipping_fee: 50,
        total_cost: 930,
        currency: 'USD'
      },
      {
        po_number: 'PO-2026-0006',
        lab: labId,
        supplier_id: fishersci._id,
        requested_by: admin._id,
        approved_by: admin._id,
        approved_by_name: admin.name,
        status: 'Completed',
        priority: 'Normal',
        payment_status: 'Paid',
        delivery_status: 'Delivered',
        order_date: getPastDate(90),
        expected_delivery: getPastDate(85),
        actual_delivery: getPastDate(85),
        department: 'Organic Chemistry',
        items: [
          { chemical_name: 'Hexane', quantity: 40, unit: 'L', unit_price: 22, total_price: 880, received_quantity: 40 }
        ],
        subtotal: 880,
        tax_amount: 88,
        shipping_fee: 0,
        total_cost: 968,
        currency: 'USD'
      },
      {
        po_number: 'PO-2026-0007',
        lab: labId,
        supplier_id: vwr._id,
        requested_by: admin._id,
        approved_by: admin._id,
        approved_by_name: admin.name,
        status: 'Cancelled',
        priority: 'Normal',
        payment_status: 'Refunded',
        delivery_status: 'Cancelled',
        order_date: getPastDate(60),
        department: 'Biochemistry',
        items: [
          { chemical_name: 'Glycerol', quantity: 5, unit: 'L', unit_price: 50, total_price: 250, received_quantity: 0 }
        ],
        subtotal: 250,
        tax_amount: 25,
        shipping_fee: 0,
        total_cost: 275,
        currency: 'USD'
      }
    ];

    const createdPOs = await PurchaseOrder.insertMany(posData);
    console.log(`Created ${createdPOs.length} purchase orders`);

    // 3. Create Shipment Tracking
    const shipmentsData = [
      {
        purchase_order_id: createdPOs[2]._id, // The one that's "Ordered" and "In Transit"
        lab: labId,
        supplier_id: fishersci._id,
        status: 'In Transit',
        carrier: 'FedEx Freight',
        tracking_number: 'FX-123456789',
        shipped_date: getPastDate(4),
        estimated_arrival: getPastDate(1), // Delayed
        is_delayed: true,
        timeline: [
          { status: 'Pending', description: 'Order received by supplier', timestamp: getPastDate(5) },
          { status: 'Processing', description: 'Order being packed', timestamp: getPastDate(4) },
          { status: 'In Transit', description: 'Package departed facility', location: 'Memphis, TN', timestamp: getPastDate(3) }
        ]
      },
      {
        purchase_order_id: createdPOs[3]._id, // The one that's "Submitted"
        lab: labId,
        supplier_id: vwr._id,
        status: 'Pending',
        estimated_arrival: getPastDate(-7),
        timeline: [
          { status: 'Pending', description: 'Purchase order created', timestamp: getPastDate(1) }
        ]
      }
    ];

    await ShipmentTracking.insertMany(shipmentsData);
    console.log(`Created ${shipmentsData.length} active shipments`);

    // 4. Create Vendor Performance Reviews
    const reviewsData = [
      {
        supplier_id: fishersci._id,
        purchase_order_id: createdPOs[0]._id, // Completed
        lab: labId,
        reviewed_by: admin._id,
        reviewed_by_name: admin.name,
        review_date: getPastDate(40),
        overall_rating: 4.8,
        delivery_punctuality: 5,
        order_accuracy: 5,
        chemical_quality: 5,
        communication: 4,
        safety_compliance: 5,
        had_quantity_mismatch: false,
        shipment_rejected: false,
        comments: 'Excellent quality and fast shipping.'
      },
      {
        supplier_id: sigma._id,
        purchase_order_id: createdPOs[1]._id, // Completed
        lab: labId,
        reviewed_by: admin._id,
        reviewed_by_name: admin.name,
        review_date: getPastDate(24),
        overall_rating: 4.4,
        delivery_punctuality: 3,
        order_accuracy: 5,
        chemical_quality: 5,
        communication: 4,
        safety_compliance: 5,
        had_quantity_mismatch: false,
        shipment_rejected: false,
        comments: 'Great chemicals, but delivery was exactly on the deadline day.'
      },
      {
        supplier_id: fishersci._id,
        purchase_order_id: createdPOs[5]._id, // Completed
        lab: labId,
        reviewed_by: admin._id,
        reviewed_by_name: admin.name,
        review_date: getPastDate(80),
        overall_rating: 5,
        delivery_punctuality: 5,
        order_accuracy: 5,
        chemical_quality: 5,
        communication: 5,
        safety_compliance: 5,
        comments: 'Flawless execution.'
      }
    ];

    await VendorPerformance.insertMany(reviewsData);
    console.log(`Created ${reviewsData.length} vendor reviews`);

    console.log('Procurement data seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedData();
