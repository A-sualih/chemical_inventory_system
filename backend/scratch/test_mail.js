const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function testMail() {
  try {
    console.log('Attempting to send test email...');
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // send to self
      subject: "CIMS - Test Email",
      text: "This is a test email to verify the transporter configuration."
    });
    console.log('Test email sent successfully!');
  } catch (err) {
    console.error('Test email failed:', err);
  }
}

testMail();
