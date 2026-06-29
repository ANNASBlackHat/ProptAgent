import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Lease from '@/models/Lease';
import MaintenanceRequest from '@/models/MaintenanceRequest';
import mongoose from 'mongoose';

async function getTenantDashboard(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const tenantId = new mongoose.Types.ObjectId(req.user!.userId);
    const now = new Date();

    // ── Active Lease ──────────────────────────────────────────────────────────
    const activeLease = await Lease.findOne({
      tenantId,
      status: { $in: ['active', 'expiring_soon'] },
    })
      .populate('propertyId', 'name address')
      .populate('unitId', 'unitNumber')
      .lean();

    let leaseData = null;
    if (activeLease) {
      const endDate = new Date((activeLease as any).endDate);
      const daysUntilExpiry = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const prop = (activeLease as any).propertyId;
      const unit = (activeLease as any).unitId;

      leaseData = {
        status: activeLease.status,
        endDate: activeLease.endDate,
        monthlyRent: activeLease.monthlyRent,
        propertyName: prop?.name || 'Unknown',
        unitNumber: unit?.unitNumber || 'Unknown',
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
      };
    } else {
      // Check for recently expired lease
      const expiredLease = await Lease.findOne({
        tenantId,
        status: 'expired',
      })
        .sort({ endDate: -1 })
        .populate('propertyId', 'name')
        .populate('unitId', 'unitNumber')
        .lean();

      if (expiredLease) {
        leaseData = {
          status: 'expired',
          endDate: expiredLease.endDate,
          monthlyRent: expiredLease.monthlyRent,
          propertyName: (expiredLease as any).propertyId?.name || 'Unknown',
          unitNumber: (expiredLease as any).unitId?.unitNumber || 'Unknown',
          daysUntilExpiry: 0,
        };
      }
    }

    // ── Recent Payments (last 3) ──────────────────────────────────────────────
    let recentPayments: object[] = [];
    if (activeLease) {
      const sortedPayments = [...(activeLease.paymentLog || [])].sort(
        (a: any, b: any) =>
          new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()
      );
      recentPayments = sortedPayments.slice(0, 3).map((p: any) => ({
        amount: p.amount,
        method: p.method,
        paidDate: p.paidDate,
        notes: p.notes,
      }));
    }

    // ── Maintenance ───────────────────────────────────────────────────────────
    const [openMaintenanceCount, maintenanceRequests] = await Promise.all([
      MaintenanceRequest.countDocuments({
        tenantId,
        status: { $in: ['open', 'in_progress'] },
      }),
      MaintenanceRequest.find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('propertyId', 'name')
        .populate('unitId', 'unitNumber')
        .select('title category urgency status createdAt _id')
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        lease: leaseData,
        recentPayments,
        openMaintenanceRequests: openMaintenanceCount,
        maintenanceRequests: (maintenanceRequests as any[]).map((mr) => ({
          _id: mr._id.toString(),
          title: mr.title,
          category: mr.category,
          urgency: mr.urgency,
          status: mr.status,
          createdAt: mr.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/tenant error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getTenantDashboard, ['tenant']);
