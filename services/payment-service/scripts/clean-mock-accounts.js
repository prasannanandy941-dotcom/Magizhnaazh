const path = require('path');
const mongoose = require(path.resolve(__dirname, '../../store-service/node_modules/mongoose'));

async function cleanMockAccounts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/wowlife_stores');
    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));
    const result = await Store.updateMany(
      {},
      {
        $unset: { razorpayAccountId: '', razorpayStakeholderId: '' },
        $set: { razorpayRouteStatus: 'not_created', razorpayRouteProductStatus: 'not_created' }
      }
    );
    console.log('✅ Successfully reset mock Razorpay account IDs in MongoDB:', result);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting mock accounts:', err);
    process.exit(1);
  }
}

cleanMockAccounts();
