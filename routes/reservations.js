const express = require("express");

const router = express.Router({mergeParams: true});

const {getReservations, getReservation, addReservation, updateReservation, deleteReservation} = require('../controllers/reservation');

const {protect, authorize} = require('../middleware/auth');

router.route('/').get(protect, getReservations)
    .post(protect, authorize('user', 'admin','owner'), addReservation);
    
router.route('/:id').get(protect, getReservation)
    .put(protect, authorize('user', 'admin','owner'), updateReservation)
    .delete(protect, authorize('user', 'admin','owner'), deleteReservation);

module.exports = router;