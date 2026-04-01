// Seed admin notifications for testing (PostgreSQL/CockroachDB)
require('dotenv').config();

async function seedNotifications() {
    const { connectToDatabase, disconnectFromDatabase, getCollection } = await import('./lib/db.js');

    try {
        await connectToDatabase();
        const notifications = getCollection('admin_notifications');

        // Clear existing notifications
        await notifications.deleteMany({});

        const now = new Date();
        const testNotifications = [
            {
                title: 'New Contest Pending Approval',
                message: 'The contest "AI Hackathon 2025" has been submitted and requires your approval to go live.',
                type: 'warning',
                category: 'contest',
                link: '/contests',
                read: false,
                createdAt: new Date(now - 10 * 60 * 1000),
            },
            {
                title: 'New User Registration',
                message: '5 new students have registered in the last hour.',
                type: 'info',
                category: 'user',
                link: '/users',
                read: false,
                createdAt: new Date(now - 30 * 60 * 1000),
            },
            {
                title: 'Security Alert',
                message: 'Multiple failed login attempts detected from IP 192.168.1.100. Consider blocking this IP.',
                type: 'error',
                category: 'security',
                link: '/security',
                read: false,
                createdAt: new Date(now - 2 * 60 * 60 * 1000),
            },
            {
                title: 'Course Published Successfully',
                message: 'The course "React Advanced Patterns" has been published and is now available.',
                type: 'success',
                category: 'course',
                link: '/courses',
                read: true,
                createdAt: new Date(now - 5 * 60 * 60 * 1000),
            },
            {
                title: 'System Maintenance Scheduled',
                message: 'Platform maintenance is scheduled for tonight at 2:00 AM. Expected downtime: 30 minutes.',
                type: 'info',
                category: 'system',
                read: true,
                createdAt: new Date(now - 24 * 60 * 60 * 1000),
            },
            {
                title: 'User Milestone Reached',
                message: 'Congratulations! ContestHub has reached 1,000 active students!',
                type: 'success',
                category: 'system',
                read: true,
                createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
            },
        ];

        const result = await notifications.insertMany(testNotifications);
        // eslint-disable-next-line no-console
        console.log('Seeded', result.insertedCount, 'notifications successfully!');
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error seeding notifications:', error);
        process.exitCode = 1;
    } finally {
        try {
            await disconnectFromDatabase();
        } catch {
            // ignore
        }
    }
}

seedNotifications();
