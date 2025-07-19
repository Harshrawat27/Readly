const { PrismaClient } = require('./lib/generated/prisma');

async function checkTables() {
  const prisma = new PrismaClient();
  
  try {
    // Try to query each table to see what exists
    console.log('Checking tables...');
    
    try {
      await prisma.user.findMany({ take: 1 });
      console.log('✅ user table exists');
    } catch (e) {
      console.log('❌ user table missing:', e.message);
    }
    
    try {
      await prisma.session.findMany({ take: 1 });
      console.log('✅ session table exists');
    } catch (e) {
      console.log('❌ session table missing:', e.message);
    }
    
    try {
      await prisma.account.findMany({ take: 1 });
      console.log('✅ account table exists');
    } catch (e) {
      console.log('❌ account table missing:', e.message);
    }
    
    try {
      await prisma.verification.findMany({ take: 1 });
      console.log('✅ verification table exists');
    } catch (e) {
      console.log('❌ verification table missing:', e.message);
    }
    
    try {
      await prisma.pDF.findMany({ take: 1 });
      console.log('✅ PDF table exists');
    } catch (e) {
      console.log('❌ PDF table missing:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();