// Defines our Users controller

const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const UsersController = {
  async postNew(req, res) {
    // Check if email and password are provided
    if (!req.body.email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!req.body.password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if email already exists
    const existingUser = await dbClient.users.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash password
    const passwordHash = crypto.createHash('sha1').update(req.body.password).digest('hex');

    // Save new user to database
    const newUser = await dbClient.users.insertOne({
      email: req.body.email,
      password: passwordHash,
    });

    // Send response
    return res.status(201).json({
      email: newUser.ops[0].email,
      id: newUser.ops[0]._id,
    });
  },

  async getMe(req, res) {
    // Check to see if the user exists
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ id: user._id.toString(), email: user.email });
  },
};

module.exports = UsersController;
