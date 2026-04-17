import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://libremercado:libremercado@127.0.0.1:5434/libremercado' 
});

async function run() {
  const email = 'danielcata2023@gmail.com';
  const pass = 'catalina0112192122';
  const hashed = await bcrypt.hash(pass, 10);

  try {
    // 1. Create session table
    console.log('Ensuring session table exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      ) WITH (OIDS=FALSE);
      
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
          ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    // 2. Reset admin users
    const emails = ['danielcata2023@gmail.com', 'dany76162@gmail.com'];
    for (const email of emails) {
      const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (res.rows.length > 0) {
        console.log(`User ${email} found! Updating password and role to admin...`);
        const updateRes = await pool.query(
          'UPDATE users SET password = $1, role = $2, kyc_status = $3 WHERE email = $4',
          [hashed, 'admin', 'approved', email]
        );
        console.log(`Update status for ${email}: ${updateRes.rowCount} row(s) updated.`);
      } else {
        console.log(`User ${email} not found. Creating user...`);
        await pool.query(
          'INSERT INTO users (username, email, password, role, kyc_status, terms_accepted) VALUES ($1, $2, $3, $4, $5, $6)',
          [email.split('@')[0], email, hashed, 'admin', 'approved', true]
        );
      }
    }
    console.log('All systems ready! Try logging in now.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
