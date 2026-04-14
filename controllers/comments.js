const Comment = require('../models/Comment');
const Restaurant = require('../models/Restaurant');

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
        const comment = await Comment.create(req.body);

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

        
        if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this comment` });
        }

        
        req.body.isEdited = true;

        comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: comment });
    } catch (err) {
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