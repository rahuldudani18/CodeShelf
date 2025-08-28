require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

// Load environment variables
const clerkApiKey = process.env.CLERK_API_KEY;
const mongoUri = process.env.MONGODB_URI;

// Set up Clerk API client
const clerkApi = axios.create({
  baseURL: 'https://api.clerk.com/v1',
  headers: {
    Authorization: `Bearer ${clerkApiKey}`,
  },
});

// Fetch all users from Clerk
async function getAllClerkUsers() {
  let users = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await clerkApi.get('/users', {
      params: { limit, offset },
    });

    users = users.concat(response.data);

    if (response.data.length < limit) break;
    offset += limit;
  }

  return users;
}

// Insert users into MongoDB
async function exportToMongo(users) {
  if (users.length === 0) {
    console.log("⚠️ No users found in Clerk. Nothing to sync.");
    return;
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(); // connects to 'codeshelf' from MONGODB_URI
    const collection = db.collection('users');

    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email_addresses?.[0]?.email_address || null,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      created_at: new Date(user.created_at * 1000),
      last_sign_in_at: user.last_sign_in_at
        ? new Date(user.last_sign_in_at * 1000)
        : null,
    }));

    const result = await collection.insertMany(formattedUsers);
    console.log(`✅ Inserted ${result.insertedCount} users into MongoDB.`);
  } catch (err) {
    console.error("❌ Failed to export users:", err.message);
  } finally {
    await client.close();
  }
}

// Main execution
(async () => {
  try {
    console.log("📦 Fetching Clerk users...");
    const users = await getAllClerkUsers();
    console.log(`📥 Retrieved ${users.length} users.`);
    await exportToMongo(users);
  } catch (error) {
    console.error("❌ Script error:", error.message);
  }
})();
