const mongoose = require('mongoose');
const RestaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'Please add a name'],
        unique: true,
        trim:true,
        maxlength:[50,'Name can not be more than 50 characters']
    },
    address:{
        type: String,
        required: [true, 'Please add an address']
    },
    tel:{
        type: String,
        match: [/^[0-9\-+]{9,15}$/, 'Please add a valid phone number']
    },
    openTime: {
        type: String,
        required: [true, 'Please add an open time'],
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:mm format']
    },
    closeTime: {
        type: String,
        required: [true, 'Please add a close time'],
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:mm format']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
},{
    timestamps: true,
    toJSON: {virtuals:true},
    toObject:{virtuals:true}
});

RestaurantSchema.virtual('reservations',{
    ref:'Reservation',
    localField: '_id',
    foreignField: 'restaurant',
    justOne: false
});

RestaurantSchema.virtual('comments',{
    ref:'Comment',
    localField: '_id',
    foreignField: 'restaurant',
    justOne: false
});

module.exports=mongoose.model('Restaurant',RestaurantSchema);