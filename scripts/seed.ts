import { loadEnvConfig } from '@next/env';

// Load environment variables from .env.local or .env before any other imports
loadEnvConfig(process.cwd());

async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // Dynamically import database and models after env vars are loaded
    const { dbConnect } = await import('../lib/db');
    const User = (await import('../models/User')).default;
    const mongoose = (await import('mongoose')).default;

    // Connect to database
    await dbConnect();
    console.log('Database connected successfully.');

    const adminEmail = 'admin@propagent.com';
    const adminPassword = 'Admin123!';

    // Check if super_admin already exists
    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log(`User ${adminEmail} already exists. Updating credentials...`);
      adminUser.password = adminPassword;
      adminUser.role = 'super_admin';
      adminUser.isActive = true;
      await adminUser.save();
      console.log('Super Admin user updated successfully.');
    } else {
      console.log(`Creating Super Admin user: ${adminEmail}...`);
      adminUser = new User({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'super_admin',
        isActive: true,
      });
      await adminUser.save();
      console.log('Super Admin user created successfully.');
    }

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
