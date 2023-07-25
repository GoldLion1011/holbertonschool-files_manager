// import fs from 'fs';
// import { constants } from 'buffer';
// import { v4 as uuidv4 } from 'uuid';
// import path from 'path';
// import { ObjectID } from 'mongodb';
// import dbClient from '../utils/db';
// import redisClient from '../utils/redis';


// const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

// const FilesController = {
//   async postUpload(req, res) {
//     // Retrieve user based on the token
//     const token = req.headers['x-token'];
//     const userId = await redisClient.get(`auth_${token}`);

//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     // Check for required fields
//     const {
//       name, type, isPublic = false, data, parentId = 0,
//     } = req.body;
//     if (!name) {
//       return res.status(400).json({ error: 'Missing name' });
//     }
//     if (!type || !['folder', 'file', 'image'].includes(type)) {
//       return res.status(400).json({ error: 'Missing type' });
//     }
//     if (type !== 'folder' && !data) {
//       return res.status(400).json({ error: 'Missing data' });
//     }

//     // Check parentId
//     if (parentId) {
//       const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectID(parentId) }); // <-- Change this line
//       if (!parentFile) {
//         return res.status(400).json({ error: 'Parent not found' });
//       }
//       if (parentFile.type !== 'folder') {
//         return res.status(400).json({ error: 'Parent is not a folder' });
//       }
//     }

//     const fileData = {
//       userId, name, type, isPublic: isPublic || false, parentId: parentId || 0,
//     };

//     if (type === 'folder') {
//       const existingFolder = await dbClient.db.collection('files').findOne({ name, type: 'folder', parentId: parentId || 0 });
//       if (existingFolder) {
//         return res.status(400).json({ error: 'Folder already exists' });
//       }
//       const result = await dbClient.db.collection('files').insertOne(fileData);
//       return res.status(201).json({
//         id: result.insertedId, userId, name, type, isPublic: fileData.isPublic, parentId,
//       });
//     }

//     // Save the path
//     const fileUuid = uuidv4();
//     const localPath = path.join(FOLDER_PATH, fileUuid);

//     // Ensure the folder exists
//     if (!fs.existsSync(FOLDER_PATH)) {
//       fs.mkdirSync(FOLDER_PATH, { recursive: true });
//     }

//     // Save the file
//     fs.writeFileSync(localPath, data, { encoding: 'base64' });

//     fileData.localPath = localPath;

//     const result = await dbClient.db.collection('files').insertOne(fileData);
//     return res.status(201).json({
//       id: result.insertedId,
//       userId,
//       name,
//       type,
//       isPublic: fileData.isPublic,
//       parentId,
//     });
//   },

//   async getShow(req, res) {
//     const { id } = req.params;

//     // Retrieve user based on the token
//     const token = req.headers['x-token'];
//     const userId = await redisClient.get(`auth_${token}`);

//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     // Check if the file document is linked to the user and the ID passed as parameter
//     const file = await dbClient.db.collection('files').findOne({
//       _id: ObjectID(id),
//       userId,
//     });

//     if (!file) {
//       return res.status(404).json({ error: 'Not found' });
//     }

//     // Return the file document
//     return res.status(200).json(file);
//   },

//   async getIndex(req, res) {
//     let { parentId = '0', page = 0 } = req.query;

//     // Convert page to number
//     page = Number(page);

//     // Retrieve user based on the token
//     const token = req.headers['x-token'];
//     const userId = await redisClient.get(`auth_${token}`);

//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     // Pagination settings
//     const itemsPerPage = 20;
//     const skipCount = page * itemsPerPage;

//     // Find files based on the parentId and userId with pagination
//     const query = { userId };
//     if (parentId !== '0') {
//       query.parentId = ObjectId(parentId);
//     }

//     const files = await dbClient.db.collection('files')
//       .find(query)
//       .limit(itemsPerPage)
//       .skip(skipCount)
//       .toArray();

//     return res.status(200).json(files);
//   },
// };

// module.exports = FilesController;

const { v4: uuid } = require('uuid');
const mongo = require('mongodb');
const fs = require('fs');
const Redis = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static postUpload(req, res) {
    (async () => {
      const token = req.headers['x-token'];
      const key = await Redis.get(`auth_${token}`);

      if (!key) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        name, type, data, isPublic = false, parentId = 0,
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }

      if (!type) {
        return res.status(400).json({ error: 'Missing type' });
      }

      if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' });
      }

      if (parentId !== 0) {
        const project = new mongo.ObjectID(parentId);
        const file = await dbClient.db
          .collection('files')
          .findOne({ _id: project });

        if (!file) {
          return res.status(400).json({ error: 'Parent not found' });
        }

        if (file && file.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      let newFile;
      if (type === 'folder') {
        newFile = await dbClient.db.collection('files').insertOne({
          userId: new mongo.ObjectId(key),
          name,
          type,
          isPublic,
          parentId,
        });
      } else {
        const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

        if (!fs.existsSync(FOLDER_PATH)) {
          fs.mkdirSync(FOLDER_PATH);
        }

        const filePath = `${FOLDER_PATH}/${uuid()}`;
        const decode = Buffer.from(data, 'base64').toString('utf-8');

        await fs.promises.writeFile(filePath, decode);

        newFile = await dbClient.db.collection('files').insertOne({
          userId: new mongo.ObjectId(key),
          name,
          type,
          isPublic,
          parentId,
          filePath,
        });
      }

      return res.status(201).send({
        id: newFile.insertedId,
        userId: key,
        name,
        type,
        isPublic,
        parentId,
      });
    })().catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.toString() });
    });
  }

  static getShow(req, res) {
    (async () => {
      const token = req.headers['x-token'];
      const user = await Redis.get(`auth_${token}`);

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: new mongo.ObjectID(id) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (user !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    })();
  }

  static getIndex(req, res) {
    (async () => {
      const token = req.headers['x-token'];
      const user = await Redis.get(`auth_${token}`);

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { parentId, page = 0 } = req.query;

      let files;

      if (parentId) {
        files = await dbClient.db
          .collection('files')
          .aggregate([
            { $match: { parentId: new mongo.ObjectID(parentId) } },
            { $skip: page * 20 },
            { $limit: 20 },
          ])
          .toArray();
      } else {
        files = await dbClient.db
          .collection('files')
          .aggregate([
            { $match: { userId: new mongo.ObjectID(user) } },
            { $skip: page * 20 },
            { $limit: 20 },
          ])
          .toArray();
      }

      const returnFile = files.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      }));

      return res.status(200).send(returnFile);
    })();
  }

  static putPublish(req, res) {
    (async () => {
      const token = req.headers['x-token'];
      const user = await Redis.get(`auth_${token}`);

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: new mongo.ObjectID(id) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (user !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }

      file.isPublic = true;

      return res.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    })();
  }

  static putUnpublish(req, res) {
    (async () => {
      const token = req.headers['x-token'];
      const user = await Redis.get(`auth_${token}`);

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: new mongo.ObjectID(id) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (user !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }

      file.isPublic = false;

      return res.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    })();
  }

  static getFile(req, res) {
    (async () => {
      const token = req.headers['x-token'];
      const user = await Redis.get(`auth_${token}`);
      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: new mongo.ObjectID(req.params.id) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (!file.isPublic && (!user || user !== file.userId.toString())) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      if (!fs.existsSync(file.localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const data = fs.readFileSync(file.localPath);
      return res.status(200).send(data);
    })();
  }
}

module.exports = FilesController;
