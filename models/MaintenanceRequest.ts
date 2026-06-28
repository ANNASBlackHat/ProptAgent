import mongoose, { Schema, Document, Model } from 'mongoose';

export type MaintenanceCategory = 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'appliance' | 'other';
export type MaintenanceUrgency = 'low' | 'medium' | 'urgent';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface ILandlordNote {
  note: string;
  addedAt: Date;
  addedBy: mongoose.Types.ObjectId;
}

export interface IMaintenanceRequest extends Document {
  leaseId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  title: string;
  description: string;
  photos: string[];
  status: MaintenanceStatus;
  landlordNotes: ILandlordNote[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LandlordNoteSchema = new Schema<ILandlordNote>(
  {
    note: { type: String, required: true, trim: true },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const MaintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: 'Lease',
      required: [true, 'Lease ID is required'],
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
    category: {
      type: String,
      enum: {
        values: ['plumbing', 'electrical', 'hvac', 'structural', 'appliance', 'other'],
        message: 'Category must be plumbing, electrical, hvac, structural, appliance, or other',
      },
      required: [true, 'Category is required'],
    },
    urgency: {
      type: String,
      enum: {
        values: ['low', 'medium', 'urgent'],
        message: 'Urgency must be low, medium, or urgent',
      },
      required: [true, 'Urgency is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    photos: {
      type: [String],
      validate: {
        validator: function (val: string[]) {
          return val.length <= 3;
        },
        message: 'You can upload a maximum of 3 photos',
      },
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in_progress', 'resolved', 'closed'],
        message: 'Status must be open, in_progress, resolved, or closed',
      },
      default: 'open',
      index: true,
    },
    landlordNotes: {
      type: [LandlordNoteSchema],
      default: [],
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
MaintenanceRequestSchema.index({ landlordId: 1, status: 1 });
MaintenanceRequestSchema.index({ tenantId: 1, status: 1 });
MaintenanceRequestSchema.index({ propertyId: 1, status: 1 });

const MaintenanceRequest: Model<IMaintenanceRequest> =
  mongoose.models.MaintenanceRequest ||
  mongoose.model<IMaintenanceRequest>('MaintenanceRequest', MaintenanceRequestSchema);

export default MaintenanceRequest;
