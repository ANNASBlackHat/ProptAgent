import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

// ─── Encryption helpers ───────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const keyRaw = process.env.ENCRYPTION_KEY;
  if (!keyRaw) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined');
  }
  return crypto.createHash('sha256').update(keyRaw).digest();
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encryptField(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptField(encrypted: string): string {
  if (!encrypted || !encrypted.includes(':')) return encrypted || '';
  try {
    const [ivHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedBuf = Buffer.from(encryptedHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

// ─── Email template sub-type ─────────────────────────────────────────────────

export interface IEmailTemplate {
  subject: string;
  body: string;
}

export interface IEmailTemplates {
  applicationConfirmation: IEmailTemplate;
  statusChange: IEmailTemplate;
  interviewInvitation: IEmailTemplate;
  leaseWelcome: IEmailTemplate;
  leaseExpiry: IEmailTemplate;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface IStoredFile {
  url: string;
  fileId: string;
  provider: string;
}

export interface ISystemSettings extends Document {
  appName: string;
  appLogo: IStoredFile;
  aiProvider: string;
  aiBaseUrl: string;
  aiApiKey: string; // stored encrypted
  aiModel: string;
  openaiApiKey: string; // stored encrypted
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string; // stored encrypted
  smtpFrom: string;
  stripePublishableKey: string;
  stripeSecretKey: string; // stored encrypted
  stripeWebhookSecret: string; // stored encrypted
  stripeCurrency: string;
  stripeEnabled: boolean;
  storageProvider: string;
  imagekitPublicKey: string;
  imagekitPrivateKey: string; // stored encrypted
  imagekitUrlEndpoint: string;
  emailTemplates: IEmailTemplates;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const StoredFileSchema = new Schema<IStoredFile>(
  {
    url: { type: String, default: '' },
    fileId: { type: String, default: '' },
    provider: { type: String, default: '' },
  },
  { _id: false }
);

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
  },
  { _id: false }
);

const defaultTemplates = {
  applicationConfirmation: {
    subject: 'Application Received — {{propertyName}} Unit {{unitNumber}}',
    body: 'Hi {{tenantName}},\n\nWe have received your rental application for {{propertyName}}, Unit {{unitNumber}}. We will review it and get back to you soon.\n\nThank you,\n{{appName}} Team',
  },
  statusChange: {
    subject: 'Your Application Status Update — {{propertyName}}',
    body: 'Hi {{tenantName}},\n\nYour application for {{propertyName}}, Unit {{unitNumber}} has been updated to: {{newStatus}}.\n\n{{appName}} Team',
  },
  interviewInvitation: {
    subject: 'AI Screening Interview — {{propertyName}} Unit {{unitNumber}}',
    body: 'Hi {{tenantName}},\n\nYou are invited to complete your AI screening interview for {{propertyName}}, Unit {{unitNumber}}.\n\nClick here: {{interviewLink}}\n\nThis link expires in 48 hours.\n\n{{appName}} Team',
  },
  leaseWelcome: {
    subject: 'Welcome to {{propertyName}} — Lease Confirmed',
    body: 'Hi {{tenantName}},\n\nWelcome! Your lease for {{propertyName}}, Unit {{unitNumber}} has been confirmed. Your tenancy begins on {{startDate}}.\n\n{{appName}} Team',
  },
  leaseExpiry: {
    subject: 'Lease Expiry Notice — {{propertyName}} Unit {{unitNumber}}',
    body: 'Hi {{tenantName}},\n\nThis is a reminder that your lease for {{propertyName}}, Unit {{unitNumber}} is expiring on {{endDate}}. Please contact us to discuss renewal options.\n\n{{appName}} Team',
  },
};

// ─── Main schema ──────────────────────────────────────────────────────────────

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    appName: { type: String, default: 'PropAgent' },
    appLogo: { type: Schema.Types.Mixed, default: () => ({ url: '', fileId: '', provider: '' }) },
    aiProvider: { type: String, default: 'openai' },
    aiBaseUrl: { type: String, default: '' },
    aiApiKey: { type: String, default: '' }, // stored encrypted
    aiModel: { type: String, default: 'gpt-4o-mini' },
    openaiApiKey: { type: String, default: '' }, // stored encrypted
    smtpHost: { type: String, default: '' },
    smtpPort: { type: String, default: '' },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' }, // stored encrypted
    smtpFrom: { type: String, default: '' },
    stripePublishableKey: { type: String, default: '' },
    stripeSecretKey: { type: String, default: '' }, // stored encrypted
    stripeWebhookSecret: { type: String, default: '' }, // stored encrypted
    stripeCurrency: { type: String, default: 'usd' },
    stripeEnabled: { type: Boolean, default: false },
    storageProvider: { type: String, default: 'local' },
    imagekitPublicKey: { type: String, default: '' },
    imagekitPrivateKey: { type: String, default: '' }, // stored encrypted
    imagekitUrlEndpoint: { type: String, default: '' },
    emailTemplates: {
      applicationConfirmation: { type: EmailTemplateSchema, default: () => ({ ...defaultTemplates.applicationConfirmation }) },
      statusChange: { type: EmailTemplateSchema, default: () => ({ ...defaultTemplates.statusChange }) },
      interviewInvitation: { type: EmailTemplateSchema, default: () => ({ ...defaultTemplates.interviewInvitation }) },
      leaseWelcome: { type: EmailTemplateSchema, default: () => ({ ...defaultTemplates.leaseWelcome }) },
      leaseExpiry: { type: EmailTemplateSchema, default: () => ({ ...defaultTemplates.leaseExpiry }) },
    },
  },
  {
    timestamps: true,
  }
);

// ─── Static helper: get or create singleton ───────────────────────────────────

SystemSettingsSchema.statics.getSingleton = async function (): Promise<ISystemSettings> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      appName: process.env.APP_NAME || 'PropAgent',
      aiProvider: process.env.AI_PROVIDER || 'openai',
      aiBaseUrl: process.env.AI_BASE_URL || '',
      aiApiKey: process.env.AI_API_KEY ? encryptField(process.env.AI_API_KEY) : '',
      openaiApiKey: process.env.AI_API_KEY ? encryptField(process.env.AI_API_KEY) : '',
      aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: process.env.SMTP_PORT || '',
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS ? encryptField(process.env.SMTP_PASS) : '',
      smtpFrom: process.env.SMTP_FROM || '',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      stripeSecretKey: process.env.STRIPE_SECRET_KEY ? encryptField(process.env.STRIPE_SECRET_KEY) : '',
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? encryptField(process.env.STRIPE_WEBHOOK_SECRET) : '',
      stripeCurrency: process.env.STRIPE_CURRENCY || 'usd',
      stripeEnabled: process.env.STRIPE_ENABLED === 'true',
      storageProvider: process.env.STORAGE_PROVIDER || 'local',
      imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
      imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY ? encryptField(process.env.IMAGEKIT_PRIVATE_KEY) : '',
      imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
    });
  }
  return settings;
};

interface SystemSettingsModel extends Model<ISystemSettings> {
  getSingleton(): Promise<ISystemSettings>;
}

const SystemSettings: SystemSettingsModel =
  (mongoose.models.SystemSettings as SystemSettingsModel) ||
  mongoose.model<ISystemSettings, SystemSettingsModel>('SystemSettings', SystemSettingsSchema);

export default SystemSettings;
