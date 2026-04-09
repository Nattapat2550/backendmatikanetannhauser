const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    startDateTime: {
        type: Date,
        required: true,
    }, 
    endDateTime: {
        type: Date,
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        required: true,
    },
    restaurant: {
        type: mongoose.Schema.ObjectId,
        ref: 'Restaurant',
        required: true,
    }
});

module.exports = mongoose.model('Reservation', ReservationSchema);