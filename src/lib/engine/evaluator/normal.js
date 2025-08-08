// 普通评估辅助：从 DiceCalculator 抽离

export function extractDistribution(calc, result) {
  if (result.combined) {
    return result.combined;
  } else if (result.distribution) {
    return result.distribution;
  } else if (typeof result === 'object' && !Array.isArray(result)) {
    const keys = Object.keys(result);
    if (keys.length > 0 && keys.every(key => !isNaN(parseFloat(key)) || key === 'isCriticalDice')) {
      const filteredResult = {};
      for (const [key, value] of Object.entries(result)) {
        if (!isNaN(parseFloat(key))) filteredResult[key] = value;
      }
      return filteredResult;
    }
  }
  return result;
}

export function calculateComparison(calc, left, right, operator) {
  const leftResult = calc.evaluate(left);
  const rightResult = calc.evaluate(right);

  const leftDistribution = extractDistribution(calc, leftResult);
  const rightDistribution = extractDistribution(calc, rightResult);

  let successCount = 0;
  let totalCount = 0;

  if (Object.keys(rightDistribution).length === 1 && Object.keys(rightDistribution)[0] !== undefined) {
    const rightValue = parseInt(Object.keys(rightDistribution)[0]);
    for (const [leftValue, leftCount] of Object.entries(leftDistribution)) {
      const leftVal = parseInt(leftValue);
      totalCount += leftCount;
      let success = false;
      switch (operator) {
        case '>': success = leftVal > rightValue; break;
        case '<': success = leftVal < rightValue; break;
        case '=':
        case '==': success = leftVal === rightValue; break;
        case '>=': success = leftVal >= rightValue; break;
        case '<=': success = leftVal <= rightValue; break;
      }
      if (success) successCount += leftCount;
    }
  } else {
    for (const [leftValue, leftCount] of Object.entries(leftDistribution)) {
      for (const [rightValue, rightCount] of Object.entries(rightDistribution)) {
        const leftVal = parseInt(leftValue);
        const rightVal = parseInt(rightValue);
        const combinationCount = leftCount * rightCount;
        totalCount += combinationCount;
        let success = false;
        switch (operator) {
          case '>': success = leftVal > rightVal; break;
          case '<': success = leftVal < rightVal; break;
          case '=':
          case '==': success = leftVal === rightVal; break;
          case '>=': success = leftVal >= rightVal; break;
          case '<=': success = leftVal <= rightVal; break;
        }
        if (success) successCount += combinationCount;
      }
    }
  }

  const successProbability = totalCount > 0 ? successCount / totalCount : 0;
  const failureProbability = totalCount > 0 ? (totalCount - successCount) / totalCount : 1;

  return {
    type: 'probability',
    successProbability,
    failureProbability,
    successCount,
    totalCount,
    distribution: {
      1: successCount,
      0: totalCount - successCount
    }
  };
}

export function calculateBinaryOp(calc, left, right, operator) {
  const leftResult = calc.evaluate(left);
  const rightResult = calc.evaluate(right);

  const leftIsProbability = leftResult.type === 'probability';
  const rightIsProbability = rightResult.type === 'probability';

  if (leftIsProbability && !rightIsProbability) {
    return calculateProbabilityOperation(calc, leftResult, rightResult, operator, 'left');
  } else if (!leftIsProbability && rightIsProbability) {
    return calculateProbabilityOperation(calc, rightResult, leftResult, operator, 'right');
  } else if (leftIsProbability && rightIsProbability) {
    if (operator === '*') {
      const newSuccessProbability = leftResult.successProbability * rightResult.successProbability;
      const totalOutcomes = leftResult.totalCount * rightResult.totalCount;
      const successOutcomes = Math.round(newSuccessProbability * totalOutcomes);
      return {
        type: 'probability',
        successProbability: newSuccessProbability,
        failureProbability: 1 - newSuccessProbability,
        successCount: successOutcomes,
        totalCount: totalOutcomes,
        distribution: {
          1: successOutcomes,
          0: totalOutcomes - successOutcomes
        }
      };
    }
    return calculateNormalBinaryOp(calc, leftResult.distribution, rightResult.distribution, operator);
  } else {
    const leftDist = extractDistribution(calc, leftResult);
    const rightDist = extractDistribution(calc, rightResult);
    return calculateNormalBinaryOp(calc, leftDist, rightDist, operator);
  }
}

export function calculateProbabilityOperation(calc, probabilityResult, valueResult, operator, probabilityPosition) {
  if (operator !== '*') {
    const valueDist = extractDistribution(calc, valueResult);
    return calculateNormalBinaryOp(calc, probabilityResult.distribution, valueDist, operator);
  }
  const valueDist = extractDistribution(calc, valueResult);
  const result = {};
  for (const [value, count] of Object.entries(valueDist)) {
    const val = parseInt(value);
    const expectedValue = val * probabilityResult.successProbability;
    const scaledCount = count;
    const roundedExpectedValue = Math.round(expectedValue * 100) / 100;
    result[roundedExpectedValue] = (result[roundedExpectedValue] || 0) + scaledCount;
  }
  return result;
}

export function calculateNormalBinaryOp(calc, leftResult, rightResult, operator) {
  const result = {};
  for (const [leftValue, leftCount] of Object.entries(leftResult)) {
    for (const [rightValue, rightCount] of Object.entries(rightResult)) {
      const leftVal = parseFloat(leftValue);
      const rightVal = parseFloat(rightValue);
      const combinationCount = leftCount * rightCount;
      let newValue;
      switch (operator) {
        case '+': newValue = leftVal + rightVal; break;
        case '-': newValue = leftVal - rightVal; break;
        case '*': newValue = leftVal * rightVal; break;
        case '/': newValue = rightVal !== 0 ? leftVal / rightVal : 0; break;
        default: throw new Error(`未知运算符: ${operator}`);
      }
      if (Number.isFinite(newValue)) {
        const rounded = Math.round(newValue * 100) / 100;
        result[rounded] = (result[rounded] || 0) + combinationCount;
      }
    }
  }
  return result;
}
