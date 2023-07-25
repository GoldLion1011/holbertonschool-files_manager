const Bull = require('bull');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectID } = require('mongodb');
const { thumb } = require('image-thumbnail');

const fileQueue = new Bull('fileQueue', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

fileQueue.process(async (job) => {
  const { userId, fileId, filePath } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const client = new MongoClient('mongodb://localhost:27017', {
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    const db = client.db('files_manager');
    const file = await db.collection('files').findOne({
      _id: new ObjectID(fileId),
      userId: new ObjectID(userId),
    });

    if (!file) {
      throw new Error('File not found');
    }

    const baseFileName = path.basename(filePath, path.extname(filePath));

    const thumbnailSizes = [500, 250, 100];
    for (const size of thumbnailSizes) {
      const thumbnailPath = path.join(
        path.dirname(filePath),
        `${baseFileName}_${size}${path.extname(filePath)}`
      );

      const thumbnail = await thumb(filePath, {
        width: size,
        height: size,
      });

      await fs.promises.writeFile(thumbnailPath, thumbnail);
      console.log(`Thumbnail with width ${size} generated for fileId: ${fileId}`);
    }
  } catch (error) {
    console.error('Error processing job:', error.message);
  } finally {
    client.close();
  }
});
