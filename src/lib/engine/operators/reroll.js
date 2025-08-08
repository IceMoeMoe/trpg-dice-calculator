// Reroll 操作符：组合单骰重骰分布为多骰分布
import { generateSingleDiceRerollOutcomes } from '../math/generators.js';

// diceNode: { count, sides }
export function calculateRerollOperator(diceNode, minValue, maxValue, maxRerolls) {
  const { count, sides } = diceNode;
  const singleDiceOutcomes = generateSingleDiceRerollOutcomes(sides, minValue, maxValue, maxRerolls);

  if (count === 1) return singleDiceOutcomes;

  function combineMultipleDice(diceCount, singleOutcomes, currentResult = { 0: 1 }) {
    if (diceCount === 0) return currentResult;
    const newResult = {};
    for (const [currentSum, currentCount] of Object.entries(currentResult)) {
      const sum = parseInt(currentSum);
      for (const [diceValue, diceCount] of Object.entries(singleOutcomes)) {
        const newSum = sum + parseInt(diceValue);
        const newCount = currentCount * diceCount;
        newResult[newSum] = (newResult[newSum] || 0) + newCount;
      }
    }
    return combineMultipleDice(diceCount - 1, singleOutcomes, newResult);
  }

  return combineMultipleDice(count, singleDiceOutcomes);
}
