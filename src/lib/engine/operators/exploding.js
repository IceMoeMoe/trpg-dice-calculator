// Exploding 操作符：成功计数型与求和型
import { generateSingleDiceExplodingOutcomes, generateSingleDiceExplodingSumOutcomes } from '../math/generators.js';

// 成功计数型
export function calculateExplodingOperator(diceNode, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions) {
  const { count, sides } = diceNode;
  const singleOutcomes = generateSingleDiceExplodingOutcomes(
    sides, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions
  );
  if (count === 1) return singleOutcomes;

  function combine(diceCount, single, acc = { 0: 1 }) {
    if (diceCount === 0) return acc;
    const next = {};
    for (const [cur, curCount] of Object.entries(acc)) {
      const curV = parseInt(cur);
      for (const [s, c] of Object.entries(single)) {
        const v = curV + parseInt(s);
        const n = curCount * c;
        next[v] = (next[v] || 0) + n;
      }
    }
    return combine(diceCount - 1, single, next);
  }

  const res = combine(count, singleOutcomes);
  if (diceNode.isCriticalDice) res.isCriticalDice = true;
  return res;
}

// 求和型
export function calculateExplodingSumOperator(diceNode, minExplode, maxExplode, maxExplosions) {
  const { count, sides } = diceNode;
  const singleOutcomes = generateSingleDiceExplodingSumOutcomes(
    sides, minExplode, maxExplode, maxExplosions
  );
  if (count === 1) return singleOutcomes;

  function combine(diceCount, single, acc = { 0: 1 }) {
    if (diceCount === 0) return acc;
    const next = {};
    for (const [cur, curCount] of Object.entries(acc)) {
      const curV = parseInt(cur);
      for (const [s, c] of Object.entries(single)) {
        const v = curV + parseInt(s);
        const n = curCount * c;
        next[v] = (next[v] || 0) + n;
      }
    }
    return combine(diceCount - 1, single, next);
  }

  const res = combine(count, singleOutcomes);
  if (diceNode.isCriticalDice) res.isCriticalDice = true;
  return res;
}
