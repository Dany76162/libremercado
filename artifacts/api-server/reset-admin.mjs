import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://libremercado:libremercado@127.0.0.1:5434/libremercado' 
});

async function reset() {
  const email = 'danielcata2023@gmail.com';
  const pass = 'catalina0112192122';
  const hashed = await bcrypt.hash(pass, 10);

  try {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rows.length > 0) {
      console.log('User found! Updating password and role to admin...');
      await pool.query(
        'UPDATE users SET password = $1, role = $2, kyc_status = $3 WHERE email = $4',
        [hashed, 'admin', 'approved', email]
      );
    } else {
      console.log('User not found. Creating user...');
      await pool.query(
        'INSERT INTO users (username, email, password, role, kyc_status, terms_accepted) VALUES ($1, $2, $3, $4, $5, $6)',
        ['danielcata', email, hashed, 'admin', 'approved', true]
      );
    }
    console.log('Success! Try logging in now.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

reset();
