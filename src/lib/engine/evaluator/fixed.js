// 固定骰值评估相关的辅助函数（从 DiceCalculator 中抽离）
import { calculateKeepSingleDice as keepSingle, combineDistributionsKeep as keepCombine } from '../operators/keep.js';

// 在固定骰子值的情况下评估表达式
export function evaluateWithFixedDice(calc, node) {
  switch (node.type) {
    case 'number':
      return { [node.value]: 1 };

    case 'dice':
      if (node.id !== undefined && calc.currentDiceValues && calc.currentDiceValues.has(node.id)) {
        const value = calc.currentDiceValues.get(node.id);
        return { [value]: 1 };
      } else {
        const diceResult = calc.calculateBasicDice(node.count, node.sides);
        if (node.isCriticalDice) {
          diceResult.isCriticalDice = true;
        }
        return diceResult;
      }

    case 'dice_ref':
      if (calc.currentDiceValues && calc.currentDiceValues.has(node.id)) {
        const value = calc.currentDiceValues.get(node.id);
        return { [value]: 1 };
      } else {
        throw new Error(`引用的骰子 d_${node.id} 没有固定值`);
      }

    case 'binary_op':
      return calculateBinaryOpWithFixedDice(calc, node.left, node.right, node.operator);

    case 'comparison':
      return calculateComparisonWithFixedDice(calc, node.left, node.right, node.operator);

    case 'conditional':
      return calculateConditionalWithFixedDice(calc, node.condition, node.trueValue, node.falseValue);

    case 'keep': {
      const expressions = node.expressions || [node.expression];
      return calculateKeepWithFixedDice(calc, expressions, node.count, node.keepType);
    }

    case 'reroll':
      return calc.calculateReroll(node.dice, node.minValue, node.maxValue, node.maxRerolls);

    case 'exploding':
      return calc.calculateExploding(node);

    case 'exploding_sum':
      return calc.calculateExplodingSum(node);

    case 'critical_double':
      return calculateCriticalDoubleWithFixedDice(calc, node.expression);

    case 'critical_switch':
      return calculateCriticalSwitchWithFixedDice(calc, node.normalExpression, node.criticalExpression);

    case 'critical_only':
      return calculateCriticalOnlyWithFixedDice(calc, node.expression);

    default:
      throw new Error(`未知节点类型: ${node.type}`);
  }
}

// 在固定骰子值下计算二元运算
export function calculateBinaryOpWithFixedDice(calc, left, right, operator) {
  const leftResult = evaluateWithFixedDice(calc, left);
  const rightResult = evaluateWithFixedDice(calc, right);
  return calc.calculateNormalBinaryOp(leftResult, rightResult, operator);
}

// 在固定骰子值下计算比较
export function calculateComparisonWithFixedDice(calc, left, right, operator) {
  const leftResult = evaluateWithFixedDice(calc, left);
  const rightResult = evaluateWithFixedDice(calc, right);

  const leftValue = parseFloat(Object.keys(leftResult)[0]);
  const rightValue = parseFloat(Object.keys(rightResult)[0]);

  let success = false;
  switch (operator) {
    case '>':
      success = leftValue > rightValue; break;
    case '<':
      success = leftValue < rightValue; break;
    case '=':
    case '==':
      success = leftValue === rightValue; break;
    case '>=':
      success = leftValue >= rightValue; break;
    case '<=':
      success = leftValue <= rightValue; break;
  }

  return {
    type: 'probability',
    successProbability: success ? 1 : 0,
    failureProbability: success ? 0 : 1,
    successCount: success ? 1 : 0,
    totalCount: 1,
    distribution: {
      1: success ? 1 : 0,
      0: success ? 0 : 1
    }
  };
}

// 在固定骰子值下计算条件表达式
export function calculateConditionalWithFixedDice(calc, conditionNode, trueValueNode, falseValueNode) {
  const conditionResult = evaluateWithFixedDice(calc, conditionNode);

  if (conditionResult.type !== 'probability') {
    throw new Error('条件表达式的条件部分必须是比较操作');
  }

  if (conditionResult.successProbability > 0) {
    return evaluateWithFixedDice(calc, trueValueNode);
  } else {
    return evaluateWithFixedDice(calc, falseValueNode);
  }
}

// 在固定骰子值下计算Keep操作
export function calculateKeepWithFixedDice(calc, expressions, keepCount, keepType) {
  if (expressions.length === 1) {
    const expr = expressions[0];
    if (expr.type === 'dice') {
  // 直接使用 keep 算子的单骰实现，避免依赖 calc 上不存在的方法
  return keepSingle(expr, keepCount, keepType);
    }
    return calculateKeepComplexWithFixedDice(calc, expr, keepCount, keepType);
  }
  return calculateKeepMultipleWithFixedDice(calc, expressions, keepCount, keepType);
}

// 计算复合表达式的Keep操作（支持重骰等）- 固定骰子值版本
export function calculateKeepComplexWithFixedDice(calc, expression, keepCount, keepType) {
  const expressionResult = evaluateWithFixedDice(calc, expression);
  const result = {};
  for (const [value, count] of Object.entries(expressionResult)) {
    const val = parseInt(value);
    if (keepCount >= 1) {
      result[val] = (result[val] || 0) + count;
    }
  }
  return result;
}

// 计算多个不同表达式的Keep操作 - 固定骰子值版本
export function calculateKeepMultipleWithFixedDice(calc, expressions, keepCount, keepType) {
  const distributions = expressions.map(expr => evaluateWithFixedDice(calc, expr));
  return keepCombine(distributions, keepCount, keepType);
}

// 在固定骰子值下计算暴击翻倍
export function calculateCriticalDoubleWithFixedDice(calc, expression) {
  const result = evaluateWithFixedDice(calc, expression);
  if (calc.isCalculatingCritical) {
    const doubledResult = {};
    for (const [value, count] of Object.entries(result)) {
      const val = parseFloat(value);
      doubledResult[val * 2] = count;
    }
    return doubledResult;
  } else {
    return result;
  }
}

// 在固定骰子值下计算暴击切换
export function calculateCriticalSwitchWithFixedDice(calc, normalExpression, criticalExpression) {
  if (calc.isCalculatingCritical) {
    return evaluateWithFixedDice(calc, criticalExpression);
  } else {
    return evaluateWithFixedDice(calc, normalExpression);
  }
}

// 在固定骰子值下计算暴击专用
export function calculateCriticalOnlyWithFixedDice(calc, expression) {
  if (calc.isCalculatingCritical) {
    return evaluateWithFixedDice(calc, expression);
  } else {
    return { 0: 1 };
  }
}
