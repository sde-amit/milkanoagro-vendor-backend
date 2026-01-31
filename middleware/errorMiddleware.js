const colors = require('colors');

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Log error details
    console.error(`❌ Error: ${message}`.red.bold);
    console.error(`📍 Stack: ${err.stack}`.red);

    // MySQL specific errors
    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 400;
        if (err.message.includes('phone')) {
            message = 'Phone number already exists';
        } else if (err.message.includes('email')) {
            message = 'Email already exists';
        } else {
            message = 'Duplicate entry found';
        }
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        statusCode = 400;
        message = 'Referenced record not found';
    }

    if (err.code === 'ER_BAD_FIELD_ERROR') {
        statusCode = 400;
        message = 'Invalid field in query';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(', ');
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File size too large';
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400;
        message = 'Unexpected file field';
    }

    // Twilio errors
    if (err.code && err.code.toString().startsWith('2')) {
        statusCode = 400;
        message = 'SMS service error: ' + err.message;
    }

    // AWS S3 errors
    if (err.code === 'NoSuchBucket') {
        statusCode = 500;
        message = 'File storage service unavailable';
    }

    const errorResponse = {
        success: false,
        message,
        ...(process.env.NODE_ENV === 'production' && {
            stack: err.stack,
            originalError: err.message
        })
    };

    res.status(statusCode).json(errorResponse);
};

module.exports = { errorHandler, notFound };