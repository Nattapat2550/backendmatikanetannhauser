const Restaurant = require('../models/Restaurant');
const Reservation = require('../models/Reservation.js');
const Comment = require('../models/Comment.js');
const mongoose = require('mongoose');

//Get all Restaurants 
exports.getRestaurants = async (req,res,next)=>{
    let query;

    const reqQuery = {...req.query};

    const removeFields = ['select','sort','page','limit'];

    removeFields.forEach(param=>delete reqQuery[param]);
    //console.log(reqQuery);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match=>`$${match}`);

    query = Restaurant.find(JSON.parse(queryStr)).populate('reservations').populate('comments');

    if(req.query.select) 
    {
        let fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    if(req.query.sort) 
    {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } 
    else 
    {
        query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page,10) || 1;
    const limit = parseInt(req.query.limit,10) || 25;
    const startIndex = (page-1) * limit;
    const endIndex = page * limit;
    const total = await Restaurant.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    const pagination ={};

    if (endIndex < total) 
    {
        pagination.next={
            page:page+1,
            limit
        }
    }

    if (startIndex > 0) {
        pagination.prev={
            page:page-1,
            limit
        }
    }

    try{
        const restaurants = await query;
        //console.log(req.query);

        res.status(200).json({
            success:true, 
            count:restaurants.length,
            pagination , 
            data:restaurants
        });
    } catch(err){
        res.status(500).json({success:false});
    }
    
};

//Get sigle Restaurant
exports.getRestaurant= async (req,res,next)=>{
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) { //if restaurant is not valid na
            return res.status(400).json({success:false, message:'Invalid restaurant ID'});
        }

        let query = Restaurant.findById(req.params.id);

        const restaurant = await query;

        if (!restaurant) {
            return res.status (404).json({success:false});
        }

        res.status (200).json({success:true, data:restaurant});
    } catch(err) {
        res.status (500).json({success:false});
    }
};

//Create new Restaurant 
exports.createRestaurant = async(req,res,next)=>{
    try {
        req.body.user = req.user.id;
        const restaurant = await Restaurant.create(req.body);
        
        res.status (201).json({
            success: true,
            data: restaurant
        });
    } catch(err) {
        if (err.name === 'ValidationError') { //lost info
            const errors = Object.values(err.errors).map(e => e.message);

            return res.status(400).json({
                success: false,
                errors
            });
        }
        if (err.code === 11000) { //if already exists throw Mongo error 11000 ***
            return res.status(400).json({
                success:false,
                message:'Restaurant name already exists'
            });
        }
        res.status(500).json({ success: false });
    }  
};

//Update Restaurant
exports.updateRestaurant= async (req, res,next)=> {
    try{
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({success:false, message:'Invalid restaurant ID'});
        }
        let restaurant = await Restaurant.findById(req.params.id);

        if(!restaurant){
            return res.status (404).json({success:false});
        }

        // ตรวจสอบว่าผู้ใช้งานเป็นเจ้าของร้านนี้ หรือเป็น admin หรือไม่
        if(restaurant.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false, 
                message: `User ${req.user.id} is not authorized to update this restaurant`
            });
        }
        restaurant = await Restaurant.findByIdAndUpdate (req.params.id, req.body, {
            new: true,
            runValidators:true
        });

        res.status (200).json({success:true, data: restaurant});
    } catch (err) {
        res.status (500).json({success:false});
    }
};

//Delete Restaurant 
exports.deleteRestaurant = async (req,res,next)=>{
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({success:false, message:'Invalid restaurant ID'});
        }

        const restaurant = await Restaurant.findById(req.params.id);

        if(!restaurant)
        {
            return res.status(404).json({success:false, message:`Restaurant not found with id of ${req.params.id}`});
        }

        if(restaurant.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false, 
                message: `User ${req.user.id} is not authorized to delete this restaurant`
            });
        }

        await Reservation.deleteMany({ restaurant: req.params.id });
        await Restaurant.deleteOne({ _id: req.params.id });

        res.status(200).json({success:true, data: {}});
    } catch(err) {
        
        res.status(500).json({success:false});
    }
};
