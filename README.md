# Milkano Agro - Vendor Management Backend

A comprehensive Node.js backend API for vendor management system with OTP-based authentication, file uploads, and real-time communication.

## 🚀 Features

- **OTP-based Authentication** - Secure phone number verification using Twilio
- **Vendor Management** - Complete vendor onboarding and profile management
- **File Upload System** - AWS S3 integration for document management
- **Real-time Communication** - Socket.IO for live updates
- **Admin Dashboard** - Administrative controls and system monitoring
- **Activity Logging** - Comprehensive audit trails
- **Rate Limiting** - API protection and abuse prevention
- **Database Management** - MySQL with automated schema setup

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 2
- **Authentication**: JWT + OTP (Twilio)
- **File Storage**: AWS S3
- **Real-time**: Socket.IO
- **Validation**: Zod
- **Security**: bcryptjs, CORS, Rate Limiting

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v14 or higher)
- MySQL Server
- AWS Account (for S3 bucket)
- Twilio Account (for SMS OTP)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3409
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_minimum_32_characters
   JWT_REFRESH_SECRET=your_refresh_secret_key_minimum_32_characters

   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=milkano_vendor_db

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=ap-south-1
   S3_BUCKET_NAME=your_s3_bucket_name

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number

   # Development Settings
   SEND_SMS_IN_DEV=false
   ```

4. **Database Setup**
   ```bash
   npm run setup-db
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3409`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP for registration/login |
| POST | `/api/auth/check-phone` | Check if phone number is registered |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/login` | Login with OTP |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |

### Vendor Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vendor/register` | Register new vendor |
| POST | `/api/vendor/onboarding` | Submit onboarding form |
| GET | `/api/vendor/profile` | Get vendor profile |
| PUT | `/api/vendor/profile` | Update vendor profile |
| GET | `/api/vendor/onboarding-status` | Get onboarding status |
| GET | `/api/vendor/all` | Get all vendors (Admin) |
| PUT | `/api/vendor/:id/approve` | Approve vendor (Admin) |
| PUT | `/api/vendor/:id/reject` | Reject vendor (Admin) |

### File Upload Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload files |
| POST | `/api/upload/vendor/:vendorId` | Upload vendor-specific files |
| GET | `/api/upload/files` | Get user files |
| GET | `/api/upload/files/vendor/:vendorId` | Get vendor files |
| DELETE | `/api/upload/:fileId` | Delete file |
| GET | `/api/upload/download/:fileId` | Get file download URL |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/cleanup` | Manual cleanup trigger |
| GET | `/api/admin/stats` | Get system statistics |
| GET | `/api/admin/activity` | Get activity logs |
| GET | `/api/admin/health` | System health check |

## 🗄️ Database Schema

The application uses MySQL with the following main tables:

- **users** - User authentication and basic info
- **otps** - OTP verification codes
- **vendor_profiles** - Basic vendor information
- **vendor_onboarding** - Detailed onboarding forms
- **vendor_products** - Product catalog
- **file_uploads** - File management
- **activity_logs** - System activity tracking

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── uploadController.js  # File upload logic
│   └── vendorController.js  # Vendor management logic
├── middleware/
│   ├── authMiddleware.js    # JWT authentication
│   ├── errorMiddleware.js   # Error handling
│   └── rateLimiter.js       # Rate limiting
├── routes/
│   ├── authRoutes.js        # Authentication routes
│   ├── adminRoutes.js       # Admin routes
│   ├── uploadRoutes.js      # File upload routes
│   └── vendorRoutes.js      # Vendor routes
├── schemas/
│   ├── index.js             # Schema registry
│   ├── userSchema.js        # User table schema
│   ├── vendorSchema.js      # Vendor table schemas
│   ├── fileSchema.js        # File table schema
│   ├── otpSchema.js         # OTP table schema
│   └── activitySchema.js    # Activity log schema
├── scripts/
│   ├── setupDatabase.js     # Database setup script
│   └── fixConstraints.js    # Database maintenance
├── services/
│   ├── cleanupService.js    # Cleanup operations
│   ├── otpService.js        # OTP management
│   ├── uploadService.js     # File upload service
│   └── validationService.js # Data validation
├── socket/
│   └── socketHandler.js     # Socket.IO handlers
├── utils/
│   ├── helpers.js           # Utility functions
│   ├── logger.js            # Logging utilities
│   └── schemaManager.js     # Database schema management
├── .env                     # Environment variables
├── server.js                # Main server file
└── package.json             # Dependencies and scripts
```
## 🔒 Se
curity Features

- JWT-based authentication with refresh tokens
- OTP verification for secure login
- Rate limiting on sensitive endpoints
- CORS configuration for cross-origin requests
- Input validation using Zod schemas
- SQL injection prevention with parameterized queries
- File upload restrictions and validation

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run setup-db` | Initialize database and tables |
| `npm run fix-constraints` | Fix database constraints |
| `npm run test-twilio` | Test Twilio SMS configuration |

## 🌐 Environment Variables

### Required Variables

- `PORT` - Server port (default: 3409)
- `NODE_ENV` - Environment mode (development/production)
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL configuration
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME` - AWS S3 config
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - Twilio SMS config

### Optional Variables

- `CLIENT_URL` - Frontend URL for CORS
- `SEND_SMS_IN_DEV` - Enable SMS in development (default: false)

## 🚨 Error Handling

The application includes comprehensive error handling:

- Global error middleware for unhandled errors
- Async error wrapper for route handlers
- Structured error responses with proper HTTP status codes
- Activity logging for error tracking

## 📊 Monitoring & Logging

- Activity logs for all user actions
- System health check endpoints
- Database connection monitoring
- File upload tracking
- Performance metrics collection

## 🔄 Real-time Features

Socket.IO integration provides:

- Real-time notifications
- Live status updates
- Admin dashboard updates
- File upload progress tracking

## 🧪 Testing

To test the API endpoints, you can use tools like:

- Postman
- Thunder Client (VS Code extension)
- curl commands
- Frontend integration

Default admin credentials for testing:
- Phone: `9999999999`
- Role: `admin`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Author

**Amit** - Milkano Agro Assignment Task

## 🆘 Support

For support and questions:

1. Check the API documentation above
2. Review the error logs in the console
3. Ensure all environment variables are properly configured
4. Verify database connection and table creation
5. Test Twilio and AWS S3 configurations

---

**Note**: Make sure to keep your environment variables secure and never commit them to version control.