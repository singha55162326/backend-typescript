import { Router, Request, Response } from 'express';
import { BookingWidgetService } from '../services/booking-widget.service';

const router = Router();

// Get widget configuration for a stadium
router.get('/stadiums/:stadiumId/widget-config', async (req: Request, res: Response): Promise<void> => {
  try {
    const { stadiumId } = req.params;
    
    if (!stadiumId) {
      res.status(400).json({ 
        success: false, 
        error: 'Stadium ID is required' 
      });
      return; // ← Explicit return after sending response
    }
    
    const config = await BookingWidgetService.getWidgetConfig(stadiumId);
    
    res.json({ 
      success: true, 
      data: config 
    });
  } catch (error: any) {
    console.error('Error getting widget config:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get widget configuration' 
    });
  }
});

// Update widget configuration for a stadium
router.put('/stadiums/:stadiumId/widget-config', async (req: Request, res: Response): Promise<void> => {
  try {
    const { stadiumId } = req.params;
    const { config } = req.body;
    
    if (!stadiumId) {
      res.status(400).json({ 
        success: false, 
        error: 'Stadium ID is required' 
      });
      return;
    }
    
    if (!config) {
      res.status(400).json({ 
        success: false, 
        error: 'Configuration data is required' 
      });
      return;
    }
    
    const updatedConfig = await BookingWidgetService.updateWidgetConfig(stadiumId, config);
    
    res.json({ 
      success: true, 
      data: updatedConfig 
    });
  } catch (error: any) {
    console.error('Error updating widget config:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update widget configuration' 
    });
  }
});

// Get available time slots for a stadium (public endpoint)
router.get('/stadiums/:stadiumId/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { stadiumId } = req.params;
    const { date } = req.query;
    
    if (!stadiumId) {
      res.status(400).json({ 
        success: false, 
        error: 'Stadium ID is required' 
      });
      return;
    }
    
    if (!date || typeof date !== 'string') {
      res.status(400).json({ 
        success: false, 
        error: 'Date is required' 
      });
      return;
    }
    
    const availability = await BookingWidgetService.getAvailability(stadiumId, date);
    
    res.json({ 
      success: true, 
      data: availability 
    });
  } catch (error: any) {
    console.error('Error getting availability:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get availability' 
    });
  }
});

// Create booking through widget (public endpoint)
router.post('/stadiums/:stadiumId/bookings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { stadiumId } = req.params;
    const bookingData = req.body;
    
    if (!stadiumId) {
      res.status(400).json({ 
        success: false, 
        error: 'Stadium ID is required' 
      });
      return;
    }
    
    if (!bookingData) {
      res.status(400).json({ 
        success: false, 
        error: 'Booking data is required' 
      });
      return;
    }
    
    // Validate required fields
    if (!bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.customerName || !bookingData.customerEmail) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required booking information' 
      });
      return;
    }
    
    const booking = await BookingWidgetService.createBooking(stadiumId, bookingData);
    
    res.status(201).json({ 
      success: true, 
      data: booking 
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create booking' 
    });
  }
});

export default router;