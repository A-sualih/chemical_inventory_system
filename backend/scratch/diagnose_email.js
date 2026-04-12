const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function diagnoseEmail() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = 'chemicalinventorysystem@gmail.com';
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    
    if (user) {
      console.log(`User found: ${user.email}`);
      console.log(`MFA Enabled: ${user.mfa_enabled}`);
      console.log(`MFA Type: ${user.mfa_type}`);
    } else {
      console.log('User NOT found in database.');
    }

    console.log('--- Testing SMTP Connection ---');
    console.log(`Using Email: ${process.env.EMAIL_USER}`);
    
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

    try {
      await transporter.verify();
      console.log('SMTP Connection: SUCCESS');
      
      console.log('Sending TEST email...');
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "CIMS - Test Email",
        text: "This is a test to verify your SMTP settings."
      });
      console.log('Test email SENT successfully.');
    } catch (smtpErr) {
      console.error('SMTP Error:', smtpErr.message);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

diagnoseEmail();
