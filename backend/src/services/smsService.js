sendSMS = async (phone, message) => {
  try {
    // MOCK IMPLEMENTATION
    console.log('--- [MOCK SMS ALERT] ---');
    console.log(`TO: ${phone || 'System Admin'}`);
    console.log(`MESSAGE: ${message}`);
    console.log('------------------------');

    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 500));

    return { success: true, sid: 'mock_sid_' + Math.random().toString(36).substr(2, 9) };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error };
  }
};

module.exports = {
  sendSMS
};


