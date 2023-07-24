import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  async postUpload(req, res) {
    // Retrieve user based on the token
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check for required fields
    const {
      name, type, isPublic = false, data, parentId = 0,
    } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Check parentId
    if (parentId) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectID(parentId) }); // <-- Change this line
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId, name, type, isPublic: isPublic || false, parentId: parentId || 0,
    };

    if (type === 'folder') {
      const existingFolder = await dbClient.db.collection('files').findOne({ name, type: 'folder', parentId: parentId || 0 });
      if (existingFolder) {
        return res.status(400).json({ error: 'Folder already exists' });
      }
      const result = await dbClient.db.collection('files').insertOne(fileData);
      return res.status(201).json({
        id: result.insertedId, userId, name, type, isPublic: fileData.isPublic, parentId,
      });
    }

    // Save the path
    const fileUuid = uuidv4();
    const localPath = path.join(FOLDER_PATH, fileUuid);

    // Ensure the folder exists
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    // Save the file
    fs.writeFileSync(localPath, data, { encoding: 'base64' });

    fileData.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(fileData);
    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic: fileData.isPublic,
      parentId,
    });
  },
};

module.exports = FilesController;
