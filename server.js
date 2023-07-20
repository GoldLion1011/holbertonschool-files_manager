// Express server for the app

const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
