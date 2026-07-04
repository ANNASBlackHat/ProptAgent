import { dbConnect } from './db';
import SystemSettings, { decryptField } from '../models/SystemSettings';

export async function getDecryptedSettings() {
  await dbConnect();
  const settings = await SystemSettings.getSingleton();
  return {
    appName: settings.appName,
    aiModel: settings.aiModel,
    openaiApiKey: settings.openaiApiKey ? decryptField(settings.openaiApiKey) : process.env.AI_API_KEY || '',
    aiProvider: settings.aiProvider || process.env.AI_PROVIDER || 'openai',
    aiBaseUrl: settings.aiBaseUrl !== undefined ? settings.aiBaseUrl : process.env.AI_BASE_URL || '',
    aiApiKey: settings.aiApiKey ? decryptField(settings.aiApiKey) : process.env.AI_API_KEY || '',
    smtpHost: settings.smtpHost || process.env.SMTP_HOST || '',
    smtpPort: settings.smtpPort || process.env.SMTP_PORT || '',
    smtpUser: settings.smtpUser || process.env.SMTP_USER || '',
    smtpPass: settings.smtpPass ? decryptField(settings.smtpPass) : process.env.SMTP_PASS || '',
    smtpFrom: settings.smtpFrom || process.env.SMTP_FROM || '',
    stripePublishableKey: (settings as any).stripePublishableKey || process.env.STRIPE_PUBLISHABLE_KEY || '',
    stripeSecretKey: (settings as any).stripeSecretKey ? decryptField((settings as any).stripeSecretKey) : process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: (settings as any).stripeWebhookSecret ? decryptField((settings as any).stripeWebhookSecret) : process.env.STRIPE_WEBHOOK_SECRET || '',
    stripeCurrency: (settings as any).stripeCurrency || process.env.STRIPE_CURRENCY || 'usd',
    stripeEnabled: (settings as any).stripeEnabled !== undefined ? (settings as any).stripeEnabled : process.env.STRIPE_ENABLED === 'true',
  };
}
