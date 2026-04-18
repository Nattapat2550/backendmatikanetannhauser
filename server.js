const { setServers } = require("node:dns/promises");

setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const connectDB = require('./config/db');

const restaurants = require('./routes/restaurants');
const auth = require('./routes/auth');
const reservations = require('./routes/reservations');
const comments = require('./routes/comments');

dotenv.config({ path: './config/config.env' });
connectDB();

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.options(/.*/, cors());

app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
// Rate Limit
/*const limiter = rateLimit({
    windowMs: 10*60*1000,
    max: 100,
});
app.use(limiter);*/
app.set('query parser','extended');

app.get('/favicon.ico', (req, res) => res.status(204).end());

// เพิ่มหน้า Home page ชั่วคราวเพื่อเวลาเปิดผ่าน Browser จะได้ไม่ Error
app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: "Welcome to VacQ Backend API" });
});
app.use('/api/v1/restaurants', restaurants);
app.use('/api/v1/auth', auth);
app.use('/api/v1/reservations', reservations);
app.use('/api/v1/comments', comments);

// const swaggerJsDoc = require('swagger-jsdoc');
// const swaggerUI = require('swagger-ui-express');

// const swaggerOptions = {
//     swaggerDefinition: {
//         openapi: '3.0.0',
//         info: {
//             title: 'Library API',
//             version: '1.0.0',
//             description: 'A simple Express VacQ API',
//         },
//         servers: [
//             {
//                 url: 'http://localhost:5000/api/v1',
//             }
//         ],
//     },
//     apis:['./routes/*.js'],
// };

// const swaggerDoc = swaggerJsDoc(swaggerOptions);

// app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDoc));

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port', PORT));

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});