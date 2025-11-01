// server/src/routes/categories.js
/**
 * Category routes
 * Handles CRUD operations for email categories
 */

const express = require('express');
const { Category } = require('../config/database');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

/**
 * Get all categories for user
 * GET /api/categories
 */
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.userId }).sort({
      createdAt: -1,
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Get single category
 * GET /api/categories/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/**
 * Create new category
 * POST /api/categories
 * Body: { name, description, color?, icon? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Check for duplicate category names
    const existing = await Category.findOne({
      userId: req.userId,
      name: { $regex: `^${name}$`, $options: 'i' },
    });

    if (existing) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    // Create category
    const category = new Category({
      userId: req.userId,
      name,
      description,
      color: color || '#3b82f6',
      icon: icon || 'folder',
    });

    await category.save();

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * Update category
 * PUT /api/categories/:id
 * Body: { name?, description?, color?, icon? }
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    // Find category
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check for duplicate name if changing name
    if (name && name !== category.name) {
      const existing = await Category.findOne({
        userId: req.userId,
        name: { $regex: `^${name}$`, $options: 'i' },
        _id: { $ne: req.params.id },
      });

      if (existing) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }
    }

    // Update fields
    if (name) category.name = name;
    if (description) category.description = description;
    if (color) category.color = color;
    if (icon) category.icon = icon;

    category.updatedAt = new Date();
    await category.save();

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * Delete category
 * DELETE /api/categories/:id
 * Note: Emails in this category are moved to uncategorized
 */
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Delete category
    await Category.deleteOne({ _id: req.params.id });

    // Move emails in this category to uncategorized
    const { Email } = require('../config/database');
    await Email.updateMany(
      { categoryId: req.params.id },
      { categoryId: null }
    );

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;