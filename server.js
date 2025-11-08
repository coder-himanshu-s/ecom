import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import checkoutRoutes from './routes/checkout.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vibe-commerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  // Seed initial products if database is empty
  seedProducts();
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  // Fallback to in-memory storage if MongoDB fails
  console.log('⚠️  Falling back to in-memory storage');
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vibe Commerce API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

// Seed products function
async function seedProducts() {
  try {
    const Product = (await import('./models/Product.js')).default;
    const count = await Product.countDocuments();
    
    if (count === 0) {
      const products = [
        { name: 'Wireless Headphones', price: 79.99, description: 'Premium noise-cancelling headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' },
        { name: 'Smart Watch', price: 249.99, description: 'Feature-rich smartwatch with health tracking', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' },
        { name: 'Laptop Stand', price: 39.99, description: 'Ergonomic aluminum laptop stand', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500' },
        { name: 'Mechanical Keyboard', price: 129.99, description: 'RGB mechanical gaming keyboard', image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500' },
        { name: 'USB-C Hub', price: 49.99, description: 'Multi-port USB-C hub with HDMI', image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500' },
        { name: 'Wireless Mouse', price: 29.99, description: 'Ergonomic wireless mouse', image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500' },
        { name: 'Monitor Stand', price: 34.99, description: 'Adjustable dual monitor stand', image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500' },
        { name: 'Desk Lamp', price: 24.99, description: 'LED desk lamp with adjustable brightness', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500' }
      ];
      
      await Product.insertMany(products);
      console.log('✅ Products seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});

