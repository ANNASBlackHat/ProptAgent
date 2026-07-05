import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import SystemSettings, { encryptField } from '@/models/SystemSettings';
import { deleteFile } from '@/lib/storage';

// GET /api/admin/settings — get system settings (sensitive fields masked)
async function getHandler(_req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();
    const settings = await SystemSettings.getSingleton();

    // Return settings with sensitive fields masked
    return NextResponse.json({
      success: true,
      data: {
        appName: settings.appName,
        appLogo: settings.appLogo,
        aiModel: settings.aiModel,
        aiProvider: settings.aiProvider || 'openai',
        aiBaseUrl: settings.aiBaseUrl || '',
        aiApiKey: settings.aiApiKey ? '••••••••••••••••' : '',
        aiApiKeyConfigured: !!settings.aiApiKey,
        openaiApiKey: settings.openaiApiKey ? '••••••••••••••••' : '',
        openaiApiKeyConfigured: !!settings.openaiApiKey,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass ? '••••••••' : '',
        smtpPassConfigured: !!settings.smtpPass,
        smtpFrom: settings.smtpFrom,
        stripePublishableKey: (settings as any).stripePublishableKey || '',
        stripeSecretKey: (settings as any).stripeSecretKey ? '••••••••••••••••' : '',
        stripeSecretKeyConfigured: !!(settings as any).stripeSecretKey,
        stripeWebhookSecret: (settings as any).stripeWebhookSecret ? '••••••••••••••••' : '',
        stripeWebhookSecretConfigured: !!(settings as any).stripeWebhookSecret,
        stripeCurrency: (settings as any).stripeCurrency || 'usd',
        stripeEnabled: (settings as any).stripeEnabled || false,
        storageProvider: settings.storageProvider || 'local',
        imagekitPublicKey: settings.imagekitPublicKey || '',
        imagekitPrivateKey: settings.imagekitPrivateKey ? '••••••••••••••••' : '',
        imagekitPrivateKeyConfigured: !!settings.imagekitPrivateKey,
        imagekitUrlEndpoint: settings.imagekitUrlEndpoint || '',
        emailTemplates: settings.emailTemplates,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Admin] GET /api/admin/settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings — update system settings
async function putHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();
    const body = await req.json();

    const settings = await SystemSettings.getSingleton();

    // General
    if (body.appName !== undefined) settings.appName = body.appName;
    if (body.appLogo !== undefined) {
      const oldLogo = settings.appLogo;
      if (oldLogo && oldLogo.fileId && (oldLogo.fileId !== body.appLogo.fileId || oldLogo.url !== body.appLogo.url)) {
        await deleteFile(oldLogo.fileId, oldLogo.provider);
      }
      settings.appLogo = body.appLogo;
    }

    // AI config
    if (body.aiProvider !== undefined) settings.aiProvider = body.aiProvider;
    if (body.aiBaseUrl !== undefined) settings.aiBaseUrl = body.aiBaseUrl;
    if (body.aiModel !== undefined) settings.aiModel = body.aiModel;
    // Only update if a real value is provided (not the mask)
    if (body.aiApiKey !== undefined) {
      if (body.aiApiKey === '') {
        settings.aiApiKey = '';
      } else if (!body.aiApiKey.includes('•')) {
        settings.aiApiKey = encryptField(body.aiApiKey);
      }
    }
    if (body.clearAiApiKey) {
      settings.aiApiKey = '';
    }

    // Keep legacy support for openaiApiKey
    if (body.openaiApiKey !== undefined) {
      if (body.openaiApiKey === '') {
        settings.openaiApiKey = '';
      } else if (!body.openaiApiKey.includes('•')) {
        settings.openaiApiKey = encryptField(body.openaiApiKey);
      }
    }
    if (body.clearOpenaiApiKey) {
      settings.openaiApiKey = '';
    }

    // SMTP config
    if (body.smtpHost !== undefined) settings.smtpHost = body.smtpHost;
    if (body.smtpPort !== undefined) settings.smtpPort = String(body.smtpPort);
    if (body.smtpUser !== undefined) settings.smtpUser = body.smtpUser;
    if (body.smtpFrom !== undefined) settings.smtpFrom = body.smtpFrom;
    if (body.smtpPass && !body.smtpPass.includes('•')) {
      settings.smtpPass = encryptField(body.smtpPass);
    }
    if (body.clearSmtpPass) {
      settings.smtpPass = '';
    }

    // Stripe config
    if (body.stripePublishableKey !== undefined) (settings as any).stripePublishableKey = body.stripePublishableKey;
    if (body.stripeCurrency !== undefined) (settings as any).stripeCurrency = body.stripeCurrency;
    if (body.stripeEnabled !== undefined) (settings as any).stripeEnabled = body.stripeEnabled;

    if (body.stripeSecretKey !== undefined) {
      if (body.stripeSecretKey === '') {
        (settings as any).stripeSecretKey = '';
      } else if (!body.stripeSecretKey.includes('•')) {
        (settings as any).stripeSecretKey = encryptField(body.stripeSecretKey);
      }
    }
    if (body.clearStripeSecretKey) {
      (settings as any).stripeSecretKey = '';
    }

    if (body.stripeWebhookSecret !== undefined) {
      if (body.stripeWebhookSecret === '') {
        (settings as any).stripeWebhookSecret = '';
      } else if (!body.stripeWebhookSecret.includes('•')) {
        (settings as any).stripeWebhookSecret = encryptField(body.stripeWebhookSecret);
      }
    }
    if (body.clearStripeWebhookSecret) {
      (settings as any).stripeWebhookSecret = '';
    }

    // Storage config
    if (body.storageProvider !== undefined) settings.storageProvider = body.storageProvider;
    if (body.imagekitPublicKey !== undefined) settings.imagekitPublicKey = body.imagekitPublicKey;
    if (body.imagekitUrlEndpoint !== undefined) settings.imagekitUrlEndpoint = body.imagekitUrlEndpoint;
    if (body.imagekitPrivateKey !== undefined) {
      if (body.imagekitPrivateKey === '') {
        settings.imagekitPrivateKey = '';
      } else if (!body.imagekitPrivateKey.includes('•')) {
        settings.imagekitPrivateKey = encryptField(body.imagekitPrivateKey);
      }
    }
    if (body.clearImagekitPrivateKey) {
      settings.imagekitPrivateKey = '';
    }

    // Email templates
    if (body.emailTemplates) {
      const tpl = body.emailTemplates;
      const keys = [
        'applicationConfirmation',
        'statusChange',
        'interviewInvitation',
        'leaseWelcome',
        'leaseExpiry',
      ] as const;

      for (const key of keys) {
        if (tpl[key]) {
          if (tpl[key].subject !== undefined) {
            settings.emailTemplates[key].subject = tpl[key].subject;
          }
          if (tpl[key].body !== undefined) {
            settings.emailTemplates[key].body = tpl[key].body;
          }
        }
      }
    }

    settings.markModified('emailTemplates');
    await settings.save();

    return NextResponse.json({
      success: true,
      data: { message: 'Settings updated successfully' },
    });
  } catch (error) {
    console.error('[Admin] PUT /api/admin/settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}



export const GET = withAuth(getHandler, ['super_admin']);
export const PUT = withAuth(putHandler, ['super_admin']);
export const dynamic = 'force-dynamic';
