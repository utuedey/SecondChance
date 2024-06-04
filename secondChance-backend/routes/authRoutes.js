const dotenv = require('dotenv');
const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../logger');
const pino = require('pino');  // Import Pino logger
dotenv.config();

const logger = pino();  // Create a Pino logger instance

// Create a jwt secret
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
    try {
        // Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
        const db = await connectToDatabase();
        // Access MongoDB `users` collection
        const collection = await db.collection('users');
        // Check if user credentials already exists in the database and throw an error if they do
        const existingEmail = await collection.findOne({ email: req.body.email});

        if (existingEmail) {
            logger.error("Email id already exists");
            return res.status(400).json({ error: "Email id already exists"});
        }
        // Create a hash to encrypt the password so that it is not readable in the database
        const salt  = await bcryptjs.genSalt(10);
        const hash  = await bcryptjs.hash(req.body.password, salt);
        // Insert the user into the database
        const newUser = await collection.insertOne({
            email: req.body.email,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            password: hash,
            createdAt: new Date(),
        });
        // Create JWT authentication if passwords match with user._id as payload
        const payload = {
            user: {
                id: newUser.insertedId
            },
        };
        const authtoken = jwt.sign(token, JWT_SECRET);
        // Log the successful registration using the logger
        logger.info("User registered successfully");
        // Return the user email and the token as a JSON
        res.json({ authtoken, email })
    } catch (e) {
         logger.error(e);
         return res.status(500).send('Internal server error');
    }
});

router.post('/login', async (req, res) => {
    try {
        // Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
        const db = await connectToDatabase();
        // Access MongoDB `users` collection
        const collection = db.collection('users');
        // Check for user credentials in database
        const theUser = await collection.findOne({ email: req.body.email})
        // Check if the password matches the encrypted password and send appropriate message on mismatch
        if (theUser) {
            let result = await bcryptjs.compare(req.body.password, theUser.password)
          if(!result) {
                logger.error('Passwords do not match');
                return res.status(404).json({ error: 'Wrong pasword' });
            }

            let payload = {
                user: {
                    id: theUser._id.toString(),
                 },
             };

            const userName = theUser.firstname;
            const userEmail = theUser.email;

            const authtoken = jwt.sign(user._id, JWT_SECRET)
            logger.info("User logged in successfully")
            return res.status(200).json({authtoken, userName, userEmail });
        } else {
            logger.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (e) {
        logger.error(e);
         return res.status(500).send('Internal server error');

    }
});