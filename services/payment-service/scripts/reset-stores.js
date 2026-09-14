const path = require('path');
const mongoose = require(path.resolve(__dirname, '../../store-service/node_modules/mongoose'));

async function resetStores() {
  await mongoose.connect('mongodb://localhost:27017/wowlife_stores');
  const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));
  const result = await Store.updateMany({}, {
    $set: {
      razorpayAccountId: null,
      razorpayStakeholderId: null,
      razorpayRouteStatus: 'not_created',
      razorpayRouteProductStatus: null,
    },
  });
  console.log(`✅ Successfully reset ${result.modifiedCount} store(s) in database.`);
  process.exit(0);
}

resetStores().catch((err) => {
  console.error(err);
  process.exit(1);
});
