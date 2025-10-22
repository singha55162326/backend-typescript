const nodemailer = require("nodemailer");

// Load environment variables
require("dotenv").config({ path: "./src/.env" });

async function testEmail() {
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
    });

    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection successful!");

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: "Test Email from Stadium Booking System",
      text: "This is a test email to confirm that the email configuration is working properly.",
    });

    console.log("📧 Test email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
  }
}

testEmail();
