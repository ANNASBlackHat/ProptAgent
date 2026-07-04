import Stripe from 'stripe';
import { getDecryptedSettings } from './settings';

let stripeInstance: Stripe | null = null;
let lastSecretKey: string | null = null;

/**
 * Initializes and returns a cached Stripe client using the decrypted secret key.
 */
export async function getStripeClient(): Promise<Stripe> {
  const settings = await getDecryptedSettings();
  const secretKey = settings.stripeSecretKey;

  if (!secretKey) {
    throw new Error('Stripe secret key is not configured. Please set it in Admin Settings.');
  }

  if (stripeInstance && lastSecretKey === secretKey) {
    return stripeInstance;
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2024-04-10' as any,
  });
  lastSecretKey = secretKey;

  return stripeInstance;
}

/**
 * Retrieves the Stripe publishable key from settings.
 */
export async function getStripePublishableKey(): Promise<string> {
  const settings = await getDecryptedSettings();
  return settings.stripePublishableKey;
}
