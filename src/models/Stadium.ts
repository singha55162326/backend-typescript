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

interface IFieldPricing {
  baseHourlyRate: number;
  currency: string;
  seasonalRates?: ISeasonalRate[];
}

interface ITimeSlot {
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  specialRate?: number;
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

interface IField {
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
    coordinates: [number, number]; // [longitude, latitude]
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
  totalBookings?: number;
  totalRevenue?: number;
  lastUpdated?: Date;
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
}

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

const stadiumSchema = new Schema<IStadium>({
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  address: {
    street: String,
    city: {
      type: String,
      required: true
    },
    state: String,
    country: {
      type: String,
      default: 'Laos'
    },
    postalCode: String,
     coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function(coords: number[]) {
            // More flexible validation for Laos coordinates
            return coords.length === 2 && 
                   coords[0] >= 100 && coords[0] <= 108 && // Longitude range for Laos
                   coords[1] >= 13 && coords[1] <= 23;     // Latitude range for Laos
          },
          message: 'Coordinates must be valid Laos coordinates [longitude between 100-108, latitude between 13-23]'
        }
      }
    }
  },
  capacity: {
    type: Number,
    required: true
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
    totalFields: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
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