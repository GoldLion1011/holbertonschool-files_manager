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

  async getShow(req, res) {
    const { id } = req.params;

    // Retrieve user based on the token
    // const token = req.headers['x-token'];
    // const userId = await redisClient.get(`auth_${token}`);

    // if (!userId) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    // Check if the file document is linked to the user and the ID passed as parameter
    const file = await dbClient.db.collection('files').findOne({
      _id: ObjectID(id),
      userId,
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Return the file document
    return res.status(200).json(file);
  },

  async getIndex(req, res) {
    const { parentId = '0', page = 0 } = req.query;

    // Retrieve user based on the token
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Pagination settings
    const itemsPerPage = 20;
    const skipCount = page * itemsPerPage;

     // Retrieve the list of file documents based on the parentId and userId with pagination
     const files = await dbClient.db.collection('files').find({
      parentId,
      userId,
    })
      .limit(itemsPerPage)
      .skip(skipCount)
      .toArray();

    return res.status(200).json(files);
  },    
};

module.exports = FilesController;
