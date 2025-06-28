const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://longquestoyscommunity:jqYPiqtiQoaBCO8t@libcluster.4sdv8cw.mongodb.net/library_management';

async function createDemoUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create demo users
    const demoUsers = [
      {
        username: 'LIB01',
        email: 'admin@library.com',
        password: 'password123',
        role: 'admin',
        firstName: 'Library',
        lastName: 'Administrator',
        registrationNumber: 'ADM2024001',
        isActive: true,
        isEmailVerified: true,
        totalBooksBorrowed: 0,
        totalFinesPaid: 0
      },
      {
        username: 'STAFF01',
        email: 'staff@library.com',
        password: 'password123',
        role: 'staff',
        firstName: 'Library',
        lastName: 'Staff',
        registrationNumber: 'STAFF2024001',
        isActive: true,
        isEmailVerified: true,
        totalBooksBorrowed: 0,
        totalFinesPaid: 0
      },
      {
        username: 'STU01',
        email: 'student@library.com',
        password: 'password123',
        role: 'student',
        firstName: 'John',
        lastName: 'Doe',
        registrationNumber: 'STU2024001',
        rollNumber: 'CS2024001',
        academicCredentials: {
          department: 'Computer Science',
          year: 3,
          semester: 5,
          cgpa: 3.8
        },
        phone: '+1234567890',
        address: {
          street: '123 College Street',
          city: 'University City',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        isActive: true,
        isEmailVerified: true,
        totalBooksBorrowed: 12,
        totalFinesPaid: 5.50
      },
      {
        username: 'STU02',
        email: 'jane.smith@library.com',
        password: 'password123',
        role: 'student',
        firstName: 'Jane',
        lastName: 'Smith',
        registrationNumber: 'STU2024002',
        rollNumber: 'ENG2024001',
        academicCredentials: {
          department: 'English Literature',
          year: 2,
          semester: 3,
          cgpa: 3.9
        },
        phone: '+1234567891',
        address: {
          street: '456 University Ave',
          city: 'University City',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        isActive: true,
        isEmailVerified: true,
        totalBooksBorrowed: 8,
        totalFinesPaid: 0
      }
    ];

    // Create users using the User model (this will trigger password hashing)
    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.username} (${user.email})`);
    }

    console.log('\nDemo users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: admin@library.com / password123');
    console.log('Staff: staff@library.com / password123');
    console.log('Student 1: student@library.com / password123');
    console.log('Student 2: jane.smith@library.com / password123');

  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createDemoUsers(); 