const SupportRequest = require('../../models/SupportRequest');

exports.createSupportRequest = async (req, res) => {
  try {
    const { fullName, email, department, subject, message, priority } = req.body;

    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (Name, Email, Subject, Message)'
      });
    }

    const newRequest = new SupportRequest({
      fullName,
      email,
      department,
      subject,
      message,
      priority
    });

    await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully',
      data: newRequest
    });
  } catch (error) {
    console.error('Error creating support request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit support request'
    });
  }
};

exports.getSupportRequests = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const requests = await SupportRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SupportRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching support requests:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateSupportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updatedRequest = await SupportRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error updating support status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
