// Routes to feed our Express server

const express = require('express');

const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController');
const FilesController = require('../controllers/FilesController');

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users', UsersController.postNew);
router.get('/users/me', UsersController.getMe);
router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);
router.get('/files/:id/data', FilesController.getFile);

router.post('/users', UsersController.postNew);
router.post('/files', FilesController.postUpload);

router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);

module.exports = router;
