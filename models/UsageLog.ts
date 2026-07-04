import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUsageLog extends Document {
  landlordId: mongoose.Types.ObjectId;
  month: string; // e.g. "2025-01"
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageLogSchema = new Schema<IUsageLog>(
  {
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord ID is required'],
      index: true,
    },
    month: {
      type: String,
      required: [true, 'Month string (YYYY-MM) is required'],
      trim: true,
      index: true,
    },
    applicationsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness of usage log per landlord per month
UsageLogSchema.index({ landlordId: 1, month: 1 }, { unique: true });

const UsageLog: Model<IUsageLog> =
  mongoose.models.UsageLog || mongoose.model<IUsageLog>('UsageLog', UsageLogSchema);

export default UsageLog;
