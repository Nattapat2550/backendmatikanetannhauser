const { setServers } = require("node:dns/promises");

setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
// const mongoSanitize = require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
// const { xss } = require('express-xss-sanitizer');
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

// ตั้งค่า Helmet ใหม่ให้ยอมรับ Script/CSS จาก CDN สำหรับ Swagger
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https://validator.swagger.io"],
        connectSrc: ["'self'", "http://localhost:3000", "https://backendmatikanetannhauser.vercel.app"],
      },
    },
    // ปิดการบล็อก Cross-Origin บางประเภทเพื่อให้โหลดหน้า UI ได้
    crossOriginEmbedderPolicy: false, 
  })
);

app.set('query parser','extended');
app.get('/favicon.ico', (req, res) => res.status(204).end());

// เพิ่มหน้า Home page ชั่วคราวเพื่อเวลาเปิดผ่าน Browser จะได้ไม่ Error
app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: "Welcome to Restaurant Reservation Backend API" });
});

app.use('/api/v1/restaurants', restaurants);
app.use('/api/v1/auth', auth);
app.use('/api/v1/reservations', reservations);
app.use('/api/v1/comments', comments);

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Library API',
            version: '1.0.0',
            description: 'A Restaurant Reservation API',
        },
        servers: [
            {
                url: 'https://backendmatikanetannhauser.vercel.app/api/v1',
            },
            {
                url: 'http://localhost:3000/api/v1', // เพิ่ม Local server ให้เทสบนเครื่องได้
            }
        ],
    },
    apis:['./routes/*.js'],
};

const swaggerDoc = swaggerJsDoc(swaggerOptions);

// บังคับให้โหลดไฟล์ CSS/JS จาก CDN เท่านั้น เพื่อป้องกันปัญหา Vercel หาไฟล์ local ไม่เจอ (MIME Error)
const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css";
const JS_URL = [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.min.js"
];

app.use('/api-docs',
    swaggerUI.serve,
    swaggerUI.setup(swaggerDoc, {
        customCssUrl: CSS_URL,
        customJs: JS_URL,
        customSiteTitle: "Restaurant API Documentation"
    })
);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port', PORT));

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // server.close(() => process.exit(1));
});