import pkg from 'pg';
const { Client } = pkg;

async function checkRiders() {
  const client = new Client({
    connectionString: "postgresql://libremercado:libremercado@127.0.0.1:5434/libremercado"
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT count(*) FROM rider_profiles');
    console.log(`TOTAL_RIDERS: ${res.rows[0].count}`);
    
    if (parseInt(res.rows[0].count) > 0) {
      const samples = await client.query(`
        SELECT u.username, rp.vehicle_type, rp.status, rp.is_available 
        FROM rider_profiles rp
        JOIN users u ON u.id = rp.user_id
        LIMIT 5
      `);
      console.log("SAMPLES:", samples.rows);
    }
  } catch (err) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await client.end();
  }
}

checkRiders();
