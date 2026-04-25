const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Please add a comment text'],
        maxlength: [500, 'Comment cannot be more than 500 characters']
    },
    rating: {
        type: Number,
        required: [true, 'Please add a rating between 1 and 5'],
        min: 1,
        max: 5
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    restaurant: {
        type: mongoose.Schema.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals:true },
    toObject: { virtuals:true }
});

CommentSchema.pre(/^find/, async function() {
    this.populate({
        path: 'restaurant'
    }).populate({
        path: 'user',
        select: 'name'
    });
});

module.exports = mongoose.model('Comment', CommentSchema);