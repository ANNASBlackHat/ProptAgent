import { dbConnect } from '@/lib/db';
import SystemSettings, { decryptField } from '@/models/SystemSettings';

export async function getDecryptedSettings() {
  await dbConnect();
  const settings = await SystemSettings.getSingleton();
  return {
    appName: settings.appName,
    aiModel: settings.aiModel,
    openaiApiKey: settings.openaiApiKey ? decryptField(settings.openaiApiKey) : process.env.AI_API_KEY || '',
    smtpHost: settings.smtpHost || process.env.SMTP_HOST || '',
    smtpPort: settings.smtpPort || process.env.SMTP_PORT || '587',
    smtpUser: settings.smtpUser || process.env.SMTP_USER || '',
    smtpPass: settings.smtpPass ? decryptField(settings.smtpPass) : process.env.SMTP_PASS || '',
    smtpFrom: settings.smtpFrom || process.env.SMTP_FROM || 'noreply@propagent.com',
  };
}
