require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const { clerkClient } = require('@clerk/clerk-sdk-node');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  credentials: true,
}));

app.use(bodyParser.json({ limit: '5mb' }));

const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);

// ✅ Clerk Webhook: Handles user.created, user.updated, user.deleted
app.post('/api/clerk-webhook', async (req, res) => {
  const eventType = req.body.type;
  const user = req.body.data;

  const formattedUser = {
    id: user.id,
    email: user.email_addresses?.[0]?.email_address || null,
    username: user.username || null,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    profile_img: '/public/user.png',
    created_at: new Date(user.created_at * 1000),
    last_sign_in_at: user.last_sign_in_at
      ? new Date(user.last_sign_in_at * 1000)
      : null,
    snippets: [],
  };

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    if (eventType === 'user.created') {
      await usersCollection.insertOne(formattedUser);
      console.log('✅ User inserted:', formattedUser.id);
    } else if (eventType === 'user.updated') {
      await usersCollection.updateOne(
        { id: formattedUser.id },
        { $set: formattedUser }
      );
      console.log('🔄 User updated:', formattedUser.id);
    } else if (eventType === 'user.deleted') {
      await usersCollection.deleteOne({ id: formattedUser.id });
      console.log('🗑️ User deleted from MongoDB via webhook:', formattedUser.id);
    } else {
      console.log('⚠️ Unhandled event type:', eventType);
      return res.status(400).send('Unhandled event type');
    }

    res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.status(500).send('Internal server error');
  }
});

// ✅ Save Profile Image
app.post('/api/upload-profile-image', async (req, res) => {
  const { userId, imageData } = req.body;

  if (!userId || !imageData) {
    return res.status(400).json({ message: 'Missing userId or image data' });
  }

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { id: userId },
      { $set: { profile_img: imageData } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Profile image updated!' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error('❌ Error saving profile image:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Update User Profile Info
app.post('/api/update-user-profile', async (req, res) => {
  const { userId, firstName, lastName } = req.body;

  if (!userId || !firstName || !lastName) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { id: userId },
      {
        $set: {
          first_name: firstName,
          last_name: lastName,
        },
      }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Profile updated successfully!' });
    } else {
      res.status(404).json({ message: 'User not found or no changes made' });
    }
  } catch (err) {
    console.error('❌ Error updating profile:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Get User Profile Info
app.get('/api/get-user-profile', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'Missing userId' });
  }

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      profile_img: user.profile_img || '/public/user.png',
      first_name: user.first_name,
      last_name: user.last_name,
    });
  } catch (err) {
    console.error('❌ Error fetching user profile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

//  Save a Code Snippet
app.post('/api/save-code', async (req, res) => {
  const { userId, title, language, code } = req.body;

  if (!userId || !title || !language || !code) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    // Check for duplicate title
    const user = await usersCollection.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const duplicate = user.snippets?.some(
      (snippet) => snippet.title.toLowerCase() === title.toLowerCase()
    );

    if (duplicate) {
      return res.status(409).json({ message: 'A file with this name already exists. Please choose a different name.' });
    }

    const newSnippet = {
      _id: new Date().getTime().toString(),
      title,
      language,
      code,
      createdAt: new Date(),
    };

    const result = await usersCollection.updateOne(
      { id: userId },
      { $push: { snippets: newSnippet } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Snippet saved successfully!' });
    } else {
      res.status(500).json({ message: 'Failed to save snippet.' });
    }
  } catch (err) {
    console.error('❌ Error saving snippet:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Get All Code Snippets for a User
app.get('/api/get-user-snippets', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: 'Missing userId' });

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ id: userId });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ snippets: user.snippets || [] });
  } catch (err) {
    console.error('❌ Error fetching snippets:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Update a Code Snippet
app.put('/api/update-snippet', async (req, res) => {
  const { userId, snippetId, updatedCode } = req.body;

  if (!userId || !snippetId || !updatedCode) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { id: userId, 'snippets._id': snippetId },
      { $set: { 'snippets.$.code': updatedCode } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Snippet updated successfully!' });
    } else {
      res.status(404).json({ message: 'Snippet not updated!' });
    }
  } catch (err) {
    console.error('❌ Error updating snippet:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Delete a Code Snippet
app.delete('/api/delete-snippet', async (req, res) => {
  const { userId, snippetId } = req.body;

  if (!userId || !snippetId) {
    return res.status(400).json({ message: 'Missing userId or snippetId' });
  }

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { id: userId },
      { $pull: { snippets: { _id: snippetId } } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Snippet deleted successfully!' });
    } else {
      res.status(404).json({ message: 'Snippet or user not found' });
    }
  } catch (err) {
    console.error('❌ Error deleting snippet:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Delete Clerk account only (Mongo cleanup handled by webhook)
app.delete('/api/delete-account', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Missing userId' });
  }

  try {
    await clerkClient.users.deleteUser(userId);
    console.log(`❌ Clerk account deleted: ${userId}`);
    return res.status(200).json({ message: 'Account deleted from Clerk' });
  } catch (err) {
    console.error('❌ Failed to delete Clerk user:', err.message);
    return res.status(500).json({ message: 'Error deleting account from Clerk' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
});
