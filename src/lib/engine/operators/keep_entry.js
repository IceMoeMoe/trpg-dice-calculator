// Keep 操作入口：将 DiceCalculator 中的 keep 包装逻辑迁出，复用现有算子
import { calculateKeepSingleDice as keepSingle, combineDistributionsKeep as keepCombine } from './keep.js';

export function calculateKeepOperator(calc, expressions, keepCount, keepType) {
  if (expressions.length === 1) {
    const expr = expressions[0];
    if (expr.type === 'dice') {
      return keepSingle(expr, keepCount, keepType);
    }
    return calculateKeepComplexOperator(calc, expr, keepCount, keepType);
  }
  return calculateKeepMultipleOperator(calc, expressions, keepCount, keepType);
}

export function calculateKeepComplexOperator(calc, expression, keepCount, keepType) {
  const baseResult = calc.evaluate(expression);
  if (typeof baseResult !== 'object' || baseResult.distribution) return baseResult;
  if (expression.type === 'reroll') {
    return calc.calculateKeepWithReroll(expression, keepCount, keepType);
  }
  return baseResult;
}

export function calculateKeepMultipleOperator(calc, expressions, keepCount, keepType) {
  const distributions = expressions.map(expr => calc.evaluate(expr));
  return keepCombine(distributions, keepCount, keepType);
}
