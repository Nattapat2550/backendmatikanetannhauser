const mongoose = require('mongoose');

const Comment = require('../models/Comment');
const Restaurant = require('../models/Restaurant');

const COMMENT_LIMIT = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

const formatWindowDuration = (ms) => {
    const units = [
        { label: 'day', value: Math.floor(ms / (1000 * 60 * 60 * 24)) },
        { label: 'hour', value: Math.floor((ms / (1000 * 60 * 60)) % 24) },
        { label: 'minute', value: Math.floor((ms / (1000 * 60)) % 60) },
        { label: 'second', value: Math.floor((ms / 1000) % 60) }
    ];
    return units
        .filter(u => u.value > 0)
        .map(u => `${u.value} ${u.label}${u.value !== 1 ? 's' : ''}`)
        .join(' ');
};

let WINDOW_MS_STRING = formatWindowDuration(WINDOW_MS);

// @desc    Get comments (Supports filtering by rating and sorting)
// @route   GET /api/v1/comments
// @route   GET /api/v1/restaurants/:restaurantId/comments
exports.getComments = async (req, res, next) => {
    try {
        let query;
        const reqQuery = { ...req.query };

        const removeFields = ['select', 'sort', 'page', 'limit'];
        removeFields.forEach(param => delete reqQuery[param]);

        if (req.params.restaurantId) {
            reqQuery.restaurant = req.params.restaurantId;
        }

        
        query = Comment.find(reqQuery).populate({
            path: 'user',
            select: 'name'
        });

        
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt'); // Default เป็น Most Recent
        }

        const comments = await query;

        res.status(200).json({
            success: true,
            count: comments.length,
            data: comments
        });
    } catch (err) {
        console.log(err.stack);
        res.status(500).json({ success: false, message: 'Cannot get comments' });
    }
};

// @desc    Get single comment
// @route   GET /api/v1/comments/:id
exports.getComment = async (req, res, next) => {
    try {
        const comment = await Comment.findById(req.params.id).populate({
            path: 'user',
            select: 'name'
        });

        if (!comment) {
            return res.status(404).json({ success: false, message: `No comment with id ${req.params.id}` });
        }

        res.status(200).json({ success: true, data: comment });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Cannot find comment' });
    }
};

// @desc    Add comment
// @route   POST /api/v1/restaurants/:restaurantId/comments
exports.addComment = async (req, res, next) => {
    try {
        req.body.restaurant = req.params.restaurantId;
        req.body.user = req.user.id;

        const restaurant = await Restaurant.findById(req.params.restaurantId);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: `No restaurant with id ${req.params.restaurantId}` });
        }

        const windowStart = new Date(Date.now() - WINDOW_MS);
        const recentCount = await Comment.countDocuments({
            user: req.user.id,
            createdAt: { $gte: windowStart }
        });

        if (recentCount >= COMMENT_LIMIT) {
            return res.status(429).json({
                success: false,
                message: `Comment limit reached. You can post at most ${COMMENT_LIMIT} comments per ${WINDOW_MS_STRING}. Please try again later.`
            });
        }

        const existingComment = await Comment.findOne({
            restaurant: req.params.restaurantId,
            user: req.user.id
        });

        if (existingComment) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this restaurant"
            });
        }

        const newComment = new Comment(req.body);
        await newComment.validate();

        const comment = await newComment.save();
        res.status(201).json({ success: true, data: comment });

    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        }
        console.log(err.stack);
        res.status(500).json({ success: false, message: 'Cannot create comment' });
    }
};

// @desc    Update comment
// @route   PUT /api/v1/comments/:id
exports.updateComment = async (req, res, next) => {
    try {
        let comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ success: false, message: `No comment with id ${req.params.id}` });
        }

        if (comment.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this comment` });
        }

        req.body.isEdited = true;

        comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: comment });
    } catch (err) {
        if (err instanceof mongoose.Error.CastError) {
            return res.status(400).json({
                success: false,
                message: `Invalid value for field '${err.path}': ${err.value}`
            });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        }
        console.log(err.stack);
        res.status(500).json({ success: false, message: 'Cannot update comment' });
    }
};

// @desc    Delete comment
// @route   DELETE /api/v1/comments/:id
exports.deleteComment = async (req, res, next) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ success: false, message: `No comment with id ${req.params.id}` });
        }

        if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to delete this comment` });
        }

        await comment.deleteOne();

        res.status(200).json({ 
            success: true, 
            message: 'Comment successfully deleted.',
            data: {} 
        });
    } catch (err) {
        console.log(err.stack);
        res.status(500).json({ success: false, message: 'Cannot delete comment' });
    }
};