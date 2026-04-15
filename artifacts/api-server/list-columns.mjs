import pkg from 'pg';
const { Client } = pkg;

async function listColumns() {
  const client = new Client({
    connectionString: "postgresql://libremercado:libremercado@127.0.0.1:5434/libremercado"
  });
  
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);
    console.log("COLUMNS for 'orders':", res.rows);
  } catch (err) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await client.end();
  }
}

listColumns();
