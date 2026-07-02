import { loadEnvConfig } from '@next/env';

// Load environment variables from .env.local or .env before any other imports
loadEnvConfig(process.cwd());

async function seed() {
  console.log('Starting database seeding...');

  try {
    // Dynamically import database and models after env vars are loaded
    const { dbConnect } = await import('../lib/db');
    const User = (await import('../models/User')).default;
    const Property = (await import('../models/Property')).default;
    const Unit = (await import('../models/Unit')).default;
    const Application = (await import('../models/Application')).default;
    const Lease = (await import('../models/Lease')).default;
    const MaintenanceRequest = (await import('../models/MaintenanceRequest')).default;
    const mongoose = (await import('mongoose')).default;

    // Connect to database
    await dbConnect();
    console.log('Database connected successfully.');

    // 1. Clean existing seed data to ensure idempotency
    const emailsToClean = [
      'admin@propagent.com',
      'demo@landlord.com',
      'second@landlord.com',
      'alice@tenant.com',
      'bob@tenant.com',
      'charlie@tenant.com'
    ];

    console.log('Cleaning existing demo data...');
    const existingUsers = await User.find({ email: { $in: emailsToClean } });
    const userIds = existingUsers.map((u) => u._id);

    if (userIds.length > 0) {
      await Property.deleteMany({ landlordId: { $in: userIds } });
      await Unit.deleteMany({ landlordId: { $in: userIds } });
      await Application.deleteMany({ landlordId: { $in: userIds } });
      await Lease.deleteMany({ landlordId: { $in: userIds } });
      await MaintenanceRequest.deleteMany({ landlordId: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
      console.log('Previous demo data cleaned.');
    }

    // 2. Create Users
    console.log('Creating users...');
    
    // Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@propagent.com',
      password: 'Admin123!',
      role: 'super_admin',
      isActive: true,
    });
    console.log('- Created Super Admin');

    // Landlords
    const landlord1 = await User.create({
      name: 'Sarah Jenkins',
      email: 'demo@landlord.com',
      password: 'Demo123!',
      role: 'landlord',
      companyName: 'Sunrise Property Group',
      phone: '555-0199',
      isActive: true,
    });
    console.log('- Created Landlord 1 (Sunrise Property Group)');

    const landlord2 = await User.create({
      name: 'Michael Scott',
      email: 'second@landlord.com',
      password: 'Demo123!',
      role: 'landlord',
      companyName: 'Metro Rentals',
      phone: '555-0200',
      isActive: true,
    });
    console.log('- Created Landlord 2 (Metro Rentals)');

    // Tenants
    const tenant1 = await User.create({
      name: 'Alice Vance',
      email: 'alice@tenant.com',
      password: 'Demo123!',
      role: 'tenant',
      isActive: true,
      phone: '555-0201',
    });
    const tenant2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@tenant.com',
      password: 'Demo123!',
      role: 'tenant',
      isActive: true,
      phone: '555-0202',
    });
    const tenant3 = await User.create({
      name: 'Charlie Brown',
      email: 'charlie@tenant.com',
      password: 'Demo123!',
      role: 'tenant',
      isActive: true,
      phone: '555-0203',
    });
    console.log('- Created 3 Tenants');

    // 3. Create Properties & Units for Landlord 1 (Sunrise Property Group)
    console.log('Creating properties & units for Sunrise Property Group...');
    const prop1 = await Property.create({
      landlordId: landlord1._id,
      name: 'Sunrise Apartments',
      address: {
        street: '123 Sunrise Blvd',
        city: 'Miami',
        state: 'FL',
        country: 'USA',
        zip: '33101',
      },
      description: 'A beautiful modern apartment complex located near the downtown district. Features a shared pool, fitness center, and gated security.',
      photos: [],
      isActive: true,
    });

    const prop2 = await Property.create({
      landlordId: landlord1._id,
      name: 'Ocean Breeze Villas',
      address: {
        street: '456 Ocean Dr',
        city: 'Miami Beach',
        state: 'FL',
        country: 'USA',
        zip: '33139',
      },
      description: 'Stunning oceanside villa rentals offering premium access to the beach, private balconies, and luxury finishes.',
      photos: [],
      isActive: true,
    });

    // Units for Property 1
    const u101 = await Unit.create({
      propertyId: prop1._id,
      landlordId: landlord1._id,
      unitNumber: '101',
      floor: 1,
      type: '1BR',
      sizeSqft: 750,
      rentAmount: 1500,
      depositAmount: 1500,
      status: 'available',
      description: 'Cozy 1 bedroom apartment with street view and modern kitchen appliances.',
      photos: [],
      isActive: true,
    });

    const u102 = await Unit.create({
      propertyId: prop1._id,
      landlordId: landlord1._id,
      unitNumber: '102',
      floor: 1,
      type: '2BR',
      sizeSqft: 1100,
      rentAmount: 2200,
      depositAmount: 2200,
      status: 'occupied',
      description: 'Spacious 2 bedroom, 2 bath unit featuring hard-wood floors and built-in laundry.',
      photos: [],
      isActive: true,
    });

    const u201 = await Unit.create({
      propertyId: prop1._id,
      landlordId: landlord1._id,
      unitNumber: '201',
      floor: 2,
      type: '2BR',
      sizeSqft: 1150,
      rentAmount: 2300,
      depositAmount: 2300,
      status: 'occupied',
      description: 'Top floor 2 bedroom unit with vaulted ceilings and private balcony.',
      photos: [],
      isActive: true,
    });

    const u202 = await Unit.create({
      propertyId: prop1._id,
      landlordId: landlord1._id,
      unitNumber: '202',
      floor: 2,
      type: '1BR',
      sizeSqft: 800,
      rentAmount: 1600,
      depositAmount: 1600,
      status: 'occupied',
      description: 'Quiet 1 bedroom unit with an extra den area, perfect for home office setup.',
      photos: [],
      isActive: true,
    });

    // Units for Property 2
    const uA = await Unit.create({
      propertyId: prop2._id,
      landlordId: landlord1._id,
      unitNumber: 'Villa A',
      floor: 1,
      type: '3BR',
      sizeSqft: 1800,
      rentAmount: 3500,
      depositAmount: 3500,
      status: 'available',
      description: 'Luxury 3 bedroom villa with ocean views, private patio, and premium upgrades.',
      photos: [],
      isActive: true,
    });

    const uB = await Unit.create({
      propertyId: prop2._id,
      landlordId: landlord1._id,
      unitNumber: 'Villa B',
      floor: 1,
      type: '2BR',
      sizeSqft: 1400,
      rentAmount: 2800,
      depositAmount: 2800,
      status: 'maintenance',
      description: '2 bedroom ocean breeze unit. Currently undergoing carpet replacement.',
      photos: [],
      isActive: true,
    });
    console.log('- Created 2 Properties and 6 Units');

    // 4. Create Properties & Units for Landlord 2 (Metro Rentals)
    console.log('Creating properties & units for Metro Rentals...');
    const propMetro = await Property.create({
      landlordId: landlord2._id,
      name: 'Metro Tower',
      address: {
        street: '789 Broadway',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zip: '10003',
      },
      description: 'High-rise residence in Greenwich Village. Steps away from parks, subways, and premium dining.',
      photos: [],
      isActive: true,
    });

    const uMetroA = await Unit.create({
      propertyId: propMetro._id,
      landlordId: landlord2._id,
      unitNumber: '12A',
      floor: 12,
      type: 'studio',
      sizeSqft: 500,
      rentAmount: 2800,
      depositAmount: 2800,
      status: 'available',
      description: 'Luminous studio apartment with panoramic city views and luxury bathroom.',
      photos: [],
      isActive: true,
    });

    const uMetroB = await Unit.create({
      propertyId: propMetro._id,
      landlordId: landlord2._id,
      unitNumber: '12B',
      floor: 12,
      type: '1BR',
      sizeSqft: 700,
      rentAmount: 3200,
      depositAmount: 3200,
      status: 'occupied',
      description: 'Charming 1 bedroom unit with exposed brick walls and high ceilings.',
      photos: [],
      isActive: true,
    });

    const uMetroC = await Unit.create({
      propertyId: propMetro._id,
      landlordId: landlord2._id,
      unitNumber: '12C',
      floor: 12,
      type: '2BR',
      sizeSqft: 1050,
      rentAmount: 4500,
      depositAmount: 4500,
      status: 'available',
      description: 'Corner 2 bedroom apartment offering dual exposures and condo-grade kitchen.',
      photos: [],
      isActive: true,
    });
    console.log('- Created 1 Property and 3 Units for Landlord 2');

    // 5. Create Applications
    console.log('Creating tenant applications...');
    // Landlord 1 - App 1 (Diana Prince, Unit 101, pending, no score)
    const app1 = await Application.create({
      unitId: u101._id,
      propertyId: prop1._id,
      landlordId: landlord1._id,
      tenantInfo: {
        name: 'Diana Prince',
        email: 'diana@test.com',
        phone: '555-0205',
        currentAddress: '777 Gateway Blvd, San Francisco, CA 94102',
        moveInDate: new Date('2026-08-01'),
      },
      employment: {
        status: 'employed',
        employer: 'Museum of Antiquities',
        jobTitle: 'Senior Curator',
        monthlyIncome: 6500,
        employmentDuration: '4 years',
      },
      references: [
        { name: 'Bruce Wayne', relationship: 'Associate', phone: '555-0100', email: 'bruce@wayne.com' }
      ],
      additionalNotes: 'Moving to Miami for a new exhibition project. Looking for a quiet, long-term stay.',
      status: 'pending',
      applicationLink: `/apply/${u101._id}`,
      aiScreeningStarted: false,
      aiTranscript: [],
      interviewStatus: 'not_started',
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    // Landlord 1 - App 2 (Bruce Wayne, Unit A, shortlisted, completed AI score 9/10)
    const app2 = await Application.create({
      unitId: uA._id,
      propertyId: prop2._id,
      landlordId: landlord1._id,
      tenantInfo: {
        name: 'Bruce Wayne',
        email: 'bruce@test.com',
        phone: '555-0100',
        currentAddress: '1007 Mountain Drive, Gotham City, NJ 07001',
        moveInDate: new Date('2026-07-15'),
      },
      employment: {
        status: 'employed',
        employer: 'Wayne Enterprises',
        jobTitle: 'Chairman of the Board',
        monthlyIncome: 75000,
        employmentDuration: '15 years',
      },
      references: [
        { name: 'Alfred Pennyworth', relationship: 'Estate Manager', phone: '555-0101', email: 'alfred@wayne.com' }
      ],
      additionalNotes: 'Need a secondary residence in Miami Beach for seasonal business travel.',
      status: 'shortlisted',
      applicationLink: `/apply/${uA._id}`,
      aiScreeningStarted: true,
      interviewStatus: 'completed',
      aiTranscript: [
        { role: 'assistant', content: 'Hello Bruce, thank you for completing your rental form. Let\'s start by discussing your employment stability. You\'ve listed Wayne Enterprises with a substantial monthly income. Can you confirm if this is expected to continue stably over the next few years?', timestamp: new Date('2026-06-20T10:00:00Z') },
        { role: 'user', content: 'Yes, I have been with Wayne Enterprises for 15 years as Chairman. My income is secure and fully verified. I can provide corporate records or tax forms if needed.', timestamp: new Date('2026-06-20T10:01:30Z') },
        { role: 'assistant', content: 'That sounds very stable, thank you. Next, let\'s cover your rental history. You\'re moving from Wayne Manor. Have you rented properties in the past, and what was your experience with prior landlords?', timestamp: new Date('2026-06-20T10:02:15Z') },
        { role: 'user', content: 'I primarily reside in Wayne Manor, which is an owned estate. However, I have leased commercial and residential properties in New York and London. I have always maintained excellent relationships with landlords, paid on time, and respected the lease guidelines.', timestamp: new Date('2026-06-20T10:04:00Z') },
        { role: 'assistant', content: 'Excellent. Finally, regarding lifestyle fit, the villa has rules about quiet hours after 10 PM. Do you anticipate any issues keeping noise to a minimum, and do you have any pets or smokers in the household?', timestamp: new Date('2026-06-20T10:04:45Z') },
        { role: 'user', content: 'No pets, no smoking. I value my privacy and peace, so I prefer quiet environments and will absolutely abide by the building guidelines.', timestamp: new Date('2026-06-20T10:06:00Z') },
        { role: 'assistant', content: 'Great! That covers all my questions. Thank you for your time, Bruce. I will compile your responses for the landlord to review.', timestamp: new Date('2026-06-20T10:06:45Z') }
      ],
      aiScore: {
        overall: 9,
        incomeStability: 10,
        communicationClarity: 9,
        rentalHistorySignals: 8,
        redFlags: [],
        recommendation: 'shortlist',
        scoreSummary: 'Applicant exhibits exceptional financial stability with income significantly exceeding 3x the monthly rent. Communication during the screening was clear, polite, and aligned with the application form. Highly recommended for shortlist.',
        scoredAt: new Date('2026-06-20T10:07:00Z')
      },
      statusHistory: [
        { status: 'pending', changedAt: new Date('2026-06-20T09:00:00Z') },
        { status: 'shortlisted', changedAt: new Date('2026-06-20T10:07:00Z') }
      ],
    });

    // Landlord 1 - App 3 (Bob Smith, Unit 201, approved, will link to Lease 2, no AI score)
    const app3 = await Application.create({
      unitId: u201._id,
      propertyId: prop1._id,
      landlordId: landlord1._id,
      tenantInfo: {
        name: 'Bob Smith',
        email: 'bob@tenant.com',
        phone: '555-0202',
        currentAddress: '99 Pinewood Ter, Atlanta, GA 30303',
        moveInDate: new Date('2026-02-01'),
      },
      employment: {
        status: 'employed',
        employer: 'Delta Airlines',
        jobTitle: 'Flight Instructor',
        monthlyIncome: 7800,
        employmentDuration: '3 years',
      },
      references: [
        { name: 'Carol Danvers', relationship: 'Supervisor', phone: '555-0888', email: 'carol@delta.com' }
      ],
      additionalNotes: 'Transferring to Delta\'s Miami base. Need to secure housing quickly.',
      status: 'approved',
      applicationLink: `/apply/${u201._id}`,
      aiScreeningStarted: false,
      interviewStatus: 'not_started',
      statusHistory: [
        { status: 'pending', changedAt: new Date('2026-01-10T12:00:00Z') },
        { status: 'approved', changedAt: new Date('2026-01-15T15:30:00Z') }
      ],
    });

    // Landlord 1 - App 4 (Peter Parker, Unit B, declined, completed AI score 3/10)
    const app4 = await Application.create({
      unitId: uB._id,
      propertyId: prop2._id,
      landlordId: landlord1._id,
      tenantInfo: {
        name: 'Peter Parker',
        email: 'peter@test.com',
        phone: '555-0456',
        currentAddress: '20 Ingram St, Forest Hills, NY 11375',
        moveInDate: new Date('2026-08-01'),
      },
      employment: {
        status: 'self_employed',
        employer: 'Daily Bugle / Freelance',
        jobTitle: 'Photographer',
        monthlyIncome: 3100,
        employmentDuration: '2 years',
      },
      references: [
        { name: 'May Parker', relationship: 'Aunt', phone: '555-0789', email: 'may@parker.org' }
      ],
      additionalNotes: 'Looking for a quiet place. Income varies but I always manage to make ends meet.',
      status: 'declined',
      applicationLink: `/apply/${uB._id}`,
      aiScreeningStarted: true,
      interviewStatus: 'completed',
      aiTranscript: [
        { role: 'assistant', content: 'Hi Peter, let\'s talk about your employment. You mentioned you are self-employed as a freelance photographer earning $3,100 per month. The monthly rent for this unit is $2,800. How do you plan to handle the rent given your income is very close to the rent amount?', timestamp: new Date('2026-06-25T14:00:00Z') },
        { role: 'user', content: 'Yeah, photography gigs fluctuate a lot. Sometimes I sell a lot of photos, other weeks are slow. I also do tutoring and delivery work on the side. It is tight, but I always prioritize rent. I haven\'t missed a payment, though I have been a week late once or twice.', timestamp: new Date('2026-06-25T14:01:40Z') },
        { role: 'assistant', content: 'Thank you for explaining. Let\'s move to your rental history. How was your relationship with your last landlord?', timestamp: new Date('2026-06-25T14:02:30Z') },
        { role: 'user', content: 'My last landlord Mr. Ditkovich was a bit difficult. He kept complaining about noisy steps and late payments, and the maintenance in the building was terrible. I had to repair my own door and lock myself. So we had some disagreements.', timestamp: new Date('2026-06-25T14:04:15Z') },
        { role: 'assistant', content: 'I see. Lastly, are you bringing any pets or do you smoke, and how many people will be occupying the villa?', timestamp: new Date('2026-06-25T14:05:00Z') },
        { role: 'user', content: 'Just me. I don\'t smoke. No pets, although sometimes I have visitors coming in at odd hours because of my photo assignments.', timestamp: new Date('2026-06-25T14:06:10Z') },
        { role: 'assistant', content: 'Got it. Thanks Peter. I will wrap up our chat and submit these notes for review.', timestamp: new Date('2026-06-25T14:06:50Z') }
      ],
      aiScore: {
        overall: 3,
        incomeStability: 2,
        communicationClarity: 6,
        rentalHistorySignals: 3,
        redFlags: [
          'Monthly income ($3,100) is well below the standard 3x rent threshold ($8,400 for a $2,800 unit).',
          'Applicant admits to paying rent late in the past.',
          'Conflict with prior landlord noted.'
        ],
        recommendation: 'decline',
        scoreSummary: 'Applicant has a significant debt-to-income ratio concern with rent consuming ~90% of stated income. Prior late payments and dispute with landlord present high risk signals. Recommend decline.',
        scoredAt: new Date('2026-06-25T14:08:00Z')
      },
      statusHistory: [
        { status: 'pending', changedAt: new Date('2026-06-25T13:00:00Z') },
        { status: 'declined', changedAt: new Date('2026-06-25T14:08:00Z') }
      ],
    });

    // Landlord 2 Applications
    const appMetro1 = await Application.create({
      unitId: uMetroA._id,
      propertyId: propMetro._id,
      landlordId: landlord2._id,
      tenantInfo: {
        name: 'Clark Kent',
        email: 'clark@test.com',
        phone: '555-0800',
        currentAddress: '344 Clinton St, Metropolis, NY 10002',
        moveInDate: new Date('2026-08-01'),
      },
      employment: {
        status: 'employed',
        employer: 'Daily Planet',
        jobTitle: 'Investigative Reporter',
        monthlyIncome: 6200,
        employmentDuration: '5 years',
      },
      references: [
        { name: 'Perry White', relationship: 'Editor-in-Chief', phone: '555-0900', email: 'perry@dailyplanet.com' }
      ],
      additionalNotes: 'Relocating to New York office. Quiet lifestyle, no pets.',
      status: 'pending',
      applicationLink: `/apply/${uMetroA._id}`,
      aiScreeningStarted: false,
      interviewStatus: 'not_started',
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    const appMetro2 = await Application.create({
      unitId: uMetroC._id,
      propertyId: propMetro._id,
      landlordId: landlord2._id,
      tenantInfo: {
        name: 'Lois Lane',
        email: 'lois@test.com',
        phone: '555-0801',
        currentAddress: '344 Clinton St, Metropolis, NY 10002',
        moveInDate: new Date('2026-08-15'),
      },
      employment: {
        status: 'employed',
        employer: 'Daily Planet',
        jobTitle: 'Chief Correspondent',
        monthlyIncome: 9500,
        employmentDuration: '8 years',
      },
      references: [
        { name: 'Perry White', relationship: 'Editor-in-Chief', phone: '555-0900', email: 'perry@dailyplanet.com' }
      ],
      additionalNotes: 'Need a spacious 2 bedroom unit for home office and archives.',
      status: 'under_review',
      applicationLink: `/apply/${uMetroC._id}`,
      aiScreeningStarted: false,
      interviewStatus: 'not_started',
      statusHistory: [
        { status: 'pending', changedAt: new Date() },
        { status: 'under_review', changedAt: new Date() }
      ],
    });
    console.log('- Created 6 Applications (with AI transcripts/scores)');

    // 6. Create Leases & Payments for Landlord 1
    console.log('Creating leases & payment logs...');
    // Lease 1: Tenant 1 (Alice Vance) on Unit 102
    const lease1 = await Lease.create({
      applicationId: app3._id, // placeholder app link
      unitId: u102._id,
      propertyId: prop1._id,
      landlordId: landlord1._id,
      tenantId: tenant1._id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      monthlyRent: 2200,
      depositAmount: 2200,
      specialTerms: 'Standard residential lease. Quiet hours enforced. Gated parking card provided.',
      status: 'active',
      documents: [
        { filename: 'signed_lease_vance.pdf', path: '/uploads/leases/dummy-vance.pdf', uploadedAt: new Date('2026-01-01T12:00:00Z') }
      ],
      paymentLog: [
        { paidDate: new Date('2026-01-02'), amount: 2200, method: 'bank_transfer', notes: 'January Rent', loggedAt: new Date('2026-01-02'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-02-01'), amount: 2200, method: 'bank_transfer', notes: 'February Rent', loggedAt: new Date('2026-02-01'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-03-03'), amount: 2200, method: 'bank_transfer', notes: 'March Rent', loggedAt: new Date('2026-03-03'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-04-01'), amount: 2200, method: 'bank_transfer', notes: 'April Rent', loggedAt: new Date('2026-04-01'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-05-02'), amount: 2200, method: 'bank_transfer', notes: 'May Rent', loggedAt: new Date('2026-05-02'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-06-01'), amount: 2200, method: 'bank_transfer', notes: 'June Rent', loggedAt: new Date('2026-06-01'), loggedBy: landlord1._id },
      ],
    });

    // Lease 2: Tenant 2 (Bob Smith) on Unit 201 (links to App 3)
    const lease2 = await Lease.create({
      applicationId: app3._id,
      unitId: u201._id,
      propertyId: prop1._id,
      landlordId: landlord1._id,
      tenantId: tenant2._id,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2027-01-31'),
      monthlyRent: 2300,
      depositAmount: 2300,
      specialTerms: 'Delta Air employee terms. Rent discount applied for initial deposit.',
      status: 'active',
      documents: [],
      paymentLog: [
        { paidDate: new Date('2026-02-01'), amount: 2300, method: 'cash', notes: 'Feb Rent & Deposit', loggedAt: new Date('2026-02-01'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-03-01'), amount: 2300, method: 'cash', notes: 'March Rent', loggedAt: new Date('2026-03-01'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-04-02'), amount: 2300, method: 'cash', notes: 'April Rent', loggedAt: new Date('2026-04-02'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-05-01'), amount: 2300, method: 'cash', notes: 'May Rent', loggedAt: new Date('2026-05-01'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-06-02'), amount: 2300, method: 'cash', notes: 'June Rent', loggedAt: new Date('2026-06-02'), loggedBy: landlord1._id },
      ],
    });

    // Lease 3: Tenant 3 (Charlie Brown) on Unit 202
    const lease3 = await Lease.create({
      applicationId: app3._id, // placeholder app link
      unitId: u202._id,
      propertyId: prop1._id,
      landlordId: landlord1._id,
      tenantId: tenant3._id,
      startDate: new Date('2026-03-15'),
      endDate: new Date('2027-03-14'),
      monthlyRent: 1600,
      depositAmount: 1600,
      specialTerms: 'No pets allowed. Ground floor noise regulations apply.',
      status: 'active',
      documents: [],
      paymentLog: [
        { paidDate: new Date('2026-03-15'), amount: 1600, method: 'online', notes: 'March Prorated & Deposit', loggedAt: new Date('2026-03-15'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-04-15'), amount: 1600, method: 'online', notes: 'April Rent', loggedAt: new Date('2026-04-15'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-05-15'), amount: 1600, method: 'online', notes: 'May Rent', loggedAt: new Date('2026-05-15'), loggedBy: landlord1._id },
        { paidDate: new Date('2026-06-15'), amount: 1600, method: 'online', notes: 'June Rent', loggedAt: new Date('2026-06-15'), loggedBy: landlord1._id },
      ],
    });
    console.log('- Created 3 Active Leases with Payment Logs');

    // 7. Create Maintenance Requests
    console.log('Creating maintenance requests...');
    // Request 1: Active/In Progress plumbing issue (Unit 102)
    await MaintenanceRequest.create({
      leaseId: lease1._id,
      unitId: u102._id,
      propertyId: prop1._id,
      landlordId: landlord1._id,
      tenantId: tenant1._id,
      category: 'plumbing',
      urgency: 'medium',
      title: 'Leaking Kitchen Sink',
      description: 'The hot water pipe under the kitchen sink has a slow but steady leak. It is collecting in a bucket, but starting to smell damp. Need someone to fix it soon.',
      photos: [],
      status: 'in_progress',
      landlordNotes: [
        { note: 'Called Miami Plumbers Express. Scheduled maintenance for Friday between 9 AM and 12 PM.', addedAt: new Date('2026-06-28'), addedBy: landlord1._id }
      ],
    });

    // Request 2: Resolved HVAC issue (Unit 201)
    await MaintenanceRequest.create({
      leaseId: lease2._id,
      unitId: u201._id,
      propertyId: prop1._id,
      landlordId: landlord1._id,
      tenantId: tenant2._id,
      category: 'hvac',
      urgency: 'urgent',
      title: 'AC Blowing Warm Air',
      description: 'The thermostat is set to cool at 71 degrees, but the registers are only blowing warm air. The temperature in the apartment has risen to 82 degrees.',
      photos: [],
      status: 'resolved',
      resolvedAt: new Date('2026-06-15'),
      landlordNotes: [
        { note: 'Urgent HVAC dispatch. AC technician from Cooler Air LLC came out today.', addedAt: new Date('2026-06-15T10:00:00Z'), addedBy: landlord1._id },
        { note: 'AC compressor capacitor was replaced, refrigerant recharged. Unit tested and cooling correctly now.', addedAt: new Date('2026-06-15T12:30:00Z'), addedBy: landlord1._id }
      ],
    });
    console.log('- Created 2 Maintenance Requests');

    console.log('\nSeeding completed successfully!');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seed();
