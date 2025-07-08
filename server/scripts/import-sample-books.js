require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const readline = require('readline');
const Book = require('../models/Book');
const sampleBooks = require('../sample-books');

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://localhost:27017/library';

async function promptAdminId() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the admin user ID to use for addedBy: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function importBooks(adminId) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    let imported = 0;
    for (const book of sampleBooks) {
      const exists = await Book.findOne({ isbn: book.isbn });
      if (!exists) {
        await Book.create({ ...book, addedBy: adminId });
        imported++;
        console.log(`Imported: ${book.title}`);
      } else {
        console.log(`Skipped (already exists): ${book.title}`);
      }
    }
    console.log(`\nImport complete. ${imported} new books added.`);
  } catch (err) {
    console.error('Error importing books:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

(async () => {
  let adminId = process.argv[2];
  if (!adminId) {
    adminId = await promptAdminId();
  }
  if (!adminId) {
    console.error('Admin user ID is required. Exiting.');
    process.exit(1);
  }
  await importBooks(adminId);
})(); 