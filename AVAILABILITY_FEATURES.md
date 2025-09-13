# Stadium Booking Availability Features

## Overview
I've implemented comprehensive availability checking features that allow you to view both available and unavailable time slots for any field on any date.

## New Endpoints

### 1. Get Field Availability Overview
**Endpoint:** `GET /api/bookings/field/:stadiumId/:fieldId/availability?date=YYYY-MM-DD`

**Description:** Returns all time slots for a specific field on a given date, showing which are available and which are unavailable with reasons.

**Example Request:**
```
GET /api/bookings/field/64a1b2c3d4e5f6789012345/64a1b2c3d4e5f6789012346/availability?date=2025-12-25
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "date": "2025-12-25",
    "dayOfWeek": 3,
    "fieldInfo": {
      "id": "64a1b2c3d4e5f6789012346",
      "name": "Main Field",
      "type": "11v11",
      "surface": "natural_grass",
      "status": "active",
      "baseRate": 50000,
      "currency": "LAK"
    },
    "stadiumInfo": {
      "id": "64a1b2c3d4e5f6789012345",
      "name": "Central Stadium"
    },
    "availableSlots": [
      {
        "startTime": "06:00",
        "endTime": "08:00",
        "rate": 50000,
        "currency": "LAK",
        "status": "available"
      },
      {
        "startTime": "20:00",
        "endTime": "22:00",
        "rate": 60000,
        "currency": "LAK",
        "status": "available"
      }
    ],
    "unavailableSlots": [
      {
        "startTime": "08:00",
        "endTime": "10:00",
        "rate": 50000,
        "currency": "LAK",
        "reason": "Already booked (confirmed)",
        "status": "booked",
        "bookingStatus": "confirmed"
      },
      {
        "startTime": "12:00",
        "endTime": "14:00",
        "rate": 50000,
        "currency": "LAK",
        "reason": "Not available in schedule",
        "status": "schedule_unavailable"
      }
    ],
    "summary": {
      "totalSlots": 8,
      "availableCount": 2,
      "unavailableCount": 6
    },
    "availableReferees": [
      {
        "_id": "64a1b2c3d4e5f6789012347",
        "name": "John Referee",
        "specializations": ["football", "futsal"],
        "rate": 25000,
        "currency": "LAK"
      }
    ],
    "specialDateInfo": {
      "isSpecialDate": false
    }
  }
}
```

### 2. Check Specific Time Slot
**Endpoint:** `GET /api/bookings/field/:stadiumId/:fieldId/check-slot?date=YYYY-MM-DD&startTime=HH:mm&endTime=HH:mm`

**Description:** Checks if a specific time slot is available for booking and provides pricing information.

**Example Request:**
```
GET /api/bookings/field/64a1b2c3d4e5f6789012345/64a1b2c3d4e5f6789012346/check-slot?date=2025-12-25&startTime=14:00&endTime=16:00
```

**Response Example (Available):**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "reason": "Time slot is available for booking",
    "pricing": {
      "rate": 50000,
      "duration": 2,
      "total": 100000,
      "currency": "LAK"
    },
    "availableReferees": [
      {
        "id": "64a1b2c3d4e5f6789012347",
        "name": "John Referee",
        "rate": 25000,
        "currency": "LAK"
      }
    ]
  }
}
```

**Response Example (Unavailable):**
```json
{
  "success": true,
  "data": {
    "isAvailable": false,
    "reason": "Time slot conflicts with existing confirmed booking",
    "pricing": {
      "rate": 50000,
      "duration": 2,
      "total": 100000,
      "currency": "LAK"
    }
  }
}
```

## Key Features

### 1. Comprehensive Availability Display
- **Available Slots**: Shows all time slots that can be booked
- **Unavailable Slots**: Shows all blocked time slots with specific reasons:
  - `"schedule_unavailable"`: Not available in field schedule
  - `"booked"`: Already booked by another user
  - Field status issues (maintenance, inactive)

### 2. Detailed Information
- Field information (type, surface, pricing)
- Stadium information
- Availability summary (total, available, unavailable counts)
- Available referees for the time period
- Special date handling

### 3. Smart Validation
- Prevents checking past dates
- Validates date and time formats
- Checks field operating hours
- Handles field status (active/inactive/maintenance)

### 4. Pricing Information
- Base hourly rates
- Special rates for specific time slots
- Duration and total cost calculations
- Currency information

## Usage Scenarios

### For Customers:
1. **Browse Available Times**: Use the availability endpoint to see all open slots for a date
2. **Quick Slot Check**: Use the check-slot endpoint before attempting to book
3. **Compare Pricing**: See different rates for different time slots
4. **Plan Ahead**: Check multiple dates to find the best available times

### For Stadium Owners:
1. **Capacity Management**: View booking patterns and availability
2. **Revenue Optimization**: See which time slots are most/least popular
3. **Schedule Planning**: Understand field utilization

### For Frontend Applications:
1. **Calendar Views**: Display availability in calendar format
2. **Real-time Updates**: Check availability before allowing booking attempts
3. **User Experience**: Show clear availability status with explanations

## Error Handling

The endpoints handle various error cases:
- Invalid date formats
- Past dates
- Non-existent stadiums/fields
- Field maintenance status
- Invalid time ranges

All responses maintain consistent structure with `success` boolean and descriptive error messages.