import pkg from 'pg';
const { Client } = pkg;

async function checkVideos() {
  const client = new Client({
    connectionString: "postgresql://libremercado:libremercado@127.0.0.1:5434/libremercado"
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT count(*) FROM shoppable_videos');
    console.log(`TOTAL_VIDEOS: ${res.rows[0].count}`);
    
    if (parseInt(res.rows[0].count) === 0) {
      console.log("No videos found. We should seed some for the demo.");
    } else {
      const samples = await client.query('SELECT title, status FROM shoppable_videos LIMIT 5');
      console.log("SAMPLES:", samples.rows);
    }
  } catch (err) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await client.end();
  }
}

checkVideos();
