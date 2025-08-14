// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'web' folder
app.use(express.static('web'));

// Log incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// In-memory database
let users = [
  { id: 1, name: 'John Doe' },
  { id: 2, name: 'Jane Smith' },
  { id: 3, name: 'Mike Johnson' }
];

let weeklyHours = {
  1: { monday: 8, tuesday: 7.5, wednesday: 8, thursday: 6, friday: 8, saturday: 0, sunday: 0 },
  2: { monday: 8, tuesday: 8, wednesday: 4, thursday: 8, friday: 8, saturday: 4, sunday: 0 },
  3: { monday: 6, tuesday: 8, wednesday: 8, thursday: 8, friday: 7, saturday: 0, sunday: 3 }
};

let nextUserId = 4;

// Routes
// This route now serves the index.html file, which is handled by express.static
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

app.get('/users', (req, res) => {
  res.json(users);
});

app.post('/users', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const newUser = { id: nextUserId++, name: name.trim() };
  users.push(newUser);

  weeklyHours[newUser.id] = {
    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
    friday: 0, saturday: 0, sunday: 0
  };

  res.status(201).json(newUser);
});

app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(user => user.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users.splice(userIndex, 1);
  delete weeklyHours[id];

  res.status(204).send();
});

app.get('/users/:id/weekly-hours', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const hours = weeklyHours[id] || {
    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
    friday: 0, saturday: 0, sunday: 0
  };

  const totalHours = Object.values(hours).reduce((sum, hour) => sum + hour, 0);

  res.json({
    userId: id,
    userName: user.name,
    hours: hours,
    totalHours: totalHours
  });
});

app.put('/users/:id/weekly-hours', (req, res) => {
  const id = parseInt(req.params.id);
  const { hours } = req.body;
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!hours || typeof hours !== 'object') {
    return res.status(400).json({ error: 'Hours object is required' });
  }

  const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of requiredDays) {
    if (!(day in hours) || typeof hours[day] !== 'number' || hours[day] < 0) {
      return res.status(400).json({ error: `Invalid hours for ${day}` });
    }
  }

  weeklyHours[id] = { ...hours };
  const totalHours = Object.values(hours).reduce((sum, hour) => sum + hour, 0);

  res.json({
    userId: id,
    userName: user.name,
    hours: weeklyHours[id],
    totalHours: totalHours
  });
});

app.get('/weekly-summary', (req, res) => {
  const summary = users.map(user => {
    const hours = weeklyHours[user.id] || {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0
    };

    const totalHours = Object.values(hours).reduce((sum, hour) => sum + hour, 0);

    return {
      userId: user.id,
      userName: user.name,
      totalHours: totalHours,
      hours: hours
    };
  });

  const grandTotal = summary.reduce((sum, user) => sum + user.totalHours, 0);

  res.json({
    users: summary,
    grandTotal: grandTotal
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET    /');
  console.log('  GET    /users');
  console.log('  POST   /users');
  console.log('  DELETE /users/:id');
  console.log('  GET    /users/:id/weekly-hours');
  console.log('  PUT    /users/:id/weekly-hours');
  console.log('  GET    /weekly-summary');
  console.log('  GET    /health');
});

module.exports = app;