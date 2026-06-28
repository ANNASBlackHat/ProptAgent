import mongoose, { Schema, Document, Model } from 'mongoose';

export type UnitType = 'studio' | '1BR' | '2BR' | '3BR' | 'other';
export type UnitStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';

export interface IUnit extends Document {
  propertyId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  unitNumber: string;
  floor?: number;
  type: UnitType;
  sizeSqft?: number;
  rentAmount: number;
  depositAmount?: number;
  status: UnitStatus;
  description?: string;
  photos: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
      index: true,
    },
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord ID is required'],
      index: true,
    },
    unitNumber: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true,
      maxlength: [50, 'Unit number cannot exceed 50 characters'],
    },
    floor: {
      type: Number,
      min: [0, 'Floor must be 0 or higher'],
    },
    type: {
      type: String,
      enum: {
        values: ['studio', '1BR', '2BR', '3BR', 'other'],
        message: 'Unit type must be studio, 1BR, 2BR, 3BR, or other',
      },
      required: [true, 'Unit type is required'],
    },
    sizeSqft: {
      type: Number,
      min: [1, 'Size must be at least 1 sq ft'],
    },
    rentAmount: {
      type: Number,
      required: [true, 'Rent amount is required'],
      min: [0, 'Rent amount cannot be negative'],
    },
    depositAmount: {
      type: Number,
      min: [0, 'Deposit amount cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'occupied', 'maintenance', 'reserved'],
        message: 'Status must be available, occupied, maintenance, or reserved',
      },
      default: 'available',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    photos: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: unit numbers must be unique within a property
UnitSchema.index({ propertyId: 1, unitNumber: 1 }, { unique: true });

const Unit: Model<IUnit> =
  mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema);

export default Unit;
