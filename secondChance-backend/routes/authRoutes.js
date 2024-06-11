const dotenv = require('dotenv');
const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../logger');
const pino = require('pino');  // Import Pino logger
const { body, validationResult } = require('express-validator');
dotenv.config();

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

// Login endpoint
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


// update endpoint
router.put('/update', async (req, res) => {
    // Validate the input using `validationResult` and return an appropriate message if you detect an error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.error('Validation errors in update request', errors.array());
        return res.status(400).json({ errors: errors.array()});
    }
try {
    // Check if `email` is present in the header and throw an appropriate error message if it is not present
    const email = req.header.email;

    if (!email){
        logger.error("Email not found in the request headers");
        return res.status(400).json({ error: "Email not found in the request headers"});
    }
    // Connect to MongoDB
    const db = await connectToDatabase();
    const collection = db.collection('users');
    // Find the user credentials in database
    const existingUser = collection.findOne({ email });
    existingUser.updatedAt = new Date();
    // Update the user credentials in the database
    const updatedUser = await collection.findOneAndUpdate(
        { email },
        { $set: existingUser },
        { returnDocument: 'after'}
    );
    // Create JWT authentication with `user._id` as a payload using the secret key from the .env file
    const payload = {
        user: {
           id: updatedUser._id.toString(),
        },
    };
    
    const authtoken = jwt.sign(payload, JWT_SECRET);
    logger.info("User updated successfully");
    res.json({authtoken});
} catch (e) {
     logger.error(e)
     return res.status(500).send('Internal server error');

}
});

module.exports = router;