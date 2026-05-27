const { query } = require('./config/db');

async function inspect() {
  try {
    const [tables] = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("TABLES:", tables.map(t => t.table_name));
    for (const table of tables) {
      const tableName = table.table_name;
      const [columns] = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=?
      `, [tableName]);
      console.log(`\nTABLE: ${tableName}`);
      columns.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type} (Nullable: ${c.is_nullable})`);
      });
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

inspect();
