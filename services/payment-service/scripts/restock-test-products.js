const path = require('path');
const mongoose = require(path.resolve(__dirname, '../../store-service/node_modules/mongoose'));

async function restockProducts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/wowlife_products');
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const result = await Product.updateMany(
      { totalStock: { $lte: 0 } },
      { $set: { totalStock: 50, availability: 'In Stock' } }
    );
    console.log('✅ Restocked 0-stock products:', result);
    process.exit(0);
  } catch (err) {
    console.error('❌ Restock error:', err);
    process.exit(1);
  }
}

restockProducts();
