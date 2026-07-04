import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Property from '@/models/Property';
import Unit from '@/models/Unit';
import Application from '@/models/Application';
import Lease from '@/models/Lease';
import MaintenanceRequest from '@/models/MaintenanceRequest';
import mongoose from 'mongoose';

async function getLandlordDashboard(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const landlordId = new mongoose.Types.ObjectId(req.user!.userId);

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── Summary ───────────────────────────────────────────────────────────────
    const [
      totalProperties,
      totalUnits,
      occupiedUnits,
      pendingApplications,
      activeLeases,
      expiringSoonLeases,
      openMaintenanceRequests,
      urgentMaintenanceRequests,
    ] = await Promise.all([
      Property.countDocuments({ landlordId, isActive: true }),
      Unit.countDocuments({ landlordId, isActive: true }),
      Unit.countDocuments({ landlordId, isActive: true, status: 'occupied' }),
      Application.countDocuments({ landlordId, status: 'pending' }),
      Lease.countDocuments({ landlordId, status: { $in: ['active', 'expiring_soon'] } }),
      Lease.countDocuments({
        landlordId,
        status: { $in: ['active', 'expiring_soon'] },
        endDate: { $gte: now, $lte: in30Days },
      }),
      MaintenanceRequest.countDocuments({ landlordId, status: { $in: ['open', 'in_progress'] } }),
      MaintenanceRequest.countDocuments({
        landlordId,
        status: { $in: ['open', 'in_progress'] },
        urgency: 'urgent',
      }),
    ]);

    const occupancyRate =
      totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // ── Recent Activity (last 10 events) ──────────────────────────────────────
    const [
      recentApplications,
      recentLeases,
      recentMaintenance,
      expiringLeaseEvents,
    ] = await Promise.all([
      Application.find({ landlordId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('tenantInfo status updatedAt _id statusHistory')
        .lean(),
      Lease.find({ landlordId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('tenantId', 'name')
        .populate('unitId', 'unitNumber')
        .populate('propertyId', 'name')
        .select('tenantId unitId propertyId status createdAt paymentLog _id')
        .lean(),
      MaintenanceRequest.find({ landlordId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('unitId', 'unitNumber')
        .populate('propertyId', 'name')
        .select('title unitId propertyId urgency status createdAt _id')
        .lean(),
      Lease.find({
        landlordId,
        status: { $in: ['active', 'expiring_soon'] },
        endDate: { $gte: now, $lte: in30Days },
      })
        .sort({ endDate: 1 })
        .limit(5)
        .populate('tenantId', 'name')
        .populate('unitId', 'unitNumber')
        .populate('propertyId', 'name')
        .select('tenantId unitId propertyId endDate _id')
        .lean(),
    ]);

    // Build activity events array
    const activityEvents: Array<{
      type: string;
      description: string;
      relatedId: string;
      relatedModel: string;
      timestamp: Date;
    }> = [];

    for (const app of recentApplications) {
      const latestStatus = app.statusHistory?.at(-1);
      if (
        latestStatus &&
        latestStatus.status !== 'pending' &&
        new Date(latestStatus.changedAt) > new Date(app.createdAt)
      ) {
        activityEvents.push({
          type: 'status_change',
          description: `Application from ${app.tenantInfo.name} changed to ${latestStatus.status.replace('_', ' ')}`,
          relatedId: app._id.toString(),
          relatedModel: 'Application',
          timestamp: new Date(latestStatus.changedAt),
        });
      } else {
        activityEvents.push({
          type: 'new_application',
          description: `New application submitted by ${app.tenantInfo.name}`,
          relatedId: app._id.toString(),
          relatedModel: 'Application',
          timestamp: new Date(app.updatedAt),
        });
      }
    }

    for (const lease of recentLeases as any[]) {
      // Payment logged events
      if (lease.paymentLog && lease.paymentLog.length > 0) {
        const lastPayment = lease.paymentLog[lease.paymentLog.length - 1];
        activityEvents.push({
          type: 'payment_logged',
          description: `Rent payment of $${lastPayment.amount.toLocaleString()} logged for ${lease.tenantId?.name || 'tenant'} — Unit ${lease.unitId?.unitNumber || ''}`,
          relatedId: lease._id.toString(),
          relatedModel: 'Lease',
          timestamp: new Date(lastPayment.loggedAt),
        });
      }
      activityEvents.push({
        type: 'lease_created',
        description: `Lease created for ${lease.tenantId?.name || 'tenant'} at ${lease.propertyId?.name || 'property'}, Unit ${lease.unitId?.unitNumber || ''}`,
        relatedId: lease._id.toString(),
        relatedModel: 'Lease',
        timestamp: new Date(lease.createdAt),
      });
    }

    for (const mr of recentMaintenance as any[]) {
      activityEvents.push({
        type: 'maintenance_submitted',
        description: `Maintenance request "${mr.title}" submitted for ${mr.propertyId?.name || 'property'}, Unit ${mr.unitId?.unitNumber || ''} (${mr.urgency})`,
        relatedId: mr._id.toString(),
        relatedModel: 'MaintenanceRequest',
        timestamp: new Date(mr.createdAt),
      });
    }

    for (const lease of expiringLeaseEvents as any[]) {
      const daysUntil = Math.ceil(
        (new Date(lease.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      activityEvents.push({
        type: 'lease_expiring',
        description: `Lease for ${lease.tenantId?.name || 'tenant'} at ${lease.propertyId?.name || 'property'} expires in ${daysUntil} days`,
        relatedId: lease._id.toString(),
        relatedModel: 'Lease',
        timestamp: new Date(lease.endDate),
      });
    }

    // Sort and take last 10
    activityEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivity = activityEvents.slice(0, 10);

    // ── Expiring Leases (next 60 days) ────────────────────────────────────────
    const expiringLeasesRaw = await Lease.find({
      landlordId,
      status: { $in: ['active', 'expiring_soon'] },
      endDate: { $gte: now, $lte: in60Days },
    })
      .sort({ endDate: 1 })
      .populate('tenantId', 'name')
      .populate('unitId', 'unitNumber')
      .populate('propertyId', 'name')
      .lean();

    const expiringLeases = (expiringLeasesRaw as any[]).map((lease) => ({
      leaseId: lease._id.toString(),
      tenantName: lease.tenantId?.name || 'Unknown',
      propertyName: lease.propertyId?.name || 'Unknown',
      unitNumber: lease.unitId?.unitNumber || 'Unknown',
      endDate: lease.endDate,
      daysUntilExpiry: Math.ceil(
        (new Date(lease.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // ── Overdue Units (active lease, no payment this month) ──────────────────
    const activeLeasesForOverdue = await Lease.find({
      landlordId,
      status: { $in: ['active', 'expiring_soon'] },
    })
      .populate('tenantId', 'name email')
      .populate('unitId', 'unitNumber')
      .populate('propertyId', 'name')
      .lean();

    const overdueUnits = (activeLeasesForOverdue as any[])
      .filter((lease) => {
        const paymentsThisMonth = (lease.paymentLog || []).filter(
          (p: any) => new Date(p.paidDate) >= startOfMonth
        );
        return paymentsThisMonth.length === 0;
      })
      .map((lease) => {
        const sortedPayments = [...(lease.paymentLog || [])].sort(
          (a: any, b: any) =>
            new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()
        );
        return {
          unitId: lease.unitId?._id?.toString() || '',
          unitNumber: lease.unitId?.unitNumber || 'Unknown',
          propertyName: lease.propertyId?.name || 'Unknown',
          tenantName: lease.tenantId?.name || 'Unknown',
          tenantEmail: lease.tenantId?.email || '',
          lastPaymentDate: sortedPayments[0]?.paidDate || null,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProperties,
          totalUnits,
          occupiedUnits,
          occupancyRate,
          pendingApplications,
          activeLeases,
          expiringSoonLeases,
          openMaintenanceRequests,
          urgentMaintenanceRequests,
        },
        recentActivity,
        expiringLeases,
        overdueUnits,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/landlord error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getLandlordDashboard, ['landlord', 'super_admin']);
export const dynamic = 'force-dynamic';
