const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  // Check if SMTP configuration exists
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback to console logger mode if SMTP is not provided
  console.log('✉️ Email Service initialized in CONSOLE LOGGER mode (no SMTP configuration).');
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('\n=================== OUTGOING EMAIL ===================');
      console.log(`To:      ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Body:\n${mailOptions.text || mailOptions.html}`);
      console.log('======================================================\n');
      return { messageId: 'console-mock-id-' + Math.random().toString(36).substring(2, 15) };
    }
  };
  return transporter;
};

const sendEmail = async (to, subject, text, html) => {
  try {
    const activeTransporter = await getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Attendance System" <noreply@attendance.com>',
      to,
      subject,
      text,
      html
    };
    return await activeTransporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

const sendInstructorCredentials = async (email, name, password) => {
  const subject = 'Your Instructor Account Credentials';
  const text = `Hello ${name},\n\nYour instructor account has been created.\n\nEmail: ${email}\nTemporary Password: ${password}\n\nYou will be required to change this password upon your first login.\n\nRegards,\nAttendance System Admin`;
  const html = `<h3>Hello ${name},</h3><p>Your instructor account has been created.</p><p><strong>Email:</strong> ${email}<br><strong>Temporary Password:</strong> ${password}</p><p>You will be required to change this password upon your first login.</p><br><p>Regards,<br>Attendance System Admin</p>`;
  return sendEmail(email, subject, text, html);
};

const sendPasswordResetLink = async (email, link) => {
  const subject = 'Password Reset Request';
  const text = `Hello,\n\nYou requested a password reset. Click the link below to reset your password:\n\n${link}\n\nIf you did not request this, please ignore this email.`;
  const html = `<h3>Hello,</h3><p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${link}">${link}</a></p><p>If you did not request this, please ignore this email.</p>`;
  return sendEmail(email, subject, text, html);
};

const sendAttendanceWarning = async (email, name, courseName, percentage) => {
  const subject = `Attendance Warning: ${courseName}`;
  const text = `Hello ${name},\n\nThis is a warning that your attendance in the course "${courseName}" is currently at ${percentage.toFixed(1)}%, which is below the required 75% threshold. Please attend future classes to remain eligible for exams.`;
  const html = `<h3>Hello ${name},</h3><p>This is a warning that your attendance in the course <strong>"${courseName}"</strong> is currently at <strong>${percentage.toFixed(1)}%</strong>, which is below the required 75% threshold.</p><p>Please attend future classes to remain eligible for exams.</p>`;
  return sendEmail(email, subject, text, html);
};

const sendEligibilityAlert = async (email, name, courseName, percentage, eligible) => {
  const status = eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
  const subject = `Exam Eligibility Update: ${courseName} (${status})`;
  const text = `Hello ${name},\n\nYour exam eligibility status for "${courseName}" has been updated.\n\nAttendance: ${percentage.toFixed(1)}%\nStatus: ${status}\n\nRegards,\nAcademic Office`;
  const html = `<h3>Hello ${name},</h3><p>Your exam eligibility status for <strong>"${courseName}"</strong> has been updated.</p><p><strong>Attendance:</strong> ${percentage.toFixed(1)}%<br><strong>Status:</strong> <span style="color: ${eligible ? 'green' : 'red'}; font-weight: bold;">${status}</span></p><br><p>Regards,<br>Academic Office</p>`;
  return sendEmail(email, subject, text, html);
};

module.exports = {
  sendInstructorCredentials,
  sendPasswordResetLink,
  sendAttendanceWarning,
  sendEligibilityAlert
};
