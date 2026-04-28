const { jsPDF } = require('jspdf');
require('jspdf-autotable');

try {
  const doc = new jsPDF();
  doc.text('Hello world!', 10, 10);
  doc.autoTable({
    head: [['Name', 'Email', 'Country']],
    body: [
      ['David', 'david@example.com', 'Sweden'],
      ['Castille', 'castille@example.com', 'Spain'],
    ],
  });
  const buffer = doc.output('arraybuffer');
  console.log('PDF Generated successfully, buffer length:', buffer.byteLength);
} catch (err) {
  console.error('PDF Generation Failed:', err);
}
