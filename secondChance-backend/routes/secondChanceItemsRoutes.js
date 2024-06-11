const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {

        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const secondChanceItems = await collection.find({}).toArray();

        res.json(secondChanceItems);
    } catch (e) {
        logger.console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
router.post('/', upload.single('file'), async(req, res,next) => {
    try {

        // connect to database
        const db = await connectToDatabase();

        // Get the secondChance collection
        const collection = db.collection('secondChanceItems');

        //Get the collection from the request body
        let secondChanceItem = req.body;

        //Get the last id, increment it by 1, and set it to the new secondChanceItem
        const lastItemQuery = await collection.find().sort({ 'id': -1}).limit(1);
        await lastItemQuery.forEach(item => {
            secondChanceItem.id = (parseInt(item.id) + 1).toString();
            
        });
        //Set the current date to the new item
        const date_added = Math.floor(new Date().getTime() / 1000);
        secondChanceItem.date_added = date_added;

        secondChanceItem = await collection.insertOne(secondChanceItem);

        res.status(201).json(secondChanceItem.ops[0]);
    } catch (e) {
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        
        const db = await connectToDatabase();
        
        const collection = db.collection('secondChanceItems');

        const secondChanceItem = await collection.findOne({ id: req.params.id});

        if (!secondChanceItem){
            return res.status(404).send("secondChanceItem not found");
        }

        return res.json(secondChanceItem)
    } catch (e) {
        next(e);
    }
});

// Update and existing item
router.put('/:id', async(req, res,next) => {
    try {
        const db = await connectToDatabase();

        const collection = await db.collection('secondChanceItems');

        const secondChanceItem = await collection.findOne({ id: req.params.id })

        if (!secondChanceItem) {
            return res.status(401).send("secondChanceItem not found");
            
        }
        secondChanceItem.category = req.category;
        secondChanceItem.condition = req.condition;
        secondChanceItem.age_days = req.age_days;
        secondChanceItem.description = req.description;
        secondChanceItem.age_years = Number((secondChanceItem.age_days/365).toFixed(1));
        secondChanceItem.updatedAt = new Date();

        const updatepreloveItem = await collection.findOneAndUpdate(
            { id },
            { $set: secondChanceItem },
            { returnDocument: 'after' }
        );

        if (updatepreloveItem){
            res.json({ "uploaded": "success" })
        } else {
            res.json({ "uploaded": "success" })};

    } catch (e) {
        next(e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res,next) => {
    try {

        const db = await connectToDatabase();
        const collection = await db.collection("secondChanceItems");

        secondChanceItem = await collection.findOne({ id });

        if (!secondChanceItem) {
            logger.error("secondChanceItem not found")
             return res.status(404).json({ error: "secondChanceItem not found"});
        } 
        await collection.delete({ id });
        res.json({ "deleted": "success"});
    } catch (e) {
        next(e);
    }
});

module.exports = router;
