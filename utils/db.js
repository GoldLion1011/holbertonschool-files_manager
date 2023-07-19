// MongoDB

const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.isAlive = false; // Initialize isAlive to false by default
  }

  async connect() {
    try {
      await this.client.connect();
      this.isAlive = true;
    } catch (error) {
      this.isAlive = false;
    }
  }

  async isAlive() {
    return this.isAlive;
  }

  async nbUsers() {
    try {
      await this.client.connect();
      const db = this.client.db();
      const usersCollection = db.collection('users');
      const numUsers = await usersCollection.countDocuments();
      return numUsers;
    } catch (error) {
      return 0;
    }
  }

  async nbFiles() {
    try {
      await this.client.connect();
      const db = this.client.db();
      const filesCollection = db.collection('files');
      const numFiles = await filesCollection.countDocuments();
      return numFiles;
    } catch (error) {
      return 0;
    }
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
