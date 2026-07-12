const { Asset } = require('../models');
const { Op } = require('sequelize');

// Generates sequential tags like AF-0001, AF-0002, ...
async function generateAssetTag() {
  const last = await Asset.findOne({
    where: { assetTag: { [Op.like]: 'AF-%' } },
    order: [['id', 'DESC']],
  });

  let nextNumber = 1;
  if (last && last.assetTag) {
    const parts = last.assetTag.split('-');
    const num = parseInt(parts[1], 10);
    if (!isNaN(num)) nextNumber = num + 1;
  }

  return `AF-${String(nextNumber).padStart(4, '0')}`;
}

module.exports = generateAssetTag;
