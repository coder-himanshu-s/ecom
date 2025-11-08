import express from 'express';
import { body, validationResult } from 'express-validator';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

const router = express.Router();

// Helper function to get or create cart
async function getOrCreateCart(userId = 'default-user') {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
    await cart.save();
  }
  return cart;
}

// GET /api/cart - Get cart with total
router.get('/', async (req, res, next) => {
  try {
    const userId = req.query.userId || 'default-user';
    const cart = await getOrCreateCart(userId);
    
    // Populate product details
    await cart.populate('items.productId');
    
    // Calculate total
    const total = await cart.calculateTotal();
    
    // Format response
    const items = cart.items.map(item => ({
      id: item._id,
      product: item.productId,
      quantity: item.quantity,
      subtotal: item.productId ? item.productId.price * item.quantity : 0
    }));
    
    res.json({
      success: true,
      data: {
        items,
        total: parseFloat(total.toFixed(2)),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cart - Add item to cart
router.post('/', [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: errors.array() }
      });
    }
    
    const { productId, qty } = req.body;
    const userId = req.body.userId || 'default-user';
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }
    
    // Get or create cart
    const cart = await getOrCreateCart(userId);
    
    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity
      cart.items[existingItemIndex].quantity += qty;
    } else {
      // Add new item
      cart.items.push({ productId, quantity: qty });
    }
    
    await cart.save();
    
    // Populate and calculate total
    await cart.populate('items.productId');
    const total = await cart.calculateTotal();
    
    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        items: cart.items.map(item => ({
          id: item._id,
          product: item.productId,
          quantity: item.quantity
        })),
        total: parseFloat(total.toFixed(2))
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid product ID' }
      });
    }
    next(error);
  }
});

// DELETE /api/cart/:id - Remove item from cart
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.query.userId || 'default-user';
    const cart = await getOrCreateCart(userId);
    
    const itemId = req.params.id;
    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === itemId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cart item not found' }
      });
    }
    
    cart.items.splice(itemIndex, 1);
    await cart.save();
    
    // Populate and calculate total
    await cart.populate('items.productId');
    const total = await cart.calculateTotal();
    
    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        items: cart.items.map(item => ({
          id: item._id,
          product: item.productId,
          quantity: item.quantity
        })),
        total: parseFloat(total.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/cart/:id - Update item quantity
router.put('/:id', [
  body('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: errors.array() }
      });
    }
    
    const userId = req.query.userId || 'default-user';
    const cart = await getOrCreateCart(userId);
    
    const itemId = req.params.id;
    const item = cart.items.id(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cart item not found' }
      });
    }
    
    item.quantity = req.body.qty;
    await cart.save();
    
    // Populate and calculate total
    await cart.populate('items.productId');
    const total = await cart.calculateTotal();
    
    res.json({
      success: true,
      message: 'Cart item updated',
      data: {
        items: cart.items.map(item => ({
          id: item._id,
          product: item.productId,
          quantity: item.quantity
        })),
        total: parseFloat(total.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

