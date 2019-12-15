const AppError = require('../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  // find the actual field value
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational trusted error: send message to the client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });

    // Programmatical or other unknown errors: don't leak error details
  } else {
    // 1. Log error
    console.error('ERROR 💥', err);

    // 2. Send generic error
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong'
    });
  }
};

module.exports = (err, req, res, next) => {
  //   console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // copy error body in order to not override the original "err"
    let error = { ...err };

    // handle Mongoose cast errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    // handle duplicate fields
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);

    // NOTE: "err" is replaced with "error" copy variable
    sendErrorProd(error, res);
  }
};
