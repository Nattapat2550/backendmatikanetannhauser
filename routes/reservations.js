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

/**
 * @swagger
 * components:
 *  schemas:
 *      Reservations:
 *          type: object
 *          required:
 *              - startDateTime
 *              - endDateTime
 *              - user
 *              - Restaurant
 *          properties:
 *              id:
 *                  type: ObjectId
 *                  format: uuid
 *                  description: The auto-generated id of the restaurant
 *                  example: 69e5f14c45ae1777178f876e
 *              startDateTime:
 *                  type: string
 *                  description: Reservation start datetime
 *              endDateTime:
 *                  type: string
 *                  description: Reservation end datetime
 *              user:
 *                  type: string
 *                  description: User ID
 *              Restaurant:
 *                  type: string
 *                  description: Restaurant ID
 *          example:
 *              startDateTime: 2026-04-21T18:45:00.000+00:00
 *              endDateTime: 2026-04-21T19:30:00.000+00:00
 *              user: 69c1761f02adc32ef6963515
 *              Restaurant: "69e4b0b4beee3c9dba1caf5d"
 */
/**
 * @swagger
 * tags:
 *  name: Reservations
 *  description: The reservations managing API
 */
/**
 * @swagger
 * /reservations:
 *      get:
 *          summary: Returns the list of all the reservations (admin sees all, user sees own)
 *          tags: [Reservations]
 *          responses:
 *              200:
 *                  description: The list of the reservations
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: array
 *                              items:
 *                                  $ref: '#/components/schemas/Reservations'
 *              401:
 *                  description: Unauthorized
 *              500:
 *                  description: Internal Server Error
 *      post:
 *          summary: Create a new reservation
 *          tags: [Reservations]
 *          parameters:
 *            - in: path
 *              name: restaurantId
 *              schema:
 *                type: string
 *              required: true
 *              description: The restaurant id
 *          requestBody:
 *              required: true
 *              content:
 *                 application/json:
 *                     schema:
 *                         type: object
 *                     required:
 *                         - startDateTime
 *                         - endDateTime
 *                     properties:
 *                         startDateTime:
 *                             type: string
 *                             description: Reservation start datetime
 *                         endDateTime:
 *                             type: string
 *                             description: Reservation end datetime
 *                     example:
 *                         startDateTime: 2026-04-21T18:45:00.000+00:00
 *                         endDateTime: 2026-04-21T19:30:00.000+00:00
 *          responses:
 *              200:
 *                  description: The reservation was successfully created
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: array
 *                              items:
 *                                  $ref: '#/components/schemas/Reservations'
 *              400:
 *                description: Invalid Input
 *              401:
 *                description: Unauthorized
 *              404:
 *                description: The restaurant was not found
 *              500:
 *                  description: Internal Server Error
 *                      
 * /reservations/{restaurantId}:
 *      get:
 *          summary: Return a single the reservation
 *          tags: [Reservations]
 *          parameters:
 *            - in: path
 *              name: id
 *              schema:
 *                type: string
 *              required: true
 *              description: The reservation id
 *          responses:
 *              200:
 *                  description: The reservation description by id
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/components/schemas/Reservations'
 *              401:
 *                  description: Unauthorized
 *              404:
 *                  description: The reservation was not found
 *              500:
 *                  description: Internal Server Error
 *      put:
 *          summary: Update the reservation by the id
 *          tags: [Reservations]
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                  type: string
 *                required: true
 *                description: The reservation id
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Reservations'
 *          responses:
 *              200:
 *                  description: The reservation was updated
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/components/schemas/Reservations'
 *              400:
 *                  description: Bad Request
 *              401:
 *                  description: Unauthorized
 *              404:
 *                  description: The reservation id was not found
 *              500:
 *                  description: Internal Server Error
 *      delete:
 *          summary: Remove the reservation by the id
 *          tags: [Reservations]
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                  type: string
 *                required: true
 *                description: The reservation id
 *          responses:
 *              200:
 *                  description: The reservation was deleted
 *              401:
 *                  description: Unauthorized
 *              404:
 *                  description: The reservation id was not found
 *              500:
 *                  description: Internal Server Error
 */