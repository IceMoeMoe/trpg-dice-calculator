// Keep 操作符：单骰与多表达式分布组合

// 计算单一骰子的Keep操作（与原逻辑一致）
export function calculateKeepSingleDice(expression, keepCount, keepType) {
  const { count, sides } = expression;
  const result = {};

  function generateCombinations(diceCount, diceSides) {
    if (diceCount === 1) {
      return Array.from({ length: diceSides }, (_, i) => [i + 1]);
    }
    const smaller = generateCombinations(diceCount - 1, diceSides);
    const combinations = [];
    for (let value = 1; value <= diceSides; value++) {
      for (const combo of smaller) combinations.push([value, ...combo]);
    }
    return combinations;
  }

  const all = generateCombinations(count, sides);
  for (const combination of all) {
    const sorted = [...combination].sort((a, b) => (keepType === 'highest' ? b - a : a - b));
    const kept = sorted.slice(0, keepCount);
    const sum = kept.reduce((acc, val) => acc + val, 0);
    result[sum] = (result[sum] || 0) + 1;
  }
  return result;
}

// 多个表达式的分布已给定时，执行keep组合
export function combineDistributionsKeep(distributions, keepCount, keepType) {
  const result = {};

  function generateMultipleExpressionCombinations(dists) {
    if (dists.length === 1) {
      const dist = dists[0];
      return Object.entries(dist)
        .filter(([value]) => !isNaN(parseInt(value)))
        .map(([value, count]) => ({ values: [parseInt(value)], count }));
    }
    const firstDist = dists[0];
    const rest = generateMultipleExpressionCombinations(dists.slice(1));
    const combinations = [];
    const filteredEntries = Object.entries(firstDist).filter(([value]) => !isNaN(parseInt(value)));
    for (const [value, count] of filteredEntries) {
      for (const combo of rest) {
        combinations.push({ values: [parseInt(value), ...combo.values], count: count * combo.count });
      }
    }
    return combinations;
  }

  const all = generateMultipleExpressionCombinations(distributions);
  for (const combination of all) {
    const sorted = [...combination.values].sort((a, b) => (keepType === 'highest' ? b - a : a - b));
    const kept = sorted.slice(0, keepCount);
    const sum = kept.reduce((acc, val) => acc + val, 0);
    result[sum] = (result[sum] || 0) + combination.count;
  }
  return result;
}
