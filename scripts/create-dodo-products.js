// Script to create Dodo Payment products for your subscription plans
// Run this with: node scripts/create-dodo-products.js

const DodoPayments = require('dodopayments');

// Load environment variables manually
const fs = require('fs');
const path = require('path');

function loadEnvFile(filename) {
  try {
    const envPath = path.join(__dirname, '..', filename);
    const envData = fs.readFileSync(envPath, 'utf8');
    const envLines = envData.split('\n');

    for (const line of envLines) {
      const trimmedLine = line.trim();
      if (
        trimmedLine &&
        !trimmedLine.startsWith('#') &&
        trimmedLine.includes('=')
      ) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        process.env[key.trim()] = value.trim();
      }
    }
  } catch (error) {
    console.log(`Could not load ${filename}: ${error.message}`);
  }
}

// Load .env.local first, then .env
loadEnvFile('.env.local');
loadEnvFile('.env');

const dodopayments = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY_TEST || process.env.DODO_API_KEY_LIVE,
  environment:
    process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
});

const PLANS = [
  {
    name: 'Pro Monthly',
    description:
      '10 PDF uploads per month, 1,000 questions, up to 200 pages per PDF',
    price: 10,
    interval: 'month',
    planType: 'pro',
  },
  {
    name: 'Pro Yearly',
    description:
      '10 PDF uploads per month, 1,000 questions, up to 200 pages per PDF - Save 16%',
    price: 100,
    interval: 'year',
    planType: 'pro',
  },
  {
    name: 'Ultimate Monthly',
    description:
      'Unlimited PDF uploads, unlimited questions, up to 2000 pages per PDF',
    price: 15,
    interval: 'month',
    planType: 'ultimate',
  },
  {
    name: 'Ultimate Yearly',
    description:
      'Unlimited PDF uploads, unlimited questions, up to 2000 pages per PDF - Save 37%',
    price: 150,
    interval: 'year',
    planType: 'ultimate',
  },
];

async function createProducts() {
  console.log('Creating Dodo Payment products...\n');

  for (const plan of PLANS) {
    try {
      console.log(`Creating: ${plan.name} ($${plan.price}/${plan.interval})`);

      const product = await dodopayments.products.create({
        name: plan.name,
        description: plan.description,
        price_amount: plan.price * 100, // Convert to cents
        price_currency: 'USD',
        type: 'subscription',
        interval: plan.interval,
        metadata: {
          planType: plan.planType,
          interval: plan.interval,
        },
      });

      console.log(`✅ Created product: ${product.id} - ${product.name}`);
      console.log(
        `   Price: $${product.price_amount / 100} ${product.price_currency}`
      );
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to create ${plan.name}:`, error.message);
      console.log('');
    }
  }
}

async function listExistingProducts() {
  console.log('Existing products in your Dodo Payments account:\n');

  try {
    const products = await dodopayments.products.list();

    if (products.items && products.items.length > 0) {
      products.items.forEach((product) => {
        console.log(
          `📦 ${product.name} - $${product.price_amount / 100} (${product.id})`
        );
      });
    } else {
      console.log('No products found.');
    }
    console.log('');
  } catch (error) {
    console.error('Error listing products:', error.message);
  }
}

async function main() {
  if (!process.env.DODO_API_KEY_TEST && !process.env.DODO_API_KEY_LIVE) {
    console.error(
      '❌ Missing Dodo Payments API key. Set DODO_API_KEY_TEST or DODO_API_KEY_LIVE in your .env file'
    );
    process.exit(1);
  }

  console.log(
    '🔑 Using Dodo Payments in:',
    process.env.NODE_ENV === 'production' ? 'LIVE mode' : 'TEST mode'
  );
  console.log('');

  await listExistingProducts();

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    'Do you want to create the subscription products? (y/N): ',
    async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await createProducts();
        console.log('✨ Done! You can now use the subscription system.');
      } else {
        console.log('Skipped product creation.');
      }
      rl.close();
    }
  );
}

main().catch(console.error);
