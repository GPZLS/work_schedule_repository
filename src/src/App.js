// src/App.js
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box
} from '@mui/material';
import axios from 'axios';

const API_BASE = 'http://localhost:3001';

function App() {
  const [users, setUsers] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [open, setOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchWeeklySummary();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchWeeklySummary = async () => {
    try {
      const response = await axios.get(`${API_BASE}/weekly-summary`);
      setWeeklyData(response.data.users);
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
    }
  };

  const addUser = async () => {
    if (!newUserName.trim()) return;
    
    try {
      await axios.post(`${API_BASE}/users`, { name: newUserName });
      setNewUserName('');
      setOpen(false);
      fetchUsers();
      fetchWeeklySummary();
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await axios.delete(`${API_BASE}/users/${userId}`);
      fetchUsers();
      fetchWeeklySummary();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Team Work Schedule
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={() => setOpen(true)}
          sx={{ mr: 2 }}
        >
          Add Team Member
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => {
            fetchUsers();
            fetchWeeklySummary();
          }}
        >
          Refresh Data
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Monday</TableCell>
              <TableCell align="right">Tuesday</TableCell>
              <TableCell align="right">Wednesday</TableCell>
              <TableCell align="right">Thursday</TableCell>
              <TableCell align="right">Friday</TableCell>
              <TableCell align="right">Saturday</TableCell>
              <TableCell align="right">Sunday</TableCell>
              <TableCell align="right">Total Hours</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weeklyData.map((user) => (
              <TableRow key={user.userId}>
                <TableCell component="th" scope="row">
                  {user.userName}
                </TableCell>
                <TableCell align="right">{user.hours.monday}</TableCell>
                <TableCell align="right">{user.hours.tuesday}</TableCell>
                <TableCell align="right">{user.hours.wednesday}</TableCell>
                <TableCell align="right">{user.hours.thursday}</TableCell>
                <TableCell align="right">{user.hours.friday}</TableCell>
                <TableCell align="right">{user.hours.saturday}</TableCell>
                <TableCell align="right">{user.hours.sunday}</TableCell>
                <TableCell align="right">
                  <strong>{user.totalHours}</strong>
                </TableCell>
                <TableCell align="right">
                  <Button 
                    color="error" 
                    size="small"
                    onClick={() => deleteUser(user.userId)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add New Team Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={addUser} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App;