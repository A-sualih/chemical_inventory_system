async function test() {
  try {
    const response = await fetch('http://127.0.0.1:5001/api/procurement/suppliers?page=1&limit=12');
    const data = await response.json();
    console.log('STATUS:', response.status);
    console.log('DATA:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
