import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';

async function seedLogistics() {
  const client = new Client({
    connectionString: "postgresql://libremercado:libremercado@127.0.0.1:5434/libremercado"
  });
  
  try {
    await client.connect();
    console.log("Seeding logistics data...");

    // 1. Create a Rider User
    const riderId = "rider-demo-1";
    const hashedPassword = await bcrypt.hash( "repartidor123", 10);
    
    await client.query(`
      INSERT INTO users (id, username, email, password, role, terms_accepted, kyc_status)
      VALUES ($1, $2, $3, $4, $5, true, 'approved')
      ON CONFLICT (id) DO NOTHING
    `, [riderId, "repartidor_pedro", "pedro@pachapay.com", hashedPassword, "rider"]);

    // 2. Create Rider Profile
    await client.query(`
      INSERT INTO rider_profiles (user_id, vehicle_type, vehicle_plate, license_number, status, is_available, total_deliveries, rating)
      VALUES ($1, 'moto', 'ABC 123', 'LIC-999', 'active', true, 0, '5.0')
      ON CONFLICT (user_id) DO NOTHING
    `, [riderId]);

    // 3. Create some "READY" orders
    const stores = await client.query("SELECT id, lat, lng FROM stores LIMIT 2");
    if (stores.rows.length > 0) {
      const store = stores.rows[0];
      const orderIds = ["order-ready-1", "order-ready-2"];
      
      for (const id of orderIds) {
        await client.query(`
          INSERT INTO orders (id, customer_id, store_id, status, total, address, store_lat, store_lng, delivery_lat, delivery_lng)
          VALUES ($1, 'admin-principal', $2, 'ready', $3, 'Calle Falsa 123', $4, $5, -34.6137, -58.3916)
          ON CONFLICT (id) DO NOTHING
        `, [id, store.id, "15500.00", store.lat, store.lng]);
      }
    }

    console.log("Logistics seeding complete! User: repartidor_pedro / repartidor123");
  } catch (err) {
    console.error("SEED_ERROR:", err.message);
  } finally {
    await client.end();
  }
}

seedLogistics();
