require('dotenv').config();
const sequelize = require('../config/db');
const { User, Department, AssetCategory } = require('../models');
const { hashPassword } = require('../utils/password');

async function seed() {
  await sequelize.sync();

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@assetflow.com').toLowerCase();
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });

  if (existingAdmin) {
    console.log(`Admin already exists (${adminEmail}). Skipping admin creation.`);
  } else {
    const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || 'Admin@123');
    const admin = await User.create({
      name: process.env.ADMIN_NAME || 'System Admin',
      email: adminEmail,
      passwordHash,
      role: 'Admin',
      status: 'Active',
    });
    console.log(`Created Admin account: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  }

  // Seed a couple of starter departments & categories so the UI isn't empty on first run
  const [generalDept] = await Department.findOrCreate({
    where: { name: 'General' },
    defaults: { status: 'Active' },
  });
  console.log(`Department ready: ${generalDept.name}`);

  const starterCategories = ['Electronics', 'Furniture', 'Vehicles', 'Meeting Rooms'];
  for (const name of starterCategories) {
    await AssetCategory.findOrCreate({ where: { name }, defaults: { customFields: '[]', status: 'Active' } });
  }
  console.log(`Categories ready: ${starterCategories.join(', ')}`);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
