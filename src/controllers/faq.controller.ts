import { Request, Response, NextFunction } from 'express';
import FaqModel from '../models/Faq.model';

export class FaqController {
  // ✅ Create new FAQ
  static async createFaqController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question, answer } = req.body;

      const faq = await FaqModel.create({ question, answer });

      res.status(201).json({
        success: true,
        message: 'FAQ created successfully',
        faq,
      });
    } catch (error) {
      console.error('Error creating FAQ:', error);
      next(error);
    }
  }

  // ✅ Get all FAQs
  static async getAllFaqsController(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const faqs = await FaqModel.find().sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        count: faqs.length,
        faqs,
      });
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      next(error);
    }
  }

  // ✅ Get FAQ by ID
  static async getFaqByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const faq = await FaqModel.findById(id);

      if (!faq) {
        res.status(404).json({ success: false, message: 'FAQ not found' });
        return;
      }

      res.status(200).json({ success: true, faq });
    } catch (error) {
      console.error('Error fetching FAQ by ID:', error);
      next(error);
    }
  }

  // ✅ Update FAQ by ID
  static async updateFaqController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { question, answer, isActive } = req.body;

      const faq = await FaqModel.findByIdAndUpdate(
        id,
        { question, answer, isActive, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!faq) {
        res.status(404).json({ success: false, message: 'FAQ not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'FAQ updated successfully',
        faq,
      });
    } catch (error) {
      console.error('Error updating FAQ:', error);
      next(error);
    }
  }

  // ✅ Delete FAQ by ID
  static async deleteFaqController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const faq = await FaqModel.findByIdAndDelete(id);

      if (!faq) {
        res.status(404).json({ success: false, message: 'FAQ not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'FAQ deleted successfully',
        faq,
      });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      next(error);
    }
  }
}