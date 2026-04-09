const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');

//get all reservations
exports.getReservations = async (req, res, next) => {
    let query;

    if(req.user.role !== 'admin') {
        if(req.params.restaurantId) { // only allow if it has restaurant id, get user's reservations
            console.log(req.params.restaurantId);
            query = Reservation.find({user: req.user.id, restaurant: req.params.restaurantId}).populate({
                path: 'restaurant',
                select: 'name address tel'
            })
        } else {
            query = Reservation.find({user: req.user.id}).populate({
                path: 'restaurant',
                select: 'name address tel'
            })
        }
    } else {
        if(req.params.restaurantId) {
            console.log(req.params.restaurantId);
            query = Reservation.find({restaurant: req.params.restaurantId}).populate({
                path: 'restaurant',
                select: 'name address tel'
            });
        } else {
            query = Reservation.find({}).populate({
                path: 'restaurant',
                select: 'name address tel'
            });
        }
    }

    try {
        const reservations = await query;

        res.status(200).json({
            success: true,
            count: reservations.length,
            data: reservations
        })
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({
            success: false, 
            message: "Cannot find Reservation"
        });
    }
}

exports.getReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate({
            path: 'restaurant',
            select: 'name address tel'
        });
        if(!reservation) {
            res.status(404).json({
                success: false,
                message: `No reservation with the id of ${req.params.id}`
            });
        }
        if(reservation.user.toString()!==req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false, 
                message: `User ${req.user.id} is not authorized to view this reservation`
            });
        }
        res.status(200).json({
            success: true,
            data: reservation
        })
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({
            success: true,
            message: 'Cannot find Reservation'
        });
    }
}

exports.addReservation = async (req, res, next) => {
    try {
        req.body.restaurant = req.params.restaurantId;

        const restaurant = await Restaurant.findById(req.params.restaurantId);
        if(!restaurant) {
            return res.status(404).json({
                success: false,
                message: `No restaurant with the id of ${req.params.restaurantId}`
            });
        }
        // format again because maybe xss sanitizer explode the data
        if (typeof req.body.startDateTime === "string") {
            req.body.startDateTime = req.body.startDateTime.replace(
                /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\d{3})Z$/,
                "$1.$2Z"
            );
        }
        if (typeof req.body.endDateTime === "string") {
            req.body.endDateTime = req.body.endDateTime.replace(
                /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\d{3})Z$/,
                "$1.$2Z"
            );
        }
        const openTime = restaurant.openTime;
        const closeTime = restaurant.closeTime;
        const startTime = req.body.startDateTime.slice(11, 16);
        const endTime = req.body.endDateTime.slice(11, 16);
        // console.log(req.body);
        console.log(`Restarant time: ${openTime}-${closeTime}, your reserved ${startTime}-${endTime}`);
        //Rule: must be same date
        const startDate = req.body.startDateTime.slice(0, 10);
        const endDate = req.body.endDateTime.slice(0, 10);
        if(startDate!=endDate) {
            return res.status(400).json({
                success: false, 
                message: `The reserve must be on the same day. ${startDate} - ${endDate}`
            });
        }
        // Rule: l<r
        if(startTime>=endTime) {
            return res.status(400).json({
                success: false, 
                message: `End Time ${endTime} must be more than Start Time ${startTime}`
            });
        }
        //Rule: Only in available time
        if(!(openTime<=startTime && endTime<=closeTime)) {
            return res.status(400).json({
                success: false, 
                message: `Restarant time: ${openTime}-${closeTime}, your reserved ${startTime}-${endTime}`
            });
        }

        req.body.user = req.user.id;
        const existedReservations = await Reservation.find({user: req.user.id});
        if(existedReservations.length>=3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `The user with ID ${req.user.id} has already made 3 reservations` 
            })
        }
        

        const reservation = await Reservation.create(req.body);
        res.status(200).json({
            success: true,
            data: reservation
        });
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({
            success: false,
            message: 'Cannot create Reservation'
        });
    }
}

exports.updateReservation = async (req, res, next) => {
    try {
        let reservation = await Reservation.findById(req.params.id).populate({
            path: 'restaurant',
            select: 'openTime closeTime'
        })
        if(!reservation) {
            return res.status(404).json({
                success: false,
                message: `No reservation with the id of ${req.params.id}`
            });
        }

        if(reservation.user.toString()!==req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false, 
                message: `User ${req.user.id} is not authorized to update this reservation`
            });
        }

        // format again because maybe xss sanitizer explode the data
        if (typeof req.body.startDateTime === "string") {
            req.body.startDateTime = req.body.startDateTime.replace(
                /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\d{3})Z$/,
                "$1.$2Z"
            );
        }
        if (typeof req.body.endDateTime === "string") {
            req.body.endDateTime = req.body.endDateTime.replace(
                /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\d{3})Z$/,
                "$1.$2Z"
            );
        }
        let restaurant;
        if(!req.body.restaurant) {
            restaurant = reservation.restaurant;
        } else {
            restaurant = await Restaurant.findById(req.body.restaurant) || reservation.restaurant;
        }
        if(!restaurant) {
            return res.status(400).json({
                success: false,
                message: `This restaurantId doesn't exist ${req.body.restaurant}.`
            })
        }
        console.log(reservation);
        const openTime = restaurant.openTime;
        const closeTime = restaurant.closeTime;
        const startDateTime = req.body.startDateTime || reservation.startDateTime.toISOString();
        let endDateTime = req.body.endDateTime || reservation.endDateTime.toISOString();
        const startTime = startDateTime.slice(11, 16);
        const endTime = endDateTime.slice(11, 16);
        // console.log(typeof startTime, typeof endTime);
        // console.log(startTime, endTime);
        // console.log(req.body);
        console.log(`Restarant time: ${openTime}-${closeTime}, your reserved ${startTime}-${endTime}`);
        //Rule: must be same date
        const startDate = startDateTime.slice(0, 10);
        const endDate = endDateTime.slice(0, 10);
        if(startDate!=endDate) {
            return res.status(400).json({
                success: false, 
                message: `The reserve must be on the same day. ${startDate} - ${endDate}`
            });
        }
        // Rule: l<r
        if(startTime>=endTime) {
            return res.status(400).json({
                success: false, 
                message: `End Time ${endTime} must be more than Start Time ${startTime}`
            });
        }
        //Rule: Only in available time
        if(!(openTime<=startTime && endTime<=closeTime)) {
            return res.status(400).json({
                success: false, 
                message: `Restarant time: ${openTime}-${closeTime}, your reserved ${startTime}-${endTime}`
            });
        }

        reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
            new: true, 
            runValidators: true
        });

        res.status(200).json({
            success: true, 
            data: reservation
        });
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({
            success: false, 
            message: 'Cannot update Reservation'
        })
    }
}

exports.deleteReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if(!reservation) {
            return res.status(404).json({
                success: false, 
                message: `No reservation with the id of ${req.params.id}`
            });
        }

        if(reservation.user.toString()!==req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false, 
                message: `User ${req.user.id} is not authorized to delete this reservation`
            });
        }
        await reservation.deleteOne();
        res.status(200).json({
            success: true, 
            data: {}
        });
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({
            success: true,
            message: 'Cannot delete Reservation'
        });
    }
}