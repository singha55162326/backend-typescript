import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IProfile {
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profileImage?: string;
  bio?: string;
  preferredLanguage?: string;
  timezone?: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    bookingReminders: boolean;
    promotions: boolean;
  };
}

interface IBankAccountDetails {
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountHolderName?: string;
}

interface IOwnerProfile {
  businessName?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  bankAccountDetails?: IBankAccountDetails;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: string[];
}

export interface IUser extends Document {
  email?: string | null;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'superadmin' | 'stadium_owner' | 'general_user';
  status: 'active' | 'inactive' | 'suspended';
  emailVerifiedAt?: Date;
  profile?: IProfile;
  ownerProfile?: IOwnerProfile;
  comparePassword(password: string): Promise<boolean>;
  toJSON(): any;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'stadium_owner', 'general_user'],
    default: 'general_user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  emailVerifiedAt: Date,
  profile: {
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    profileImage: String,
    bio: String,
    preferredLanguage: {
      type: String,
      default: 'lo' // Lao language
    },
    timezone: {
      type: String,
      default: 'Asia/Vientiane'
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      bookingReminders: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false }
    }
  },
  ownerProfile: {
    businessName: String,
    businessRegistrationNumber: String,
    taxId: String,
    bankAccountDetails: {
      bankName: String,
      accountNumber: String,
      routingNumber: String,
      accountHolderName: String
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    verificationDocuments: [String]
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

// Transform output
userSchema.methods.toJSON = function(): any {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;