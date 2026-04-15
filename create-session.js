const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5434/libremercado' }); 
client.connect().then(async () => {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
              "sid" varchar NOT NULL COLLATE "default",
              "sess" json NOT NULL,
              "expire" timestamp(6) NOT NULL
            ) WITH (OIDS=FALSE);
        `);
        console.log("Table created");
        try {
            await client.query(`ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;`);
            await client.query(`CREATE INDEX "IDX_session_expire" ON "session" ("expire");`);
        } catch (ignored) {
            // Probably already exists
        }
    } catch(e) {
        console.error(e);
    }
}).then(() => client.end());
