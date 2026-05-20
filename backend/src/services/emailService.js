const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});



/**
 * Sends a system email notification.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
const sendEmail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials missing in environment variables');
    return { success: false, error: new Error('Email credentials missing') };
  }
  try {
    const info = await transporter.sendMail({
      from: `"CIMS Alerts" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

/**
 * Formats a notification as an HTML email.
 */
const formatNotificationEmail = (notif) => {
  const severityColors = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280'
  };

  const color = severityColors[notif.severity] || '#6b7280';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: ${color}; padding: 20px; color: white;">
        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">${notif.title}</h2>
      </div>
      <div style="padding: 24px; color: #1f2937;">
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${notif.message}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Category</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: bold; text-align: right;">${notif.category}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Severity</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: bold; text-align: right; color: ${color};">${notif.severity.toUpperCase()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Timestamp</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: bold; text-align: right;">${new Date().toLocaleString()}</td>
          </tr>
        </table>

        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated safety alert from the Chemical Inventory Management System.
          <br/>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/notifications" style="color: ${color}; font-weight: bold; text-decoration: none; display: inline-block; margin-top: 8px;">View in Dashboard</a>
        </div>
      </div>
    </div>
  `;
};

module.exports = {
  sendEmail,
  formatNotificationEmail
};



