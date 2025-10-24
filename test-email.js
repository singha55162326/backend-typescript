const nodemailer = require("nodemailer");

// Load environment variables
require("dotenv").config({ path: "./src/.env" });

async function testEmail(toEmail) {
  try {
    // Create transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection successful!");

    // Determine recipient email
    const recipient = toEmail || process.env.SMTP_USER;

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: recipient,
      subject: "Test Email from Stadium Booking System",
      text: `This is a test email sent from the Stadium Booking System.

Recipient: ${recipient}
Timestamp: ${new Date().toISOString()}

If you received this email, the email configuration is working properly.`,
      html: `
        <h2>Test Email from Stadium Booking System</h2>
        <p>This is a test email sent from the Stadium Booking System.</p>
        <p><strong>Recipient:</strong> ${recipient}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p>If you received this email, the email configuration is working properly.</p>
      `,
    });

    console.log("📧 Test email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Recipient:", recipient);
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
  }
}

// Get recipient email from command line arguments
const toEmail = process.argv[2];

if (toEmail) {
  console.log(`Sending test email to: ${toEmail}`);
  testEmail(toEmail);
} else {
  console.log("Sending test email to default address:", process.env.SMTP_USER);
  testEmail();
}
