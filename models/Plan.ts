import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlanLimits {
  maxProperties: number; // -1 = unlimited
  maxUnitsPerProperty: number; // -1 = unlimited
  maxActiveListings: number; // -1 = unlimited
  maxApplicationsPerMonth: number; // -1 = unlimited
  aiScreeningEnabled: boolean;
  maintenanceModuleEnabled: boolean;
  customScreeningQuestions: boolean;
  maxCustomQuestions: number; // 0 if disabled
}

export interface IPlan extends Document {
  name: string;
  slug: string; // unique (e.g. "free", "pro", "business")
  description: string;
  price: number; // monthly price in cents
  yearlyPrice: number; // yearly price in cents (0 = not offered)
  isActive: boolean;
  isFeatured: boolean;
  trialDays: number;
  limits: IPlanLimits;
  stripeProductId?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanLimitsSchema = new Schema<IPlanLimits>(
  {
    maxProperties: { type: Number, required: true },
    maxUnitsPerProperty: { type: Number, required: true },
    maxActiveListings: { type: Number, required: true },
    maxApplicationsPerMonth: { type: Number, required: true },
    aiScreeningEnabled: { type: Boolean, required: true, default: false },
    maintenanceModuleEnabled: { type: Boolean, required: true, default: false },
    customScreeningQuestions: { type: Boolean, required: true, default: false },
    maxCustomQuestions: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: [true, 'Plan name is required'], trim: true },
    slug: {
      type: String,
      required: [true, 'Plan slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    price: { type: Number, required: [true, 'Monthly price is required'], min: 0 },
    yearlyPrice: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    trialDays: { type: Number, default: 0, min: 0 },
    limits: { type: PlanLimitsSchema, required: true },
    stripeProductId: { type: String },
    stripePriceIdMonthly: { type: String },
    stripePriceIdYearly: { type: String },
  },
  {
    timestamps: true,
  }
);

const Plan: Model<IPlan> = mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);

export default Plan;
