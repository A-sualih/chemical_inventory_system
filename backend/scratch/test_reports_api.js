const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super_secret_jwt_key_for_cims';
const API_URL = 'http://localhost:5001/api';

async function testReports() {
  try {
    // Generate a test token for an admin
    const token = jwt.sign({ 
      id: 'test_admin_id',
      name: 'Test Admin',
      role: 'Admin',
      email: 'admin@test.com'
    }, JWT_SECRET);

    console.log('Testing /api/reports/inventory...');
    const invRes = await axios.get(`${API_URL}/reports/inventory`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Inventory Response:', JSON.stringify(invRes.data, null, 2));

    console.log('\nTesting /api/reports/usage...');
    const usageRes = await axios.get(`${API_URL}/reports/usage`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Usage Response:', JSON.stringify(usageRes.data, null, 2));

  } catch (err) {
    console.error('Test failed:', err.response ? err.response.data : err.message);
  }
}

testReports();
