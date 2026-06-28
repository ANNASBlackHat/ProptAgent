import mongoose, { Schema, Document, Model } from 'mongoose';

export type LeaseStatus = 'active' | 'expiring_soon' | 'expired' | 'terminated';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'online' | 'other';

export interface ILeaseDocument {
  filename: string;
  path: string;
  uploadedAt: Date;
}

export interface IPaymentLog {
  paidDate: Date;
  amount: number;
  method: PaymentMethod;
  notes?: string;
  loggedAt: Date;
  loggedBy: mongoose.Types.ObjectId;
}

export interface ILease extends Document {
  applicationId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount: number;
  specialTerms?: string;
  status: LeaseStatus;
  documents: ILeaseDocument[];
  paymentLog: IPaymentLog[];
  terminationReason?: string;
  terminatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaseDocumentSchema = new Schema<ILeaseDocument>(
  {
    filename: { type: String, required: true },
    path: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PaymentLogSchema = new Schema<IPaymentLog>(
  {
    paidDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: [0, 'Amount cannot be negative'] },
    method: {
      type: String,
      enum: {
        values: ['cash', 'bank_transfer', 'online', 'other'],
        message: 'Payment method must be cash, bank_transfer, online, or other',
      },
      required: true,
    },
    notes: { type: String, trim: true },
    loggedAt: { type: Date, default: Date.now },
    loggedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const LeaseSchema = new Schema<ILease>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application ID is required'],
      index: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Unit ID is required'],
      index: true,
    },
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
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    monthlyRent: {
      type: Number,
      required: [true, 'Monthly rent is required'],
      min: [0, 'Monthly rent cannot be negative'],
    },
    depositAmount: {
      type: Number,
      required: [true, 'Deposit amount is required'],
      min: [0, 'Deposit amount cannot be negative'],
    },
    specialTerms: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'expiring_soon', 'expired', 'terminated'],
        message: 'Status must be active, expiring_soon, expired, or terminated',
      },
      default: 'active',
      index: true,
    },
    documents: {
      type: [LeaseDocumentSchema],
      default: [],
    },
    paymentLog: {
      type: [PaymentLogSchema],
      default: [],
    },
    terminationReason: {
      type: String,
      trim: true,
    },
    terminatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
LeaseSchema.index({ landlordId: 1, status: 1 });
LeaseSchema.index({ tenantId: 1, status: 1 });

const Lease: Model<ILease> =
  mongoose.models.Lease || mongoose.model<ILease>('Lease', LeaseSchema);

export default Lease;
