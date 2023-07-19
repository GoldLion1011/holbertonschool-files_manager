// Defines the endpoints for our Express server

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const AppController = {
  async getStatus(req, res) {
    const redisAlive = await redisClient.isAlive();
    const dbAlive = await dbClient.isAlive();

    const status = {
      redis: redisAlive,
      db: dbAlive,
    };

    return res.status(200).json(status);
  },

  async getStats(req, res) {
    const numUsers = await dbClient.nbUsers();
    const numFiles = await dbClient.nbFiles();

    const stats = {
      users: numUsers,
      files: numFiles,
    };

    return res.status(200).json(stats);
  },
};

module.exports = AppController;
