// 通用分布数学工具
// 注意：保持行为与原实现一致，不引入新逻辑。

// 卷积两个离散分布（整值键 -> 权重）
export function convolveDistributions(dist1, dist2) {
  const result = {};
  for (const [v1, c1] of Object.entries(dist1)) {
    const iv1 = parseInt(v1);
    for (const [v2, c2] of Object.entries(dist2)) {
      const sum = iv1 + parseInt(v2);
      result[sum] = (result[sum] || 0) + c1 * c2;
    }
  }
  return result;
}

// 计算平均值（输入可含 distribution 或 combined 字段的结果对象）
export function calculateAverage(result) {
  const dist = result.combined || result.distribution || result;
  let total = 0;
  let count = 0;
  for (const [v, c] of Object.entries(dist)) {
    total += parseInt(v) * c;
    count += c;
  }
  return count > 0 ? total / count : 0;
}

// 按给定 scaleFactor 归一为整数计数（保持总和约为 scaleFactor）
export function normalizeToScale(weights, scaleFactor) {
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  const normalized = {};
  if (totalWeight === 0) return normalized;
  for (const [value, weight] of Object.entries(weights)) {
    const normalizedCount = Math.round((weight * scaleFactor) / totalWeight);
    if (normalizedCount > 0) normalized[value] = normalizedCount;
  }
  return normalized;
}
