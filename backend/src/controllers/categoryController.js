const { AssetCategory } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLogger');

// GET /api/categories
const listCategories = asyncHandler(async (req, res) => {
  const categories = await AssetCategory.findAll({ order: [['name', 'ASC']] });
  const parsed = categories.map((c) => ({
    ...c.toJSON(),
    customFields: safeParse(c.customFields),
  }));
  res.json({ success: true, categories: parsed });
});

// POST /api/categories
const createCategory = asyncHandler(async (req, res) => {
  const { name, customFields, status } = req.body;
  if (!name) throw new ApiError(400, 'name is required.');

  const existing = await AssetCategory.findOne({ where: { name } });
  if (existing) throw new ApiError(409, 'A category with this name already exists.');

  const category = await AssetCategory.create({
    name,
    customFields: JSON.stringify(customFields || []),
    status: status || 'Active',
  });

  await logActivity(req.user.id, 'CATEGORY_CREATED', 'AssetCategory', category.id, { name });
  res.status(201).json({ success: true, category: { ...category.toJSON(), customFields: customFields || [] } });
});

// PUT /api/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const category = await AssetCategory.findByPk(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found.');

  const { name, customFields, status } = req.body;
  if (name !== undefined) category.name = name;
  if (customFields !== undefined) category.customFields = JSON.stringify(customFields);
  if (status !== undefined) category.status = status;

  await category.save();
  await logActivity(req.user.id, 'CATEGORY_UPDATED', 'AssetCategory', category.id, req.body);
  res.json({ success: true, category: { ...category.toJSON(), customFields: safeParse(category.customFields) } });
});

function safeParse(str) {
  try { return JSON.parse(str); } catch (e) { return []; }
}

module.exports = { listCategories, createCategory, updateCategory };
