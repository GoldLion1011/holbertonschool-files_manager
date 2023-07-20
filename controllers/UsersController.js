// Defines our Users controller

// const Redis = require('../utils/redis');
// const DB = require('../utils/db');
// const sha1 = require('sha1');

// const users = dbClient.db.collection('users');

// class UsersController {
//   static postNew(req, res) {
//     (async() => {
//       const { email, password } = req.body;

//       if (!email) {
//         return res.status(400).json({ error: 'Missing email' });
//       }

//       if (!password) {
//         return res.status(400).json({ error: 'Missing password' });
//       }

//       if (await users.findOne({ email })) {
//         return res.status(400).json({ error: 'Already exists' });
//       }

//       const passwordHash = sha1(password);
//       const user = { email, password: passwordHash };
//       const created = await users.insertOne(user);

//       return res.status(201).json({ id: created.insertedId, email });
//     })();
//   }
// }

// module.exports = UsersController;

// const { ObjectId } = require('mongodb');
// const sha1 = require('sha1');
// const dbClient = require('../utils/db');

// const UsersController = {
//   async postNew(req, res) {
//     const { email, password } = req.body;

//     // Check if email and password are provided
//     if (!email) {
//       return res.status(400).json({ error: 'Missing email' });
//     }

//     if (!password) {
//       return res.status(400).json({ error: 'Missing password' });
//     }

//     const db = dbClient.client.db();
//     const usersCollection = db.collection('users');

//     // Check if email already exists in the database
//     const existingUser = await usersCollection.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ error: 'Already exist' });
//     }

//     // Hash the password using SHA1
//     const hashedPassword = sha1(password);

//     // Create the new user object
//     const newUser = {
//       email,
//       password: hashedPassword,
//     };

//     // Save the new user to the database
//     try {
//       const result = await usersCollection.insertOne(newUser);
//       const { _id, email: insertedEmail } = result.ops[0];
//       const user = { id: _id, email: insertedEmail };

//       return res.status(201).json(user);
//     } catch (error) {
//       console.error('Error saving user to the database:', error);
//       return res.status(500).json({ error: 'Internal server error' });
//     }
//   },

//   // ... other endpoints ...
// };
// module.exports = UsersController;

const crypto = require('crypto');
const dbClient = require('../utils/db');

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
};

module.exports = UsersController;
