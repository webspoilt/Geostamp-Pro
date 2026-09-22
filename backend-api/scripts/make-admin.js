const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = process.argv[2];

if (!email) {
    console.error('Usage: node scripts/make-admin.js <email>');
    process.exit(1);
}

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/geostamp';

async function bootstrapAdmin() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            console.error(`User with email "${email}" not found.`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();

        console.log(`✅ Success: User "${user.name}" (${user.email}) is now an admin!`);
        process.exit(0);
    } catch (err) {
        console.error('Error promoting user:', err.message);
        process.exit(1);
    }
}

bootstrapAdmin();
