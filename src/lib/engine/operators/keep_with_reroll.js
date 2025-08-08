// Keep 与 Reroll 组合的操作：对带重掷的骰法应用 keep 规则
// 该实现与原 DiceCalculator.calculateKeepWithReroll 逻辑等价
import { generateSingleDiceRerollOutcomes } from '../math/generators.js';

export function calculateKeepWithRerollOperator(rerollExpr, keepCount, keepType) {
  const { dice, minValue, maxValue, maxRerolls } = rerollExpr;
  const { count, sides } = dice;
  const result = {};

  const singleDiceOutcomes = generateSingleDiceRerollOutcomes(
    sides, minValue, maxValue, maxRerolls
  );

  function generateRerollCombinations(diceCount, singleOutcomes) {
    if (diceCount === 1) {
      return Object.entries(singleOutcomes).map(([value, count]) => ({
        values: [parseInt(value)],
        probability: count
      }));
    }
    const smallerCombinations = generateRerollCombinations(diceCount - 1, singleOutcomes);
    const combinations = [];
    for (const [value, count] of Object.entries(singleOutcomes)) {
      for (const combo of smallerCombinations) {
        combinations.push({ values: [parseInt(value), ...combo.values], probability: count * combo.probability });
      }
    }
    return combinations;
  }

  const allCombinations = generateRerollCombinations(count, singleDiceOutcomes);

  for (const combination of allCombinations) {
    const sorted = [...combination.values].sort((a, b) => (keepType === 'highest' ? b - a : a - b));
    const kept = sorted.slice(0, keepCount);
    const sum = kept.reduce((acc, val) => acc + val, 0);
    result[sum] = (result[sum] || 0) + combination.probability;
  }

  // 将概率转换为整数计数（与原实现保持一致的缩放方式）
  const integerResult = {};
  for (const [value, probability] of Object.entries(result)) {
    const count = Math.round(probability);
    if (count > 0) integerResult[value] = count;
  }

  return integerResult;
}
