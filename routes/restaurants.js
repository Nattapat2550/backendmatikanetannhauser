const express = require("express");

const {getRestaurants, getRestaurant, createRestaurant, updateRestaurant, deleteRestaurant} = require('../controllers/restaurants');

const reservationRouter=require('./reservations');
const commentRouter = require('./comments');

const router = express.Router();

const {protect,authorize} = require('../middleware/auth');

router.use('/:restaurantId/reservations/',reservationRouter);
router.use('/:restaurantId/comments/', commentRouter);

router.route('/').get(getRestaurants).post(protect,authorize('admin','owner'),createRestaurant);
router.route('/:id').get(getRestaurant).put(protect,authorize('admin','owner'),updateRestaurant).delete(protect,authorize('admin','owner'),deleteRestaurant);

module.exports = router;

/**
 * @swagger
 * components:
 *  schemas:
 *      Restaurants:
 *          type: object
 *          required:
 *              - name
 *              - address
 *              - imgsrc
 *              - telephone
 *              - openTime
 *              - closeTime
 *              - owner
 *          properties:
 *              id:
 *                  type: ObjectId
 *                  format: uuid
 *                  description: The auto-generated id of the restaurant
 *                  example: 69ea0d3a5cf6597df5661821
 *              name:
 *                  type: string
 *                  description: Restaurant Name
 *              imgsrc:
 *                  type: string
 *                  description: Restaurant Image Source
 *              telephone:
 *                  type: string
 *                  description: Restaurant Telephone
 *              openTime:
 *                  type: string
 *                  description: Restaurant Opened Time
 *              closeTime:
 *                  type: string
 *                  description: Restaurant Closed Time
 *              owner:
 *                  type: ObjectId
 *                  description: Restaurant Owner ID
 *          example:
 *              name: MyRestaurant1
 *              address: 1001 Banthat Thong Rd, Wang Mai, Pathum Wan, Bangkok 10330
 *              imgsrc: MyRestaurant1
 *              telephone: "0989999999"
 *              openTime: 09:00
 *              closeTime: 22:00
 *              owner: 69e6e63f3cfaebb185eb45f5
 */
/**
 * @swagger
 * tags:
 *  name: Restaurants
 *  description: The restaurants managing API
 */
/**
 * @swagger
 * /restaurants:
 *      get:
 *          summary: Returns the list of all the restaurants
 *          tags: [Restaurants]
 *          responses:
 *              200:
 *                  description: The list of the restaurants
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: array
 *                              items:
 *                                  $ref: '#/components/schemas/Restaurants'
 *              500:
 *                  description: Internal Server Error
 *      post:
 *          summary: Create a new restaurant
 *          tags: [Restaurants]
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Restaurants'
 *          responses:
 *              200:
 *                  description: The restaurant was successfully created
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: array
 *                              items:
 *                                  $ref: '#/components/schemas/Restaurants'
 *              400:
 *                description: Validation Error
 *              401:
 *                description: Unauthorized
 *              500:
 *                  description: Internal Server Error
 *                      
 * /restaurants/{id}:
 *      get:
 *          summary: Return a single the restaurant
 *          tags: [Restaurants]
 *          parameters:
 *            - in: path
 *              name: id
 *              schema:
 *                type: string
 *              required: true
 *              description: The restaurant id
 *          responses:
 *              200:
 *                  description: The restaurant description by id
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/components/schemas/Restaurants'
 *              400:
 *                  description: Invalid restaurant ID
 *              404:
 *                  description: The restaurant was not found
 *              500:
 *                  description: Internal Server Error
 *      put:
 *          summary: Update the restaurant by the id
 *          tags: [Restaurants]
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                  type: string
 *                required: true
 *                description: The restaurant id
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Restaurants'
 *          response:
 *              200:
 *                  description: The restaurant was updated
 *                  content:
 *                      application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Restaurants'
 *              400:
 *                  description: Validation Error
 *              401:
 *                  description: Unauthorized
 *              404:
 *                  description: The restaurant id was not found
 *              500:
 *                  description: Internal Server Error
 *      delete:
 *          summary: Remove the restaurant by the id
 *          tags: [Restaurants]
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                  type: string
 *                required: true
 *                description: The restaurant id
 *          response:
 *              200:
 *                  description: The restaurant was deleted
 *              400:
 *                  description: Invalid restaurant ID
 *              401:
 *                  description: Unauthorized
 *              404:
 *                  description: The restaurant id was not found
 *              500:
 *                  description: Internal Server Error
 */