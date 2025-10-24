import { Request, Response, Router } from 'express';
import nodemailer from 'nodemailer';
// dotenv import removed as it's loaded in index.ts

const router = Router();

// Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * @route   POST /api/email/test
 * @desc    Send a test email
 * @access  Public (for testing purposes)
 */
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, subject, message } = req.body;

    // Validate input
    if (!to) {
      res.status(400).json({ 
        success: false, 
        message: 'Recipient email (to) is required' 
      });
      return;
    }

    // Verify connection
    await transporter.verify();
    
    // Send test email
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: to,
      subject: subject || 'Test Email from Stadium Booking System',
      text: message || `This is a test email sent from the Stadium Booking System.

Recipient: ${to}
Timestamp: ${new Date().toISOString()}

If you received this email, the email configuration is working properly.`,
      html: `
        <h2>Test Email from Stadium Booking System</h2>
        <p>This is a test email sent from the Stadium Booking System.</p>
        <p><strong>Recipient:</strong> ${to}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p>${message || 'If you received this email, the email configuration is working properly.'}</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully!',
      messageId: info.messageId,
      recipient: to
    });
  } catch (error: any) {
    console.error('Email test failed:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message 
    });
  }
});

export default router;