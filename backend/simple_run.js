console.log("=== STARTING SIMPLE RUN ===");
try {
  const { initializeDatabase } = require('./config/db');
  console.log("Database module loaded successfully.");
  initializeDatabase()
    .then(() => {
      console.log("Database initialization promise resolved successfully!");
      process.exit(0);
    })
    .catch(err => {
      console.error("Database initialization promise rejected:", err);
      process.exit(1);
    });
} catch (e) {
  console.error("Failed to load db module or run:", e);
  process.exit(1);
}
