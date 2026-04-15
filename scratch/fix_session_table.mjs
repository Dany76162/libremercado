import pg from 'pg';
const { Client } = pg;

const client = new Client({ 
    connectionString: 'postgresql://libremercado:libremercado@127.0.0.1:5434/libremercado' 
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            ) WITH (OIDS=FALSE);
        `);
        console.log('Table "session" created or already exists');

        try {
            await client.query('ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;');
            console.log('Primary key added');
        } catch (e) {
            console.log('Primary key might already exist');
        }

        try {
            await client.query('CREATE INDEX "IDX_session_expire" ON "session" ("expire");');
            console.log('Index added');
        } catch (e) {
            console.log('Index might already exist');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
