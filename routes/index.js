// Routes to feed our Express server

const express = require('express');

const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.get('/users', UsersController.postNew);

router.post('/users', UsersController.postNew);


module.exports = router;
