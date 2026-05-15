const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function testEmail() {
  try {
    console.log('Attempting to send test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'ahmedmuhammed026y@gmail.com',
      subject: "CIMS - Test MFA Email",
      text: "This is a test email to verify MFA delivery.",
      html: "<h1>Test OTP: 123456</h1>"
    });
    console.log('Email sent successfully:', info.messageId);
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

testEmail();
