// src/utils/testQRCode.ts
import { QRCodeGenerator } from './qrCodeGenerator';

async function testQRCode() {
  try {
    // Test bank transfer QR code
    const bankQR = await QRCodeGenerator.generateBankTransferQR({
      accountNumber: '1234567890',
      accountName: 'Stadium Owner',
      bankName: 'Lao Development Bank',
      amount: 500000,
      currency: 'LAK',
      description: 'Booking Payment'
    });
    
    console.log('Bank Transfer QR Code Generated:');
    console.log(bankQR.substring(0, 50) + '...'); // Show first 50 chars
    
    // Test general payment QR code
    const paymentQR = await QRCodeGenerator.generatePaymentQR({
      amount: 500000,
      currency: 'LAK',
      description: 'Stadium Booking Payment',
      reference: 'BK1234567890'
    });
    
    console.log('Payment QR Code Generated:');
    console.log(paymentQR.substring(0, 50) + '...'); // Show first 50 chars
    
    console.log('QR Code generation test completed successfully!');
  } catch (error) {
    console.error('QR Code test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testQRCode();
}

export default testQRCode;