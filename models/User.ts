import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IStoredFile } from './SystemSettings';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'super_admin' | 'landlord' | 'tenant';
  isActive: boolean;
  companyName?: string;
  logo?: IStoredFile;
  phone?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  screeningQuestions?: string[];
  notificationPreferences: {
    newApplication: boolean;
    leaseExpiring: boolean;
    maintenanceSubmitted: boolean;
    paymentPastDue: boolean;
  };
  createdAt: Date;
  
  // Subscription fields
  planId?: mongoose.Types.ObjectId | null;
  planSlug?: string;
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'none';
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  cancelAtPeriodEnd: boolean;
  usageThisMonth: {
    applications: number;
    resetAt?: Date | null;
  };
  subscriptionAuditTrail?: {
    action: string;
    planSlug?: string;
    reason?: string;
    timestamp: Date;
  }[];
  
  comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Prevents password from being returned in queries by default
  },
  role: {
    type: String,
    enum: ['super_admin', 'landlord', 'tenant'],
    default: 'tenant',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  companyName: {
    type: String,
    required: function(this: IUser) {
      return this.role === 'landlord';
    },
  },
  logo: {
    url: { type: String, default: '' },
    fileId: { type: String, default: '' },
    provider: { type: String, default: '' },
  },
  phone: {
    type: String,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  screeningQuestions: {
    type: [String],
    default: [],
  },
  notificationPreferences: {
    newApplication: { type: Boolean, default: true },
    leaseExpiring: { type: Boolean, default: true },
    maintenanceSubmitted: { type: Boolean, default: true },
    paymentPastDue: { type: Boolean, default: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'Plan',
    default: null,
  },
  planSlug: {
    type: String,
    default: '',
  },
  subscriptionStatus: {
    type: String,
    enum: ['trialing', 'active', 'past_due', 'cancelled', 'expired', 'none'],
    default: 'none',
  },
  trialEndsAt: {
    type: Date,
    default: null,
  },
  currentPeriodStart: {
    type: Date,
    default: null,
  },
  currentPeriodEnd: {
    type: Date,
    default: null,
  },
  stripeCustomerId: {
    type: String,
    default: null,
  },
  stripeSubscriptionId: {
    type: String,
    default: null,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
  usageThisMonth: {
    applications: {
      type: Number,
      default: 0,
    },
    resetAt: {
      type: Date,
      default: null,
    },
  },
  subscriptionAuditTrail: [
    {
      action: { type: String, required: true },
      planSlug: { type: String },
      reason: { type: String },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

// Pre-save hook to hash password
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password!, salt);
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(plain: string): Promise<boolean> {
  // Since password might be unselected by default, we ensure we have it before comparing
  if (!this.password) {
    throw new Error('Password field is not selected');
  }
  return bcrypt.compare(plain, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
