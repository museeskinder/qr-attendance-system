const getGMT3Now = () => {
  // Get current UTC time
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // Add 3 hours (GMT+3)
  return new Date(utc + 3 * 60 * 60 * 1000);
};

module.exports = { getGMT3Now };
