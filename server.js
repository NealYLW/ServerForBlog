const express = require('express');
const app = express();

const port = 3000;
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const saltRounds = 10;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;


// multer middleware is used to handle uploadding files

// This will save files to the "uploads" directory in your project
const upload = multer({ dest: 'uploads/' });
const pool = mysql.createPool({
  host: 'localhost',
  user: 'lantest',
  password: 'sakura1121',
  database: 'lantest',
})

// Use CORS middleware
app.use(cors());

// public all the paintings
app.use('/uploads', express.static('uploads'));
// Middleware to parse JSON bodies
app.use(express.json());

app.use(bodyParser.json());
// GET request
app.get('/', (req, res) => {
  res.send('Hello World!')
});

// POST request for login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    connection.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
      if (error) {
        console.error("An error occurred when querying the DB: " + error.stack);
        return res.status(500).json({ message: 'Database query failed' });
      }

      // If no user is found with this email, return an error
      if (results.length === 0) {
        return res.status(401).json({ message: 'Login failed, no user with this email found' });
      }

      // Check if the hashed passwords match
      bcrypt.compare(password, results[0].password, (bcryptErr, isMatch) => {
        if (bcryptErr) {
          console.error("An error occurred when comparing passwords: " + bcryptErr.stack);
          return res.status(500).json({ message: 'Password comparison failed' });
        }

        if (!isMatch) {
          return res.status(401).json({ message: 'Login failed' });
        }

        // If the passwords match, login is successful
        // Generate a JWT with the user's ID and email
        const user = results[0];
        //generate a token JWT
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

        // Send the JWT in the response
        res.json({ message: 'Logged in', token, userId: user.id });

        // release the connection back to the pool when you're done with it
        connection.release();
      });
    });
  });
});


// ONE test user email and pw is 13@qq.com;  Sakura0000
app.post('/signup', (req, res) => {
  const { email, password } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    connection.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
      if (error) {
        // release the connection back to the pool when you're done with it
        connection.release();
        return res.status(500).json({ message: 'Database query failed' });
      }

      // >0 means email already exists
      if (results.length > 0) {
        // release the connection back to the pool when you're done with it
        connection.release();
        return res.status(400).json({ message: 'Email already registered' });
      } else {
        bcrypt.hash(password, saltRounds, function(err, hash) {
          // Store hash in your password DB.
          connection.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash], (error, results) => {
            // release the connection back to the pool when you're done with it
            connection.release();

            if (error) {
              return res.status(500).json({ message: 'Database query failed' });
            }

            res.json({ message: 'Signup successful' });
          });
        });
      }
    });
  });
});

// Request for user basic information (dashboard Information)
app.get('/users/:userId', (req, res) => {
  const userId = req.params.userId;
  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    connection.query('SELECT * FROM users WHERE id = ?', [userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to fetch user information:', error);
        return res.status(500).json({ message: 'Failed to fetch user information' });
      }

      if (results.length > 0) {
        const user = results[0];
        return res.json({ data: user });
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    });
  });
});

// Endpoint to get the count of paintings for a user
app.get('/users/:userId/paintings/count', (req, res) => {
  const userId = req.params.userId;
  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    connection.query('SELECT COUNT(*) AS count FROM paintings WHERE user_id = ?', [userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to fetch paintings count:', error);
        return res.status(500).json({ message: 'Failed to fetch paintings count' });
      }

      return res.json({ data: { count: results[0].count } });
    });
  });
});

// Endpoint to get the count of videos for a user
app.get('/users/:userId/videos/count', (req, res) => {
  const userId = req.params.userId;
  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    connection.query('SELECT COUNT(*) AS count FROM videos WHERE user_id = ?', [userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to fetch videos count:', error);
        return res.status(500).json({ message: 'Failed to fetch videos count' });
      }

      return res.json({ data: { count: results[0].count } });
    });
  });
});

// fetch all paintings for a user
app.get('/users/:userId/paintings', (req, res) => {
  const userId = req.params.userId;
  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    connection.query('SELECT * FROM paintings WHERE user_id = ?', [userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to fetch paintings:', error);
        return res.status(500).json({ message: 'Failed to fetch paintings' });
      }

      if (results.length > 0) {
        const paintings = results;
        return res.json({ data: paintings });
      } else {
        return res.json({ data: [] });
      }
    });
  });
});

// Upload a new paintings
app.post('/users/:userId/paintings', upload.single('image'), (req, res) => {
  const userId = req.params.userId;
  const { title, description } = req.body;
  const image = req.file; // This contains the uploaded file

  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    // Save the painting to the database. This will depend on your database schema.
    // You should save the image's filename (image.filename) to the database
    connection.query('INSERT INTO paintings (title, description, image_url, user_id) VALUES (?, ?, ?, ?)', [title, description, image.filename, userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to add painting:', error);
        return res.status(500).json({ message: 'Failed to add painting' });
      }

      return res.json({ message: 'Painting added successfully' });
    });
  });
});
//Delete a painting
app.delete('/users/:userId/paintings/:paintingId', (req, res) => {
  const userId = req.params.userId;
  const paintingId = req.params.paintingId;

  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    // Delete the painting from the database. This will depend on your database schema.
    connection.query('DELETE FROM paintings WHERE id = ? AND user_id = ?', [paintingId, userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to delete painting:', error);
        return res.status(500).json({ message: 'Failed to delete painting' });
      }

      return res.json({ message: 'Painting deleted successfully' });
    });
  });
});
// Editing a painting
app.put('/users/:userId/paintings/:paintingId', upload.single('image'), (req, res) => {
  const userId = req.params.userId;
  const paintingId = req.params.paintingId;
  const { title, description } = req.body;
  const image = req.file; // This contains the uploaded file, if any

  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    // Update the painting in the database. This will depend on your database schema.
    // If an image file was uploaded, you should update the image's filename (image.filename) in the database
    let query = 'UPDATE paintings SET title = ?, description = ? WHERE id = ? AND user_id = ?';
    let values = [title, description, paintingId, userId];
    
    if (image) {
      // If an image was uploaded, include it in the update
      query = 'UPDATE paintings SET title = ?, description = ?, image_url = ? WHERE id = ? AND user_id = ?';
      values = [title, description, image.filename, paintingId, userId];
    }
    
    connection.query(query, values, (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to update painting:', error);
        return res.status(500).json({ message: 'Failed to update painting' });
      }

      return res.json({ message: 'Painting updated successfully' });
    });
  });
});
//upload a new video
app.post('/users/:userId/videos', upload.single('video'), (req, res) => {
  const userId = req.params.userId;
  const { title, description } = req.body;
  const video = req.file; // This contains the uploaded file

  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed' });
    }
    // Save the video to the database. This will depend on your database schema.
    // You should save the video's filename (video.filename) to the database
    connection.query('INSERT INTO videos (title, description, video_url, user_id) VALUES (?, ?, ?, ?)', [title, description, video.filename, userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to add video:', error);
        return res.status(500).json({ message: 'Failed to add video' });
      }

      return res.json({ message: 'Video added successfully' });
    });
  });
});

// fetch all videos for a user
app.get('/users/:userId/videos', (req, res) => {
  const userId = req.params.userId;
  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed'});
    }

    connection.query('SELECT * FROM videos WHERE user_id = ?', [userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to fetch videos:', error);
        return res.status(500).json({ message: 'Failed to fetch videos' });
      }

      if (results.length > 0) {
        const videos = results;
        return res.json({ data: videos });
      } else {
        return res.json({ data: [] });
      }
    });
  });
});
// fetch a single video for a user
app.get('/users/:userId/videos/:videoId', (req, res) => {
  const userId = req.params.userId;
  const videoId = req.params.videoId;
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({ message: 'Database connection failed'});
    }

    connection.query('SELECT * FROM videos WHERE id = ? AND user_id = ?', [videoId, userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to fetch video:', error);
        return res.status(500).json({ message: 'Failed to fetch video' });
      }

      if (results.length > 0) {
        const video = results[0];
        return res.json({ data: video });
      } else {
        return res.status(404).json({ message: 'Video not found' });
      }
    });
  });
});

//Delete a video
app.delete('/users/:userId/videos/:videoId', (req, res) => {
  const userId = req.params.userId;
  const videoId = req.params.videoId;

  pool.getConnection((err, connection) => {
    if(err) {
      console.error("An error occurred when connecting to the DB: " + err.stack);
      return res.status(500).json({message: 'Database connection failed'});
    }

    // Delete the video from the database. This will depend on your database schema.
    connection.query('DELETE FROM videos WHERE id = ? AND user_id = ?', [videoId, userId], (error, results) => {
      connection.release();
      if (error) {
        console.error('Failed to delete video:', error);
        return res.status(500).json({ message: 'Failed to delete video' });
      }

      return res.json({ message: 'Video deleted successfully' });
    });
  });
});
//Logout
app.post('/logout', (req, res) => {
  const token = req.body.token;

  // Add the token to the blacklist
  res.json({ message: 'Logged out successfully' });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// To execute a query:
pool.query('SELECT * FROM users', function(error, results, fields) {
  if (error) throw error;
  // `results` is an array with one object for each row
  console.log(results);
});

// No need to end the connection
