require('dotenv').config();
const { Database } = require('./database');

async function testPostgresConnection() {
  console.log('Testing PostgreSQL connection...');
  
  // Use the DATABASE_URL from environment variables
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('Using database URL:', databaseUrl.substring(0, databaseUrl.indexOf(':') + 5) + '***');
  
  const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
  
  if (!isPostgres) {
    console.error('DATABASE_URL does not appear to be a PostgreSQL connection string');
    console.log('Expected format: postgresql://username:password@host:port/database');
    process.exit(1);
  }
  
  try {
    const database = new Database(databaseUrl);
    await database.connect();
    console.log('✅ Successfully connected to PostgreSQL database');
    
    // Test creating tables
    await database.initTables();
    console.log('✅ Tables created successfully');
    
    // Close the connection
    await database.close();
    console.log('✅ Connection closed successfully');
    
    console.log('\\n🎉 PostgreSQL connection test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing PostgreSQL connection:', error.message);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPostgresConnection();
}

module.exports = { testPostgresConnection };