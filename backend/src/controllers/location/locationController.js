const Location = require('../../models/Location');
const Chemical = require('../../models/Chemical');
const { logAudit } = require('../../middleware/authMiddleware');

exports.getLocations = async (req, res) => {
  try {
    const { building, room, cabinet } = req.query;
    const query = { isActive: true };
    if (building) query.building = building;
    if (room) query.room = room;
    if (cabinet) query.cabinet = cabinet;

    const locations = await Location.find(query).sort({ building: 1, room: 1, cabinet: 1, shelf: 1 }).lean();
    
    const locationsWithLoad = await Promise.all(locations.map(async (loc) => {
      const chemCount = await Chemical.countDocuments({
        building: loc.building,
        room: loc.room,
        cabinet: loc.cabinet,
        shelf: loc.shelf,
        archived: false
      });
      return { ...loc, current_load: chemCount };
    }));

    res.json(locationsWithLoad);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
};

exports.getLocationHierarchy = async (req, res) => {
  try {
    const { building, room } = req.query;

    const buildings = await Location.distinct('building', { isActive: true });

    let rooms = [];
    if (building) {
      rooms = await Location.distinct('room', { building, isActive: true });
    }

    let cabinets = [];
    if (building && room) {
      cabinets = await Location.distinct('cabinet', { building, room, isActive: true });
    }

    let shelves = [];
    if (building && room && req.query.cabinet) {
      shelves = await Location.find({
        building,
        room,
        cabinet: req.query.cabinet,
        isActive: true
      }).select('shelf capacity current_load safety_warnings notes _id');
    }

    res.json({ buildings, rooms, cabinets, shelves });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch location hierarchy' });
  }
};

exports.getLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const chemCount = await Chemical.countDocuments({
      building: location.building,
      room: location.room,
      cabinet: location.cabinet,
      shelf: location.shelf,
      archived: false
    });

    res.json({ ...location.toObject(), current_load: chemCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch location' });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const { building, room, cabinet, shelf, capacity, x, y, safety_warnings, notes } = req.body;

    if (!building || !room || !cabinet || !shelf) {
      return res.status(400).json({ error: 'Building, Room, Cabinet and Shelf are required.' });
    }

    const existing = await Location.findOne({ building, room, cabinet, shelf });
    if (existing) {
      return res.status(409).json({ error: `Location ${building}/${room}/${cabinet}/Shelf-${shelf} already exists.` });
    }

    const location = await Location.create({ 
      building, 
      room, 
      cabinet, 
      shelf, 
      capacity: capacity || 50, 
      x: x || 0,
      y: y || 0,
      safety_warnings, 
      notes 
    });

    await logAudit(req, {
      action: 'CREATE',
      targetType: 'location',
      targetId: location._id,
      targetName: `${building}/${room}/${cabinet}/Shelf-${shelf}`,
      details: `Created new storage location`
    });

    res.status(201).json(location);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'This location already exists.' });
    res.status(500).json({ error: 'Failed to create location' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { capacity, x, y, safety_warnings, notes, isActive } = req.body;
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { capacity, x, y, safety_warnings, notes, isActive },
      { new: true }
    );
    if (!location) return res.status(404).json({ error: 'Location not found' });

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'location',
      targetId: location._id,
      targetName: `${location.building}/${location.room}/${location.cabinet}/Shelf-${location.shelf}`,
      details: `Updated storage location settings`
    });

    res.json(location);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const assigned = await Chemical.countDocuments({
      building: location.building,
      room: location.room,
      cabinet: location.cabinet,
      shelf: location.shelf,
      archived: false
    });

    if (assigned > 0) {
      return res.status(400).json({ error: `Cannot delete: ${assigned} active chemical(s) are assigned to this location.` });
    }

    location.isActive = false;
    await location.save();

    await logAudit(req, {
      action: 'DELETE',
      targetType: 'location',
      targetId: location._id,
      targetName: `${location.building}/${location.room}/${location.cabinet}/Shelf-${location.shelf}`,
      details: 'Deactivated storage location'
    });

    res.json({ message: 'Location deactivated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete location' });
  }
};
