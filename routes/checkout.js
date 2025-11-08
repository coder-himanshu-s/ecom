import express from 'express';
import { body, validationResult } from 'express-validator';
import Cart from '../models/Cart.js';

const router = express.Router();

// POST /api/checkout - Process checkout
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('cartItems').isArray().withMessage('Cart items are required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: errors.array() }
      });
    }
    
    const { name, email, cartItems, userId } = req.body;
    
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cart is empty' }
      });
    }
    
    // Calculate total
    let total = 0;
    const items = [];
    
    for (const item of cartItems) {
      const subtotal = item.product.price * item.quantity;
      total += subtotal;
      items.push({
        product: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        subtotal: parseFloat(subtotal.toFixed(2))
      });
    }
    
    // Generate mock receipt
    const receipt = {
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      customer: {
        name,
        email
      },
      items,
      subtotal: parseFloat(total.toFixed(2)),
      tax: parseFloat((total * 0.1).toFixed(2)), // 10% tax
      total: parseFloat((total * 1.1).toFixed(2)),
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    
    // Clear cart after checkout
    const cartUserId = userId || 'default-user';
    const cart = await Cart.findOne({ userId: cartUserId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Checkout successful',
      data: receipt
    });
  } catch (error) {
    next(error);
  }
});

export default router;

