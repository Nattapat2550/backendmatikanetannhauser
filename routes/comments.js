const express = require('express');
const { getComments, getComment, addComment, updateComment, deleteComment } = require('../controllers/comments');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.route('/')
    .get(getComments)
    .post(protect, authorize('user', 'admin'), addComment);

router.route('/:id')
    .get(getComment)
    .put(protect, authorize('user', 'admin'), updateComment)
    .delete(protect, authorize('user', 'admin'), deleteComment);

module.exports = router;

/**
 * @swagger
 * components:
 *  schemas:
 *      Comments:
 *          type: object
 *          required:
 *              - text
 *              - rating
 *              - isEdited
 *              - restaurant
 *              - user
 *          properties:
 *              id:
 *                  type: ObjectId
 *                  format: uuid
 *                  description: The auto-generated id of the restaurant
 *                  example: 69e5e9304ac3a75bfc8027bf
 *              text:
 *                  type: string
 *                  description: comment text
 *              rating:
 *                  type: number
 *                  description: comment rating score
 *              isEdited:
 *                  type: boolean
 *                  description: comment is edited flag
 *              restaurant:
 *                  type: ObjectId
 *                  description: Restaurant ID
 *              user:
 *                  type: ObjectId
 *                  description: User ID
 *          example:
 *              text: อาหารอร่อยมาก บริการดีเยี่ยม!
 *              rating: 4
 *              isEdited: true
 *              restaurant: "69e4b140beee3c9dba1caf5f"
 *              user: "69e5e91c4ac3a75bfc8027be"
 */
/**
 * @swagger
 * tags:
 *  name: Comments
 *  description: The comments managing API
 */
/**
 * @swagger
 * /comments:
 *      get:
 *          summary: Returns the list of all the comments (admin sees all, user sees own)
 *          tags: [Comments]
 *          responses:
 *              200:
 *                  description: The list of the comments
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: array
 *                              items:
 *                                  $ref: '#/components/schemas/Comments'
 *              500:
 *                  description: Internal Server Error
 *      post:
 *          summary: Create a new comment
 *          tags: [Comments]
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
 *                         - text
 *                         - rating
 *                     properties:
 *                         text:
 *                             type: string
 *                             description: Comment text
 *                         rating:
 *                             type: number
 *                             description: Comment rating score
 *                     example:
 *                         text: อาหารอร่อยมาก บริการดีเยี่ยม!
 *                         rating: 4
 *          responses:
 *              201:
 *                  description: The comment was successfully created
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: array
 *                              items:
 *                                  $ref: '#/components/schemas/Comments'
 *              400:
 *                description: Invalid Input
 *              401:
 *                description: Unauthorized
 *              404:
 *                description: The restaurant was not found
 *              500:
 *                  description: Internal Server Error
 *                      
 * /comments/{id}:
 *      get:
 *          summary: Return a single the comment
 *          tags: [Comments]
 *          parameters:
 *            - in: path
 *              name: id
 *              schema:
 *                type: string
 *              required: true
 *              description: The comment id
 *          responses:
 *              200:
 *                  description: The comment description by id
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/components/schemas/Comments'
 *              404:
 *                  description: The comment was not found
 *              500:
 *                  description: Internal Server Error
 *      put:
 *          summary: Update the comment by the id
 *          tags: [Comments]
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                  type: string
 *                required: true
 *                description: The comment id
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Comments'
 *          response:
 *              200:
 *                  description: The comment was updated
 *                  content:
 *                      application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Comments'
 *              400:
 *                  description: Bad Request
 *              401:
 *                  description: Unauthorized
 *              404:
 *                  description: The comment id was not found
 *              500:
 *                  description: Internal Server Error
 *      delete:
 *          summary: Remove the comment by the id
 *          tags: [Comments]
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                  type: string
 *                required: true
 *                description: The comment id
 *          response:
 *              200:
 *                  description: The comment was deleted
 *              401:
 *                  description: Unauthorized
 *              404:
 *                  description: The comment id was not found
 *              500:
 *                  description: Internal Server Error
 */