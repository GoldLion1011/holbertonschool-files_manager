const sha1 = require('sha1');
const mongo = require('mongodb');
const Redis = require('../utils/redis');
const dbClient = require('../utils/db');

class UsersController {
  static postNew(req, res) {
    (async () => {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      const user = await dbClient.db.collection('users').findOne({ email });
      if (user) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hash = sha1(password);
      const newUser = await dbClient.db
        .collection('users')
        .insertOne({ email, password: hash });
      return res.status(201).send({ id: newUser.insertedId, email });
    })();
  }

  static getMe(req, res) {
    (async () => {
      const token = req.headers['x-token'];
      const user = await Redis.get(`auth_${token}`);
      const userID = new mongo.ObjectID(user);
      const userData = await dbClient.db
        .collection('users')
        .findOne({ _id: userID });

      if (!userData) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      return res.status(200).send({ id: userData._id, email: userData.email });
    })();
  }
}

module.exports = UsersController;

// Defines our Users controller

// const { ObjectId } = require('mongodb');
// const sha1 = require('sha1');
// const dbClient = require('../utils/db');

// const UsersController = {
//   async postNew(req, res) {
//     const { email, password } = req.body;

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
