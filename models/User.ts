import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'super_admin' | 'landlord' | 'tenant';
  isActive: boolean;
  companyName?: string;
  logo?: string;
  phone?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  screeningQuestions?: string[];
  createdAt: Date;
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
    type: String,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
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
