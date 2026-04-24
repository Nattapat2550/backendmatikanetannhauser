const express = require("express");
const {register, login, getMe, logout, getAll} = require('../controllers/auth');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe)
    .get('/all', protect, authorize('admin'), getAll)
    .get('/logout', logout);
    
module.exports = router;

/**
 * @swagger
 * components:
 *  schemas:
 *      Users:
 *          type: object
 *          required:
 *              - name
 *              - password
 *              - email
 *              - telephone
 *              - role
 *              - createdAt
 *          properties:
 *              id:
 *                  type: ObjectId
 *                  format: uuid
 *                  description: The auto-generated id of the restaurant
 *                  example: 69a27e90cedf57de4eaa7825
 *              name:
 *                  type: string
 *                  description: User Name
 *              password:
 *                  type: string
 *                  description: Hashed User's Passwrod
 *              email:
 *                  type: string
 *                  description: User Email
 *              telephone:
 *                  type: string
 *                  description: User Telephone
 *              role:
 *                  type: string
 *                  description: User Role
 *              createdAt:
 *                  type: Date
 *                  description: User Created Date and Time
 *          example:
 *              name: Admin Got InwZa
 *              password: $2b$10$FWVUdIYj7raSjnKisGFTDu.lJ2gcpY/lDHQar6CHhXw9fUPrTcWuK
 *              email: admin@gmail.com
 *              telephone: "0600000001"
 *              role: admin
 *              createdAt: 2026-02-28T05:35:12.537+00:00
 */
/**
 * @swagger
 * tags:
 *  name: Authentication
 *  description: The authentication managing API
 */
/**
 * @swagger
 * /auth/register:
 *      post:
 *          summary: Create a new user
 *          tags: [Authentication]
 *          requestBody:
 *              required: true
 *              content:
 *                 application/json:
 *                     schema:
 *                         type: object
 *                     required:
 *                         - name
 *                         - email
 *                         - password
 *                         - telephone
 *                         - role
 *                     properties:
 *                         name:
 *                             type: string
 *                         email:
 *                             type: string
 *                         password:
 *                             type: string
 *                         telephone:
 *                             type: string
 *                         role:
 *                             type: string
 *                     example:
 *                         name: Admin Got InwZa
 *                         password: fakepassword
 *                         email: admin@gmail.com
 *                         telephone: "0600000001"
 *                         role: admin
 *          responses:
 *              200:
 *                  description: The user was successfully created
 *              400:
 *                  description: Register Unsuccessfully
 * /auth/login:
 *      post:
 *          summary: login user
 *          tags: [Authentication]
 *          requestBody:
 *              required: true
 *              content:
 *                 application/json:
 *                     schema:
 *                         type: object
 *                     required:
 *                         - email
 *                         - password
 *                     properties:
 *                         email:
 *                             type: string
 *                         password:
 *                             type: string
 *                     example:
 *                         email: admin@gmail.com
 *                         password: fakepassword
 *          responses:
 *              200:
 *                  description: Login successfully, returns JWT token
 *              400:
 *                  description: Invalid credentials
 *              401:
 *                  description: Unauthorized
 * /auth/me:
 *      get:
 *          summary: Get current logged-in user
 *          tags: [Authentication]
 *          security:
 *              - bearerAuth: []
 *          responses:
 *              200:
 *                  description: Current user data
 *              401:
 *                  description: Unauthorized
 * /auth/all:
 *      get:
 *          summary: Get all users (Admin only)
 *          tags: [Authentication]
 *          security:
 *              - bearerAuth: []
 *          responses:
 *              200:
 *                  description: List of all users
 *              401:
 *                  description: Unauthorized
 *              403:
 *                  description: Forbidden
 * /auth/logout:
 *      get:
 *          summary: Returns the list of all the restaurants
 *          tags: [Authentication]
 *          responses:
 *              200:
 *                  description: Logged out successfully
 */