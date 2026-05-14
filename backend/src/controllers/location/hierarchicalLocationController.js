const Block = require('../../models/Block');
const Room = require('../../models/Room');
const Cabinet = require('../../models/Cabinet');
const Shelf = require('../../models/Shelf');
const Location = require('../../models/Location'); // Sync target
const { logAudit } = require('../../middleware/authMiddleware');

// --- HELPER: SYNC HIERARCHY TO FLAT LOCATION ---
async function syncShelfToLocation(shelfId) {
  try {
    const shelf = await Shelf.findById(shelfId).populate({
      path: 'cabinet',
      populate: {
        path: 'room',
        populate: {
          path: 'block'
        }
      }
    });

    if (!shelf || !shelf.cabinet || !shelf.cabinet.room || !shelf.cabinet.room.block) {
      console.warn('Cannot sync shelf: missing hierarchy parent info', shelfId);
      return;
    }

    const building = shelf.cabinet.room.block.name;
    const room = shelf.cabinet.room.name;
    const cabinet = shelf.cabinet.name;
    const shelfName = shelf.name;

    // Check if flat location exists
    const existing = await Location.findOne({
      lab: shelf.lab,
      building,
      room,
      cabinet,
      shelf: shelfName
    });

    if (!existing) {
      await Location.create({
        lab: shelf.lab,
        building,
        room,
        cabinet,
        shelf: shelfName,
        capacity: shelf.capacity_limit || 50,
        notes: shelf.description
      });
      console.log(`Synced new location: ${building}/${room}/${cabinet}/${shelfName}`);
    } else {
      // Update capacity if changed
      existing.capacity = shelf.capacity_limit || 50;
      existing.notes = shelf.description;
      await existing.save();
    }
  } catch (err) {
    console.error('Failed to sync shelf to location:', err);
  }
}

// --- BULK OPERATIONS ---

exports.bulkCreateRooms = async (req, res) => {
  try {
    const { blockId, rooms } = req.body;
    const results = [];
    for (const r of rooms) {
      const room = await Room.create({
        ...r,
        block: blockId,
        lab: req.activeLabId
      });
      results.push(room);
    }
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkCreateCabinets = async (req, res) => {
  try {
    const { roomId, cabinets } = req.body;
    const results = [];
    for (const c of cabinets) {
      const cabinet = await Cabinet.create({
        ...c,
        room: roomId,
        lab: req.activeLabId
      });
      results.push(cabinet);
    }
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkCreateShelves = async (req, res) => {
  try {
    const { cabinetId, shelves } = req.body;
    const results = [];
    for (const s of shelves) {
      const shelf = await Shelf.create({
        ...s,
        cabinet: cabinetId,
        lab: req.activeLabId
      });
      await syncShelfToLocation(shelf._id);
      results.push(shelf);
    }
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- BLOCK CRUD ---
exports.createBlock = async (req, res) => {
  try {
    const block = await Block.create({ ...req.body, lab: req.activeLabId });
    res.status(201).json(block);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBlocks = async (req, res) => {
  try {
    const blocks = await Block.find({ lab: req.activeLabId });
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const { blockId } = req.query;
    const query = { lab: req.activeLabId };
    if (blockId) query.block = blockId;
    const rooms = await Room.find(query);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCabinets = async (req, res) => {
  try {
    const { roomId } = req.query;
    const query = { lab: req.activeLabId };
    if (roomId) query.room = roomId;
    const cabinets = await Cabinet.find(query);
    res.json(cabinets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getShelves = async (req, res) => {
  try {
    const { cabinetId } = req.query;
    const query = { lab: req.activeLabId };
    if (cabinetId) query.cabinet = cabinetId;
    const shelves = await Shelf.find(query);
    res.json(shelves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- HIERARCHY OVERVIEW ---
exports.getFullHierarchy = async (req, res) => {
  try {
    const blocks = await Block.find({ lab: req.activeLabId }).lean();
    const rooms = await Room.find({ lab: req.activeLabId }).lean();
    const cabinets = await Cabinet.find({ lab: req.activeLabId }).lean();
    const shelves = await Shelf.find({ lab: req.activeLabId }).lean();

    // Nesting logic
    const hierarchy = blocks.map(b => ({
      ...b,
      type: 'block',
      children: rooms.filter(r => r.block.toString() === b._id.toString()).map(r => ({
        ...r,
        type: 'room',
        children: cabinets.filter(c => c.room.toString() === r._id.toString()).map(c => ({
          ...c,
          type: 'cabinet',
          children: shelves.filter(s => s.cabinet.toString() === c._id.toString()).map(s => ({
            ...s,
            type: 'shelf'
          }))
        }))
      }))
    }));

    res.json(hierarchy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- INDIVIDUAL CREATION ---
exports.createRoom = async (req, res) => {
  try {
    const room = await Room.create({ ...req.body, lab: req.activeLabId });
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCabinet = async (req, res) => {
  try {
    const cabinet = await Cabinet.create({ ...req.body, lab: req.activeLabId });
    res.status(201).json(cabinet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createShelf = async (req, res) => {
  try {
    const shelf = await Shelf.create({ ...req.body, lab: req.activeLabId });
    await syncShelfToLocation(shelf._id);
    res.status(201).json(shelf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
