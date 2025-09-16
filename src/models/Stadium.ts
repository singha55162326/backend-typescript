import mongoose, { Document, Model, Schema } from 'mongoose';

interface IStaffAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface IStaffCertification {
  type: string;
  level: string;
  issuedDate: Date;
  expiryDate: Date;
  certificateNumber: string;
}

interface IStaffRates {
  hourlyRate: number;
  currency: string;
  overtime?: number;
}

interface IStaff {
  name: string;
  role: 'manager' | 'referee' | 'maintenance' | 'security';
  phone?: string;
  email?: string;
  specializations?: string[];
  certifications?: IStaffCertification[];
  availability?: IStaffAvailability[];
  rates: IStaffRates;
  status?: 'active' | 'inactive' | 'suspended';
  joinedDate?: Date;
}

interface IFieldFacilities {
  goals?: boolean;
  nets?: boolean;
  lineMarking?: boolean;
  floodlights?: boolean;
}

interface ISeasonalRate {
  season: string;
  startDate: Date;
  endDate: Date;
  rate: number;
}

interface IPricingTier {
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  hourlyRate: number;
  isActive: boolean;
}

interface IFieldPricing {
  baseHourlyRate: number;
  currency: string;
  pricingTiers?: IPricingTier[];
  seasonalRates?: ISeasonalRate[];
}

interface ITimeSlot {
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  pricingTier?: string;
  hourlyRate?: number;
}

interface IDaySchedule {
  dayOfWeek: number;
  timeSlots: ITimeSlot[];
}

interface ISpecialDate {
  date: Date;
  timeSlots: ITimeSlot[];
  reason?: string;
}

export  interface IField {
  name: string;
  fieldType: '11v11' | '7v7' | '5v5' | 'futsal' | 'training';
  surfaceType: 'natural_grass' | 'artificial_grass' | 'indoor';
  dimensions?: string;
  capacity?: number;
  facilities?: IFieldFacilities;
  pricing: IFieldPricing;
  status?: 'active' | 'inactive' | 'maintenance';
  availabilitySchedule?: IDaySchedule[];
  specialDates?: ISpecialDate[];
}

interface IAddress {
  street?: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface IStadiumFacilities {
  parking?: boolean;
  changingRooms?: number;
  lighting?: boolean;
  seating?: boolean;
  refreshments?: boolean;
  firstAid?: boolean;
  security?: boolean;
}

interface IStadiumStats {
  totalFields?: number;
  averageRating?: number;
  totalReviews?: number;
  totalBookings?: number;
  totalRevenue?: number;
  lastUpdated?: Date;
}

// Add this interface for widget configuration
interface IWidgetConfig {
  enabled: boolean;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  features: {
    showPricing: boolean;
    showReviews: boolean;
    requirePhone: boolean;
  };
  customMessage?: string;
}

export interface IStadium extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  address: IAddress;
  capacity: number;
  facilities?: IStadiumFacilities;
  images?: string[];
  status?: 'active' | 'inactive' | 'maintenance';
  staff?: IStaff[];
  fields?: IField[];
  stats?: IStadiumStats;
  widgetConfig?: IWidgetConfig; // Add this line
}

const pricingTierSchema = new Schema<IPricingTier>({
  name: {
    type: String,
    required: true,
    enum: ['morning', 'afternoon', 'evening', 'weekend', 'custom']
  },
  description: String,
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6,
    required: true
  }],
  hourlyRate: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const stadiumStaffSchema = new Schema<IStaff>({
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['manager', 'referee', 'maintenance', 'security'],
    required: true
  },
  phone: String,
  email: String,
  specializations: [String],
  certifications: [{
    type: String,
    level: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateNumber: String
  }],
  availability: [{
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    startTime: String,
    endTime: String,
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  rates: {
    hourlyRate: {
    type: Number,
    required: true
    },
    currency: {
      type: String,
      default: 'LAK'
    },
    overtime: Number
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  joinedDate: {
    type: Date,
    default: Date.now
  }
});

const fieldSchema = new Schema<IField>({
  name: {
    type: String,
    required: true
  },
  fieldType: {
    type: String,
    enum: ['11v11', '7v7', '5v5', 'futsal', 'training'],
    required: true
  },
  surfaceType: {
    type: String,
    enum: ['natural_grass', 'artificial_grass', 'indoor'],
    required: true
  },
  dimensions: String,
  capacity: Number,
  facilities: {
    goals: Boolean,
    nets: Boolean,
    lineMarking: Boolean,
    floodlights: Boolean
  },
  pricing: {
    baseHourlyRate: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'LAK'
    },
    pricingTiers: [pricingTierSchema],
    seasonalRates: [{
      season: String,
      startDate: Date,
      endDate: Date,
      rate: Number
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  availabilitySchedule: [{
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    timeSlots: [{
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      },
      specialRate: Number
    }]
  }],
  specialDates: [{
    date: Date,
    timeSlots: [{
      startTime: String,
      endTime: String,
      isAvailable: Boolean,
      specialRate: Number,
      reason: String
    }]
  }]
});

const stadiumSchema: Schema<IStadium> = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000
  },
  address: {
    street: String,
    city: {
      type: String,
      required: true
    },
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number],
        index: '2dsphere'
      }
    }
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  facilities: {
    parking: Boolean,
    changingRooms: Number,
    lighting: Boolean,
    seating: Boolean,
    refreshments: Boolean,
    firstAid: Boolean,
    security: Boolean
  },
  images: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  staff: [stadiumStaffSchema],
  fields: [fieldSchema],
  stats: {
    totalFields: Number,
    averageRating: Number,
    totalReviews: Number,
    totalBookings: Number,
    totalRevenue: Number,
    lastUpdated: Date
  },
  widgetConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#2563eb'
      },
      backgroundColor: {
        type: String,
        default: '#ffffff'
      },
      textColor: {
        type: String,
        default: '#000000'
      }
    },
    features: {
      showPricing: {
        type: Boolean,
        default: true
      },
      showReviews: {
        type: Boolean,
        default: true
      },
      requirePhone: {
        type: Boolean,
        default: false
      }
    },
    customMessage: String
  }
}, {
  timestamps: true
});

// Indexes
stadiumSchema.index({ ownerId: 1 });
stadiumSchema.index({ 'address.coordinates': '2dsphere' });
stadiumSchema.index({ status: 1 });
stadiumSchema.index({ 'address.city': 1, 'address.country': 1 });

const Stadium: Model<IStadium> = mongoose.model<IStadium>('Stadium', stadiumSchema);

export default Stadium;