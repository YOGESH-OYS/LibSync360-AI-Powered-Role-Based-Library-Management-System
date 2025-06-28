const sgMail = require('@sendgrid/mail');
const { logger } = require('../utils/logger');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email templates
const emailTemplates = {
  'book-lent': {
    subject: 'Book Successfully Borrowed',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Book Successfully Borrowed</h2>
        <p>Dear ${data.studentName},</p>
        <p>You have successfully borrowed the following book:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>${data.bookTitle}</h3>
          <p><strong>Author:</strong> ${data.bookAuthor}</p>
          <p><strong>ISBN:</strong> ${data.bookIsbn}</p>
          <p><strong>Borrowed Date:</strong> ${data.borrowedDate}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
        </div>
        <p>Please return the book on or before the due date to avoid fines.</p>
        <p>Thank you for using our library!</p>
      </div>
    `
  },
  'reminder': {
    subject: 'Book Return Reminder',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Book Return Reminder</h2>
        <p>Dear ${data.studentName},</p>
        <p>This is a friendly reminder that the following book is due soon:</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3>${data.bookTitle}</h3>
          <p><strong>Author:</strong> ${data.bookAuthor}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
          <p><strong>Days Remaining:</strong> ${data.daysRemaining}</p>
        </div>
        <p>Please return the book on time to avoid fines.</p>
        <p>Thank you!</p>
      </div>
    `
  },
  'overdue': {
    subject: 'Book Overdue Notice',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Book Overdue Notice</h2>
        <p>Dear ${data.studentName},</p>
        <p>The following book is overdue:</p>
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3>${data.bookTitle}</h3>
          <p><strong>Author:</strong> ${data.bookAuthor}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
          <p><strong>Days Overdue:</strong> ${data.daysOverdue}</p>
          <p><strong>Current Fine:</strong> ₹${data.currentFine}</p>
        </div>
        <p>Please return the book immediately to stop further fines from accumulating.</p>
        <p>Daily fine rate: ₹${data.dailyFineRate}</p>
        <p>Thank you!</p>
      </div>
    `
  },
  'fine-notice': {
    subject: 'Fine Notice',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Fine Notice</h2>
        <p>Dear ${data.studentName},</p>
        <p>You have an outstanding fine:</p>
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3>Fine Details</h3>
          <p><strong>Amount:</strong> ₹${data.fineAmount}</p>
          <p><strong>Reason:</strong> ${data.fineReason}</p>
          <p><strong>Book:</strong> ${data.bookTitle}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
        </div>
        <p>Please pay the fine at the library counter to restore your borrowing privileges.</p>
        <p>Thank you!</p>
      </div>
    `
  },
  'password-reset': {
    subject: 'Password Reset Request',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>Dear ${data.name},</p>
        <p>You have requested a password reset for your library account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3498db;">${data.resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <p>Thank you!</p>
      </div>
    `
  },
  'welcome': {
    subject: 'Welcome to the Library Management System',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Welcome to the Library!</h2>
        <p>Dear ${data.name},</p>
        <p>Welcome to our library management system! Your account has been created successfully.</p>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3>Account Details</h3>
          <p><strong>Username:</strong> ${data.username}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Role:</strong> ${data.role}</p>
          ${data.registrationNumber ? `<p><strong>Registration Number:</strong> ${data.registrationNumber}</p>` : ''}
        </div>
        <p>You can now log in to your account and start borrowing books.</p>
        <p>Thank you for joining us!</p>
      </div>
    `
  }
};

// Send email function
const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      logger.warn('SendGrid API key not configured, email not sent');
      return { success: false, message: 'Email service not configured' };
    }

    let emailContent = {
      to,
      from: process.env.EMAIL_FROM,
      subject
    };

    // Use template if provided
    if (template && emailTemplates[template]) {
      emailContent.html = emailTemplates[template].html(data);
      emailContent.subject = emailTemplates[template].subject;
    } else {
      // Use custom content
      if (html) emailContent.html = html;
      if (text) emailContent.text = text;
    }

    const response = await sgMail.send(emailContent);
    
    logger.logNotification('email', to, true, { 
      template, 
      subject,
      messageId: response[0]?.headers['x-message-id'] 
    });

    return { success: true, messageId: response[0]?.headers['x-message-id'] };
  } catch (error) {
    logger.logNotification('email', to, false, { 
      template, 
      subject,
      error: error.message 
    });

    return { success: false, error: error.message };
  }
};

// Send book lent notification
const sendBookLentNotification = async (borrowing) => {
  const data = {
    studentName: `${borrowing.student.firstName} ${borrowing.student.lastName}`,
    bookTitle: borrowing.book.title,
    bookAuthor: borrowing.book.author,
    bookIsbn: borrowing.book.isbn,
    borrowedDate: borrowing.borrowedAt.toLocaleDateString(),
    dueDate: borrowing.dueDate.toLocaleDateString()
  };

  return await sendEmail({
    to: borrowing.student.email,
    template: 'book-lent',
    data
  });
};

// Send reminder notification
const sendReminderNotification = async (borrowing, daysRemaining) => {
  const data = {
    studentName: `${borrowing.student.firstName} ${borrowing.student.lastName}`,
    bookTitle: borrowing.book.title,
    bookAuthor: borrowing.book.author,
    dueDate: borrowing.dueDate.toLocaleDateString(),
    daysRemaining
  };

  return await sendEmail({
    to: borrowing.student.email,
    template: 'reminder',
    data
  });
};

// Send overdue notification
const sendOverdueNotification = async (borrowing, daysOverdue, currentFine) => {
  const data = {
    studentName: `${borrowing.student.firstName} ${borrowing.student.lastName}`,
    bookTitle: borrowing.book.title,
    bookAuthor: borrowing.book.author,
    dueDate: borrowing.dueDate.toLocaleDateString(),
    daysOverdue,
    currentFine,
    dailyFineRate: process.env.DAILY_FINE_AMOUNT || 5
  };

  return await sendEmail({
    to: borrowing.student.email,
    template: 'overdue',
    data
  });
};

// Send fine notification
const sendFineNotification = async (fine) => {
  const data = {
    studentName: `${fine.student.firstName} ${fine.student.lastName}`,
    fineAmount: fine.amount,
    fineReason: fine.reason,
    bookTitle: fine.borrowing.book.title,
    dueDate: fine.borrowing.dueDate.toLocaleDateString()
  };

  return await sendEmail({
    to: fine.student.email,
    template: 'fine-notice',
    data
  });
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const data = {
    name: user.firstName,
    username: user.username,
    email: user.email,
    role: user.role,
    registrationNumber: user.registrationNumber
  };

  return await sendEmail({
    to: user.email,
    template: 'welcome',
    data
  });
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const data = {
    name: user.firstName,
    resetUrl
  };

  return await sendEmail({
    to: user.email,
    template: 'password-reset',
    data
  });
};

// Test email service
const testEmailService = async () => {
  try {
    const testData = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student',
      registrationNumber: 'TEST123'
    };

    const result = await sendEmail({
      to: process.env.EMAIL_FROM,
      template: 'welcome',
      data: testData
    });

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendBookLentNotification,
  sendReminderNotification,
  sendOverdueNotification,
  sendFineNotification,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailService
}; 