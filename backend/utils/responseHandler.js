const sendResponse = (res, statusCode, success, data, error) => {
  res.status(statusCode).json({
    success,
    data: data || {},
    error: error || ""
  });
};

module.exports = { sendResponse };
