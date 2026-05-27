const getCurrentEthiopianTime = () => {
  // GMT+3 offset (Ethiopia)
  const offsetMs = 3 * 60 * 60 * 1000;
  return new Date(Date.now() + offsetMs);
};

module.exports = { getCurrentEthiopianTime };
