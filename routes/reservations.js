const express = require("express");

const router = express.Router({mergeParams: true});

const {getReservations, getReservation, addReservation, updateReservation, deleteReservation} = require('../controllers/reservation');

const {protect, authorize} = require('../middleware/auth');

router.route('/').get(protect, getReservations)
    .post(protect, authorize('user', 'admin'), addReservation);
    
router.route('/:id').get(protect, getReservation)
    .put(protect, authorize('user', 'admin'), updateReservation)
    .delete(protect, authorize('user', 'admin'), deleteReservation);

module.exports = router;