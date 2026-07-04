import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import User from '../../../../models/User';
import { getStripeClient } from '../../../../lib/stripe';
import { getDecryptedSettings } from '../../../../lib/settings';

async function getInvoicesHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    if (!req.user || !req.user.userId) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    const settings = await getDecryptedSettings();
    if (!settings.stripeEnabled) {
      return NextResponse.json(
        { success: false, error: 'Stripe integration is disabled' },
        { status: 400 }
      );
    }

    const landlord = await User.findById(req.user.userId);
    if (!landlord) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const customerId = landlord.stripeCustomerId;
    if (!customerId) {
      // Return empty list if no customer profile exists
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const stripe = await getStripeClient();
    const invoicesList = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
    });

    const formattedInvoices = invoicesList.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.total,
      status: invoice.status || 'open',
      date: new Date(invoice.created * 1000).toISOString(),
      invoicePdf: invoice.invoice_pdf || null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedInvoices,
    });
  } catch (error) {
    console.error('[Stripe Invoices] Fetch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getInvoicesHandler, ['landlord']);
export const dynamic = 'force-dynamic';
