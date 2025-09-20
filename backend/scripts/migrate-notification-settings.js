const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function migrateNotificationSettings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find users without notification settings or with incomplete settings
    const usersToUpdate = await User.find({
      $or: [
        { notificationSettings: { $exists: false } },
        { 'notificationSettings.follows': { $exists: false } },
        { 'notificationSettings.postsFromFollowed': { $exists: false } }
      ]
    });

    console.log(`Found ${usersToUpdate.length} users that need notification settings migration`);

    if (usersToUpdate.length === 0) {
      console.log('All users already have proper notification settings');
      return;
    }

    // Update users with default notification settings
    const updateResult = await User.updateMany(
      {
        $or: [
          { notificationSettings: { $exists: false } },
          { 'notificationSettings.follows': { $exists: false } },
          { 'notificationSettings.postsFromFollowed': { $exists: false } }
        ]
      },
      {
        $set: {
          'notificationSettings.follows': true,
          'notificationSettings.postsFromFollowed': true
        }
      }
    );

    console.log(`Migration completed: ${updateResult.modifiedCount} users updated`);

    // Verify the migration
    const verification = await User.find({
      $or: [
        { 'notificationSettings.follows': { $exists: false } },
        { 'notificationSettings.postsFromFollowed': { $exists: false } }
      ]
    });

    if (verification.length === 0) {
      console.log('Migration verification passed: All users have notification settings');
    } else {
      console.log(`Migration verification failed: ${verification.length} users still missing settings`);
    }

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateNotificationSettings().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});