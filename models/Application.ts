import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Sub-types ───────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'pending'
  | 'shortlisted'
  | 'under_review'
  | 'approved'
  | 'declined';

export type EmploymentStatus =
  | 'employed'
  | 'self_employed'
  | 'unemployed'
  | 'student'
  | 'retired';

export type AIRecommendation = 'shortlist' | 'review_manually' | 'decline';

export interface ITenantInfo {
  name: string;
  email: string;
  phone: string;
  currentAddress: string;
  moveInDate: Date;
}

export interface IEmployment {
  status: EmploymentStatus;
  employer?: string;
  jobTitle?: string;
  monthlyIncome?: number;
  employmentDuration?: string;
}

export interface IReference {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface IAITranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IAIScore {
  overall: number | null;
  incomeStability: number | null;
  communicationClarity: number | null;
  rentalHistorySignals: number | null;
  redFlags: string[];
  recommendation: AIRecommendation;
  scoreSummary?: string;
  scoredAt: Date;
}

export interface IStatusHistory {
  status: ApplicationStatus;
  changedAt: Date;
  changedBy?: mongoose.Types.ObjectId;
  note?: string;
}

// ─── Main Interface ───────────────────────────────────────────────────────────

export interface IApplication extends Document {
  unitId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  tenantInfo: ITenantInfo;
  employment: IEmployment;
  references: IReference[];
  additionalNotes?: string;
  status: ApplicationStatus;
  applicationLink: string;
  aiScreeningStarted: boolean;
  aiTranscript: IAITranscriptEntry[];
  aiScore?: IAIScore;
  statusHistory: IStatusHistory[];
  interviewToken?: string;
  interviewTokenExpiry?: Date;
  interviewStatus: 'not_started' | 'sent' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const TenantInfoSchema = new Schema<ITenantInfo>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    currentAddress: { type: String, required: true, trim: true },
    moveInDate: { type: Date, required: true },
  },
  { _id: false }
);

const EmploymentSchema = new Schema<IEmployment>(
  {
    status: {
      type: String,
      enum: ['employed', 'self_employed', 'unemployed', 'student', 'retired'],
      required: true,
    },
    employer: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    monthlyIncome: { type: Number, min: 0 },
    employmentDuration: { type: String, trim: true },
  },
  { _id: false }
);

const ReferenceSchema = new Schema<IReference>(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

const AITranscriptEntrySchema = new Schema<IAITranscriptEntry>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AIScoreSchema = new Schema<IAIScore>(
  {
    overall: { type: Number, min: 1, max: 10, default: null },
    incomeStability: { type: Number, min: 1, max: 10, default: null },
    communicationClarity: { type: Number, min: 1, max: 10, default: null },
    rentalHistorySignals: { type: Number, min: 1, max: 10, default: null },
    redFlags: { type: [String], default: [] },
    recommendation: {
      type: String,
      enum: ['shortlist', 'review_manually', 'decline'],
    },
    scoreSummary: { type: String, default: null },
    scoredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'under_review', 'approved', 'declined'],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const ApplicationSchema = new Schema<IApplication>(
  {
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
    tenantInfo: { type: TenantInfoSchema, required: true },
    employment: { type: EmploymentSchema, required: true },
    references: {
      type: [ReferenceSchema],
      default: [],
      validate: {
        validator: (arr: IReference[]) => arr.length <= 2,
        message: 'Maximum 2 references allowed',
      },
    },
    additionalNotes: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'under_review', 'approved', 'declined'],
      default: 'pending',
      index: true,
    },
    applicationLink: {
      type: String,
      required: true,
      unique: false, // multiple applicants use the same link; uniqueness per unit is handled logically
    },
    aiScreeningStarted: { type: Boolean, default: false },
    aiTranscript: { type: [AITranscriptEntrySchema], default: [] },
    aiScore: { type: AIScoreSchema },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    interviewToken: { type: String, unique: true, sparse: true },
    interviewTokenExpiry: { type: Date },
    interviewStatus: {
      type: String,
      enum: ['not_started', 'sent', 'in_progress', 'completed'],
      default: 'not_started',
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for listing
ApplicationSchema.index({ landlordId: 1, status: 1, createdAt: -1 });
ApplicationSchema.index({ unitId: 1, 'tenantInfo.email': 1 });

const Application: Model<IApplication> =
  mongoose.models.Application ||
  mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;
