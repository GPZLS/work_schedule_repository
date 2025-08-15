// team-scheduler-backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve the main HTML file at root
app.use(express.static(path.join(__dirname, '..')));

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Generate time slots from 6:00 AM to 10:00 PM (30-minute intervals)
function generateTimeSlots() {
  const slots = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 22 && minute > 0) break; // Stop at 10:00 PM
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      slots.push({ value: time, display: displayTime });
    }
  }
  return slots;
}

const timeSlots = generateTimeSlots();

// In-memory database
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Manager' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Developer' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Designer' }
];

// Weekly scheduled hours (specific time slots)
let weeklySchedules = {
  1: {
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [{ start: '09:00', end: '17:00' }],
    wednesday: [{ start: '09:00', end: '17:00' }],
    thursday: [{ start: '09:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '17:00' }],
    saturday: [],
    sunday: []
  },
  2: {
    monday: [{ start: '08:00', end: '16:00' }],
    tuesday: [{ start: '08:00', end: '16:00' }],
    wednesday: [{ start: '10:00', end: '14:00' }],
    thursday: [{ start: '08:00', end: '16:00' }],
    friday: [{ start: '08:00', end: '16:00' }],
    saturday: [{ start: '10:00', end: '14:00' }],
    sunday: []
  },
  3: {
    monday: [{ start: '10:00', end: '16:00' }],
    tuesday: [{ start: '09:00', end: '17:00' }],
    wednesday: [{ start: '09:00', end: '17:00' }],
    thursday: [{ start: '09:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '16:00' }],
    saturday: [],
    sunday: [{ start: '12:00', end: '15:00' }]
  }
};

// Permanent availability (general availability pattern)
let permanentAvailability = {
  1: {
    monday: [{ start: '08:00', end: '18:00' }],
    tuesday: [{ start: '08:00', end: '18:00' }],
    wednesday: [{ start: '08:00', end: '18:00' }],
    thursday: [{ start: '08:00', end: '18:00' }],
    friday: [{ start: '08:00', end: '18:00' }],
    saturday: [{ start: '10:00', end: '16:00' }],
    sunday: []
  },
  2: {
    monday: [{ start: '07:00', end: '19:00' }],
    tuesday: [{ start: '07:00', end: '19:00' }],
    wednesday: [{ start: '09:00', end: '17:00' }],
    thursday: [{ start: '07:00', end: '19:00' }],
    friday: [{ start: '07:00', end: '19:00' }],
    saturday: [{ start: '09:00', end: '15:00' }],
    sunday: [{ start: '12:00', end: '18:00' }]
  },
  3: {
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [{ start: '09:00', end: '17:00' }],
    wednesday: [{ start: '09:00', end: '17:00' }],
    thursday: [{ start: '09:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '17:00' }],
    saturday: [],
    sunday: [{ start: '11:00', end: '16:00' }]
  }
};

// Temporary availability (date-specific overrides)
let temporaryAvailability = {
  // Format: userId: { 'YYYY-MM-DD': { dayOfWeek: [{ start: 'HH:MM', end: 'HH:MM' }] } }
  1: {
    '2025-08-20': { tuesday: [] }, // Not available this Tuesday
    '2025-08-25': { sunday: [{ start: '14:00', end: '18:00' }] } // Available this Sunday
  },
  2: {
    '2025-08-18': { sunday: [{ start: '10:00', end: '16:00' }] } // Available this Sunday
  }
};

let nextUserId = 4;

// Helper functions
function calculateHoursFromSlots(slots) {
  if (!slots || !Array.isArray(slots)) return 0;
  
  return slots.reduce((total, slot) => {
    const start = new Date(`2000-01-01T${slot.start}`);
    const end = new Date(`2000-01-01T${slot.end}`);
    const hours = (end - start) / (1000 * 60 * 60);
    return total + hours;
  }, 0);
}

function initializeUserSchedules(userId) {
  const emptyWeek = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: []
  };
  
  weeklySchedules[userId] = { ...emptyWeek };
  permanentAvailability[userId] = { ...emptyWeek };
  temporaryAvailability[userId] = {};
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Team Scheduler Server is running',
    timestamp: new Date().toISOString(),
    users: users.length,
    features: ['scheduling', 'availability', 'time-slots']
  });
});

app.get('/api/time-slots', (req, res) => {
  res.json(timeSlots);
});

app.get('/api/users', (req, res) => {
  console.log('Fetching all users');
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { name, email, role } = req.body;
  console.log('Adding new user:', { name, email, role });
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const newUser = { 
    id: nextUserId++, 
    name: name.trim(),
    email: email?.trim() || '',
    role: role?.trim() || 'Team Member'
  };
  users.push(newUser);

  // Initialize schedules and availability
  initializeUserSchedules(newUser.id);

  console.log('User added successfully:', newUser);
  res.status(201).json(newUser);
});

app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log('Deleting user with ID:', id);
  
  const userIndex = users.findIndex(user => user.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const deletedUser = users[userIndex];
  users.splice(userIndex, 1);
  
  // Clean up all user data
  delete weeklySchedules[id];
  delete permanentAvailability[id];
  delete temporaryAvailability[id];

  console.log('User deleted successfully:', deletedUser.name);
  res.json({ message: `User ${deletedUser.name} deleted successfully` });
});

// Weekly Schedule Routes
app.get('/api/users/:id/schedule', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const schedule = weeklySchedules[id] || {};
  const totalHours = Object.values(schedule).reduce((total, daySlots) => {
    return total + calculateHoursFromSlots(daySlots);
  }, 0);

  res.json({
    userId: id,
    userName: user.name,
    schedule: schedule,
    totalHours: totalHours
  });
});

app.put('/api/users/:id/schedule', (req, res) => {
  const id = parseInt(req.params.id);
  const { schedule } = req.body;
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!schedule || typeof schedule !== 'object') {
    return res.status(400).json({ error: 'Schedule object is required' });
  }

  // Validate schedule format
  const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of requiredDays) {
    if (!(day in schedule) || !Array.isArray(schedule[day])) {
      return res.status(400).json({ error: `Invalid schedule format for ${day}` });
    }
    
    // Validate time slots
    for (const slot of schedule[day]) {
      if (!slot.start || !slot.end || slot.start >= slot.end) {
        return res.status(400).json({ error: `Invalid time slot for ${day}` });
      }
    }
  }

  weeklySchedules[id] = { ...schedule };
  const totalHours = Object.values(schedule).reduce((total, daySlots) => {
    return total + calculateHoursFromSlots(daySlots);
  }, 0);

  console.log(`Schedule updated for user ${user.name}:`, schedule);

  res.json({
    userId: id,
    userName: user.name,
    schedule: weeklySchedules[id],
    totalHours: totalHours
  });
});

// Permanent Availability Routes
app.get('/api/users/:id/permanent-availability', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const availability = permanentAvailability[id] || {};

  res.json({
    userId: id,
    userName: user.name,
    permanentAvailability: availability
  });
});

app.put('/api/users/:id/permanent-availability', (req, res) => {
  const id = parseInt(req.params.id);
  const { availability } = req.body;
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!availability || typeof availability !== 'object') {
    return res.status(400).json({ error: 'Availability object is required' });
  }

  permanentAvailability[id] = { ...availability };
  console.log(`Permanent availability updated for user ${user.name}:`, availability);

  res.json({
    userId: id,
    userName: user.name,
    permanentAvailability: permanentAvailability[id]
  });
});

// Temporary Availability Routes
app.get('/api/users/:id/temporary-availability', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const tempAvailability = temporaryAvailability[id] || {};

  res.json({
    userId: id,
    userName: user.name,
    temporaryAvailability: tempAvailability
  });
});

app.put('/api/users/:id/temporary-availability', (req, res) => {
  const id = parseInt(req.params.id);
  const { date, availability } = req.body;
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!date || !availability) {
    return res.status(400).json({ error: 'Date and availability are required' });
  }

  if (!temporaryAvailability[id]) {
    temporaryAvailability[id] = {};
  }

  temporaryAvailability[id][date] = availability;
  console.log(`Temporary availability updated for user ${user.name} on ${date}:`, availability);

  res.json({
    userId: id,
    userName: user.name,
    date: date,
    temporaryAvailability: temporaryAvailability[id]
  });
});

app.delete('/api/users/:id/temporary-availability/:date', (req, res) => {
  const id = parseInt(req.params.id);
  const date = req.params.date;
  const user = users.find(user => user.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (temporaryAvailability[id] && temporaryAvailability[id][date]) {
    delete temporaryAvailability[id][date];
    console.log(`Temporary availability removed for user ${user.name} on ${date}`);
  }

  res.json({
    userId: id,
    userName: user.name,
    message: `Temporary availability removed for ${date}`
  });
});

// Weekly Summary (updated to use new schedule format)
app.get('/api/weekly-summary', (req, res) => {
  console.log('Generating weekly summary');
  
  const summary = users.map(user => {
    const schedule = weeklySchedules[user.id] || {
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: []
    };

    const dayHours = {};
    let totalHours = 0;
    
    Object.keys(schedule).forEach(day => {
      const dayTotal = calculateHoursFromSlots(schedule[day]);
      dayHours[day] = dayTotal;
      totalHours += dayTotal;
    });

    return {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      totalHours: totalHours,
      hours: dayHours,
      schedule: schedule
    };
  });

  const grandTotal = summary.reduce((sum, user) => sum + user.totalHours, 0);

  res.json({
    users: summary,
    grandTotal: grandTotal,
    generatedAt: new Date().toISOString()
  });
});

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Team Scheduler Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
  console.log('');
  console.log('Available API endpoints:');
  console.log('  GET    /api/health');
  console.log('  GET    /api/time-slots');
  console.log('  GET    /api/users');
  console.log('  POST   /api/users');
  console.log('  DELETE /api/users/:id');
  console.log('  GET    /api/users/:id/schedule');
  console.log('  PUT    /api/users/:id/schedule');
  console.log('  GET    /api/users/:id/permanent-availability');
  console.log('  PUT    /api/users/:id/permanent-availability');
  console.log('  GET    /api/users/:id/temporary-availability');
  console.log('  PUT    /api/users/:id/temporary-availability');
  console.log('  DELETE /api/users/:id/temporary-availability/:date');
  console.log('  GET    /api/weekly-summary');
  console.log('');
  console.log(`Current users: ${users.length}`);
  console.log(`Time slots available: 6:00 AM - 10:00 PM (${timeSlots.length} slots)`);
});

module.exports = app;