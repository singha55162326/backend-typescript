// src/utils/qrCodeGenerator.ts
import QRCode from 'qrcode';

export class QRCodeGenerator {
  /**
   * Generate QR code as base64 data URL
   * @param data - Data to encode in QR code
   * @param options - QR code options
   * @returns Base64 encoded QR code image
   */
  static async generateQRCode(
    data: string,
    options: QRCode.QRCodeToDataURLOptions = {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }
  ): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(data, options);
      // Extract base64 data from data URL
      const base64Data = dataUrl.split(',')[1];
      return base64Data;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code for bank transfer payment
   * @param accountInfo - Bank account information
   * @returns Base64 encoded QR code image
   */
  static async generateBankTransferQR(
    accountInfo: {
      accountNumber: string;
      accountName: string;
      bankName?: string;
      amount?: number;
      currency?: string;
      description?: string;
    }
  ): Promise<string> {
    try {
      // Create a standardized string format for bank transfers
      const qrData = [
        'BANK_TRANSFER',
        accountInfo.bankName || 'BANK',
        accountInfo.accountNumber,
        accountInfo.accountName,
        accountInfo.amount ? `${accountInfo.amount}` : '',
        accountInfo.currency || 'LAK',
        accountInfo.description || ''
      ].join('|');

      return await this.generateQRCode(qrData, {
        width: 250,
        margin: 2
      });
    } catch (error) {
      console.error('Error generating bank transfer QR code:', error);
      throw new Error('Failed to generate bank transfer QR code');
    }
  }

  /**
   * Generate QR code for general payment information
   * @param paymentInfo - Payment information
   * @returns Base64 encoded QR code image
   */
  static async generatePaymentQR(
    paymentInfo: {
      amount: number;
      currency: string;
      description?: string;
      reference?: string;
    }
  ): Promise<string> {
    try {
      // Create a standardized string format for payments
      const qrData = [
        'PAYMENT',
        paymentInfo.amount.toString(),
        paymentInfo.currency,
        paymentInfo.description || '',
        paymentInfo.reference || ''
      ].join('|');

      return await this.generateQRCode(qrData, {
        width: 250,
        margin: 2
      });
    } catch (error) {
      console.error('Error generating payment QR code:', error);
      throw new Error('Failed to generate payment QR code');
    }
  }
}