// 暴击评估：封装普通/条件/标准合并等逻辑，复用 calc 的方法和其它模块
import { getCriticalDiceSidesFromAST, convertCriticalRateToSides, getDiceInfoFromCondition, getRawDiceDistribution, canProduceResult, findCriticalDiceInNode } from '../operators/logic/critical_utils.js';

export function calculateActualCriticalProbability(calc, ast, originalCriticalRate) {
  let targetAst = ast;
  if (ast.type === 'conditional') {
    targetAst = ast.condition;
  } else if (calc.containsConditionalExpression(ast)) {
    const conditionInfo = calc.findCriticalConditionInAST(ast);
    if (conditionInfo && conditionInfo.conditionNode) targetAst = conditionInfo.conditionNode;
  }
  if (!calc.containsCriticalDice(targetAst)) {
    return { criticalProbability: 0, diceSides: 20, criticalSides: 0 };
  }
  calc.isCalculatingCritical = false;
  const normalResult = calc.evaluate(targetAst);
  const normalDist = calc.extractDistribution(normalResult);
  const totalOutcomes = Object.values(normalDist).reduce((s, c) => s + c, 0);
  const diceSides = getCriticalDiceSidesFromAST(calc, targetAst);
  if (totalOutcomes === 0) {
    const criticalSides = Math.max(1, Math.round(diceSides * originalCriticalRate / 100));
    const actualCriticalProbability = criticalSides / diceSides;
    return { criticalProbability: actualCriticalProbability, diceSides, criticalSides };
  }
  const criticalSides = Math.max(1, Math.round(diceSides * originalCriticalRate / 100));
  const actualCriticalProbability = criticalSides / diceSides;
  return { criticalProbability: actualCriticalProbability, diceSides, criticalSides };
}

export function calculateWithCritical(calc, ast, originalCriticalRate, diceSides, criticalSides) {
  const { criticalProbability, diceSides: actualDiceSides, criticalSides: actualCriticalSides } =
    calculateActualCriticalProbability(calc, ast, originalCriticalRate);
  const normalProbability = 1 - criticalProbability;
  calc.isCalculatingCritical = false; const normalResult = calc.evaluate(ast);
  calc.isCalculatingCritical = true; const criticalResult = calc.evaluate(ast);
  const containsConditional = calc.containsConditionalExpression(ast);
  if (ast.type === 'conditional' || ast.type === 'comparison') {
    if (ast.type === 'conditional') {
      const baseConditionResult = calc.evaluate(ast.condition);
      const conditionalCriticalResult = calc.calculateConditionalWithCriticalOverlap(
        ast.condition, ast.trueValue, ast.falseValue, baseConditionResult
      );
      const average = calc.calculateAverage(conditionalCriticalResult);
      const totalOutcomes = Object.values(conditionalCriticalResult.combined).reduce((s, c) => s + c, 0);
      return {
        distribution: conditionalCriticalResult.combined,
        average,
        totalOutcomes,
        success: true,
        isConditionalCritical: true,
        normalHitValues: conditionalCriticalResult.normalHitValues,
        criticalHitValues: conditionalCriticalResult.criticalHitValues,
        missValues: conditionalCriticalResult.missValues,
        probabilities: conditionalCriticalResult.probabilities,
        diceSides: actualDiceSides,
        criticalSides: actualCriticalSides,
        originalCriticalRate: originalCriticalRate,
        actualCriticalProbability: conditionalCriticalResult.actualCriticalProbability * 100,
        criticalProbability: conditionalCriticalResult.actualCriticalProbability * 100,
        nestedConditions: conditionalCriticalResult.nestedConditions
      };
    } else if (ast.type === 'comparison') {
      const baseConditionResult = calc.evaluate(ast);
      const conditionalCriticalResult = calc.calculateConditionalWithCriticalOverlap(
        ast, { type: 'number', value: 1 }, { type: 'number', value: 0 }, baseConditionResult
      );
      const average = calc.calculateAverage(conditionalCriticalResult);
      const totalOutcomes = Object.values(conditionalCriticalResult.combined).reduce((s, c) => s + c, 0);
      return {
        distribution: conditionalCriticalResult.combined,
        average,
        totalOutcomes,
        success: true,
        isConditionalCritical: true,
        normalHitValues: conditionalCriticalResult.normalHitValues,
        criticalHitValues: conditionalCriticalResult.criticalHitValues,
        missValues: conditionalCriticalResult.missValues,
        probabilities: conditionalCriticalResult.probabilities,
        diceSides: actualDiceSides,
        criticalSides: actualCriticalSides,
        originalCriticalRate: originalCriticalRate,
        actualCriticalProbability: conditionalCriticalResult.actualCriticalProbability * 100,
        criticalProbability: conditionalCriticalResult.actualCriticalProbability * 100,
        nestedConditions: conditionalCriticalResult.nestedConditions
      };
    }
  }
  if (containsConditional) {
    return calculateComplexConditionalCritical(calc, ast, normalProbability, criticalProbability, actualDiceSides, actualCriticalSides, originalCriticalRate);
  }
  if (normalResult.type === 'conditional' || criticalResult.type === 'conditional') {
    return handleConditionalCritical(calc, normalResult, criticalResult, normalProbability, criticalProbability, actualDiceSides, actualCriticalSides, originalCriticalRate);
  }
  const combinedDistribution = {};
  const normalDist = calc.extractDistribution(normalResult);
  const criticalDist = calc.extractDistribution(criticalResult);
  const normalTotal = Object.values(normalDist).reduce((s, c) => s + c, 0);
  const criticalTotal = Object.values(criticalDist).reduce((s, c) => s + c, 0);
  for (const [value, count] of Object.entries(normalDist)) {
    const val = parseFloat(value); const relativeProbability = count / normalTotal; const weightedCount = relativeProbability * normalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
  }
  for (const [value, count] of Object.entries(criticalDist)) {
    const val = parseFloat(value); const relativeProbability = count / criticalTotal; const weightedCount = relativeProbability * criticalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
  }
  const totalWeight = Object.values(combinedDistribution).reduce((s, w) => s + w, 0);
  const normalizedResult = {}; const originalTotalCount = normalTotal; const scaleFactor = originalTotalCount;
  for (const [value, weight] of Object.entries(combinedDistribution)) {
    const normalizedCount = Math.round(weight * scaleFactor / totalWeight);
    if (normalizedCount > 0) normalizedResult[value] = normalizedCount;
  }
  const average = calc.calculateAverage({ distribution: normalizedResult });
  const totalOutcomes = Object.values(normalizedResult).reduce((s, c) => s + c, 0);
  return {
    distribution: normalizedResult,
    average,
    totalOutcomes,
    success: true,
    isCritical: true,
    originalCriticalRate,
    actualCriticalProbability: criticalProbability * 100,
    diceSides: actualDiceSides,
    criticalSides: actualCriticalSides,
    normalDistribution: normalDist,
    criticalDistribution: criticalDist,
    normalProbability,
    criticalProbability
  };
}

export function calculateComplexConditionalCritical(calc, ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
  const conditionInfo = calc.findCriticalConditionInAST(ast);
  if (!conditionInfo) {
    return calculateStandardCritical(calc, ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate);
  }
  const { conditionNode, trueValueNode, falseValueNode } = conditionInfo;
  const criticalRate = originalCriticalRate; const diceInfo = getDiceInfoFromCondition(calc, conditionNode);
  const actualDiceSides = diceInfo.sides; const diceCount = diceInfo.count;
  let actualCriticalProbability = 0; let skipGeneralCalculation = false;
  try {
    let diceDistribution = {};
    if (conditionNode.type === 'keep' && conditionNode.expressions && conditionNode.expressions[0]) {
      const diceExpression = conditionNode.expressions[0];
      if (diceExpression.type === 'dice') {
        const singleDiceCriticalRate = criticalRate / 100; const count = diceExpression.count || 1;
        actualCriticalProbability = 1 - Math.pow(1 - singleDiceCriticalRate, count);
        skipGeneralCalculation = true;
      } else {
        const diceResult = calc.evaluate(diceExpression); diceDistribution = calc.extractDistribution(diceResult);
      }
    } else if (conditionNode.type === 'comparison' && conditionNode.left) {
      if (calc.containsCriticalDice(conditionNode.left)) {
        if (conditionNode.left.type === 'keep' && conditionNode.left.expressions && conditionNode.left.expressions[0]) {
          const diceExpression = conditionNode.left.expressions[0];
          if (diceExpression.type === 'dice') {
            const singleDiceCriticalRate = criticalRate / 100; const count = diceExpression.count || 1;
            actualCriticalProbability = 1 - Math.pow(1 - singleDiceCriticalRate, count);
            skipGeneralCalculation = true;
          }
        }
        if (!skipGeneralCalculation) {
          const rawDice = findCriticalDiceInNode(calc, conditionNode.left);
          if (rawDice) {
            const diceExpression = { type: 'dice', sides: rawDice.sides, count: rawDice.count, isCriticalDice: true };
            const diceResult = calc.evaluate(diceExpression); diceDistribution = calc.extractDistribution(diceResult);
          }
        }
      } else {
        const leftResult = calc.evaluate(conditionNode.left); diceDistribution = calc.extractDistribution(leftResult);
      }
    } else {
      const diceExpression = { type: 'dice', sides: actualDiceSides, count: diceCount };
      const diceResult = calc.evaluate(diceExpression); diceDistribution = calc.extractDistribution(diceResult);
    }
    if (!skipGeneralCalculation) {
      const diceTotalOutcomes = Object.values(diceDistribution).reduce((s, c) => s + c, 0);
      if (diceTotalOutcomes > 0) {
        const criticalSidesCount = Math.max(1, Math.round(actualDiceSides * criticalRate / 100));
        actualCriticalProbability = criticalSidesCount / actualDiceSides;
      }
    }
  } catch (e) {
    if (!skipGeneralCalculation) {
      const criticalSidesCount = Math.max(1, Math.round(actualDiceSides * criticalRate / 100));
      actualCriticalProbability = criticalSidesCount / actualDiceSides;
    }
  }
  const baseConditionResult = evaluateConditionWithCritical(calc, conditionNode, actualCriticalProbability);
  calc.isCalculatingCritical = false; const normalSuccessResult = calc.evaluate(trueValueNode); const failureResult = calc.evaluate(falseValueNode);
  calc.isCalculatingCritical = true; const criticalSuccessResult = calc.evaluate(trueValueNode);
  const normalSuccessFullDist = calc.evaluateExpressionWithSubstitution(ast, conditionInfo, normalSuccessResult);
  const criticalSuccessFullDist = calc.evaluateExpressionWithSubstitution(ast, conditionInfo, criticalSuccessResult);
  const failureFullDist = calc.evaluateExpressionWithSubstitution(ast, conditionInfo, failureResult);
  const normalSuccessDist = calc.extractDistribution(normalSuccessFullDist);
  const criticalSuccessDist = calc.extractDistribution(criticalSuccessFullDist);
  const failureDist = calc.extractDistribution(failureFullDist);
  const conditionNormalHitValues = calc.extractDistribution(normalSuccessResult);
  const conditionCriticalHitValues = calc.extractDistribution(criticalSuccessResult);
  const conditionMissValues = calc.extractDistribution(failureResult);
  const scaleFactor = 1000; const result = {};
  const normalSuccessCount = Math.round(scaleFactor * baseConditionResult.normalSuccessProbability);
  if (normalSuccessCount > 0) {
    const normalSuccessTotal = Object.values(normalSuccessDist).reduce((s, c) => s + c, 0);
    for (const [value, count] of Object.entries(normalSuccessDist)) {
      const val = parseFloat(value); const relativeProbability = normalSuccessTotal > 0 ? count / normalSuccessTotal : 0;
      const weightedCount = Math.round(relativeProbability * normalSuccessCount);
      if (weightedCount > 0) result[val] = (result[val] || 0) + weightedCount;
    }
  }
  const criticalSuccessCount = Math.round(scaleFactor * baseConditionResult.criticalSuccessProbability);
  if (criticalSuccessCount > 0) {
    const criticalSuccessTotal = Object.values(criticalSuccessDist).reduce((s, c) => s + c, 0);
    for (const [value, count] of Object.entries(criticalSuccessDist)) {
      const val = parseFloat(value); const relativeProbability = criticalSuccessTotal > 0 ? count / criticalSuccessTotal : 0;
      const weightedCount = Math.round(relativeProbability * criticalSuccessCount);
      if (weightedCount > 0) result[val] = (result[val] || 0) + weightedCount;
    }
  }
  const failureCount = Math.round(scaleFactor * baseConditionResult.failureProbability);
  if (failureCount > 0) {
    const failureTotal = Object.values(failureDist).reduce((s, c) => s + c, 0);
    for (const [value, count] of Object.entries(failureDist)) {
      const val = parseFloat(value); const relativeProbability = failureTotal > 0 ? count / failureTotal : 0;
      const weightedCount = Math.round(relativeProbability * failureCount);
      if (weightedCount > 0) result[val] = (result[val] || 0) + weightedCount;
    }
  }
  const average = calc.calculateAverage({ distribution: result });
  const totalOutcomes = Object.values(result).reduce((s, c) => s + c, 0);
  const totalSuccessProbability = baseConditionResult.normalSuccessProbability + baseConditionResult.criticalSuccessProbability;
  const finalActualCriticalProbability = totalSuccessProbability > 0 ? actualCriticalProbability : 0;
  return {
    distribution: result,
    average,
    totalOutcomes,
    success: true,
    isConditionalCritical: true,
    normalHitValues: conditionNormalHitValues,
    criticalHitValues: conditionCriticalHitValues,
    missValues: conditionMissValues,
    probabilities: {
      normalHit: baseConditionResult.normalSuccessProbability,
      criticalHit: baseConditionResult.criticalSuccessProbability,
      miss: baseConditionResult.failureProbability
    },
    diceSides: actualDiceSides,
    criticalSides: Math.max(1, Math.round(actualDiceSides * (originalCriticalRate) / 100)),
    originalCriticalRate,
    actualCriticalProbability: finalActualCriticalProbability * 100,
    criticalProbability: finalActualCriticalProbability * 100,
    nestedConditions: []
  };
}

export function calculateStandardCritical(calc, ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
  calc.isCalculatingCritical = false; const normalResult = calc.evaluate(ast);
  calc.isCalculatingCritical = true; const criticalResult = calc.evaluate(ast);
  const combinedDistribution = {}; const normalDist = calc.extractDistribution(normalResult); const criticalDist = calc.extractDistribution(criticalResult);
  const normalTotal = Object.values(normalDist).reduce((s, c) => s + c, 0); const criticalTotal = Object.values(criticalDist).reduce((s, c) => s + c, 0);
  for (const [value, count] of Object.entries(normalDist)) {
    const val = parseFloat(value); const relativeProbability = count / normalTotal; const weightedCount = relativeProbability * normalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
  }
  for (const [value, count] of Object.entries(criticalDist)) {
    const val = parseFloat(value); const relativeProbability = count / criticalTotal; const weightedCount = relativeProbability * criticalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
  }
  const totalWeight = Object.values(combinedDistribution).reduce((s, w) => s + w, 0); const normalizedResult = {}; const scaleFactor = normalTotal;
  for (const [value, weight] of Object.entries(combinedDistribution)) {
    const normalizedCount = Math.round(weight * scaleFactor / totalWeight); if (normalizedCount > 0) normalizedResult[value] = normalizedCount;
  }
  const average = calc.calculateAverage({ distribution: normalizedResult }); const totalOutcomes = Object.values(normalizedResult).reduce((s, c) => s + c, 0);
  return {
    distribution: normalizedResult,
    average,
    totalOutcomes,
    success: true,
    isCritical: true,
    originalCriticalRate,
    actualCriticalProbability: criticalProbability * 100,
    diceSides,
    criticalSides,
    normalDistribution: normalDist,
    criticalDistribution: criticalDist,
    normalProbability,
    criticalProbability
  };
}

export function evaluateConditionWithCritical(calc, conditionNode, actualCriticalProbability) {
  if (conditionNode.type === 'comparison') {
    const leftResult = calc.evaluate(conditionNode.left);
    const rightResult = calc.evaluate(conditionNode.right);
    const leftDistribution = calc.extractDistribution(leftResult);
    const rightDistribution = calc.extractDistribution(rightResult);
    const diceInfo = getDiceInfoFromCondition(calc, conditionNode); const diceSides = diceInfo.sides;
    const leftHasCriticalDice = calc.containsCriticalDice(conditionNode.left);
    const rightHasCriticalDice = calc.containsCriticalDice(conditionNode.right);
    let rawDiceDistribution = {};
    if (leftHasCriticalDice) { rawDiceDistribution = getRawDiceDistribution(calc, conditionNode.left); }
    else if (rightHasCriticalDice) { rawDiceDistribution = getRawDiceDistribution(calc, conditionNode.right); }
    let totalSuccessCount = 0; let totalCriticalSuccessCount = 0; let totalFailureCount = 0;
    const criticalSides = Math.max(1, Math.round(diceSides * actualCriticalProbability));
    const criticalThreshold = diceSides - criticalSides + 1;
    if (Object.keys(rightDistribution).length === 1 && Object.keys(rightDistribution)[0] !== undefined) {
      const rightValue = parseInt(Object.keys(rightDistribution)[0]);
      for (const [leftValue, leftCount] of Object.entries(leftDistribution)) {
        const leftVal = parseInt(leftValue);
        let success = false;
        switch (conditionNode.operator) {
          case '>': success = leftVal > rightValue; break;
          case '<': success = leftVal < rightValue; break;
          case '=':
          case '==': success = leftVal === rightValue; break;
          case '>=': success = leftVal >= rightValue; break;
          case '<=': success = leftVal <= rightValue; break;
        }
        if (success) {
          let isCritical = false;
          if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
            for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
              const rawVal = parseInt(rawDiceValue);
              if (rawVal >= criticalThreshold) {
                if (canProduceResult(calc, conditionNode.left, rawVal, leftVal)) { isCritical = true; break; }
              }
            }
          } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
            for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
              const rawVal = parseInt(rawDiceValue);
              if (rawVal >= criticalThreshold) {
                if (canProduceResult(calc, conditionNode.right, rawVal, rightValue)) { isCritical = true; break; }
              }
            }
          }
          if (isCritical) totalCriticalSuccessCount += leftCount; else totalSuccessCount += leftCount;
        } else {
          totalFailureCount += leftCount;
        }
      }
    } else if (Object.keys(leftDistribution).length === 1 && Object.keys(leftDistribution)[0] !== undefined) {
      const leftValue = parseInt(Object.keys(leftDistribution)[0]);
      for (const [rightValue, rightCount] of Object.entries(rightDistribution)) {
        const rightVal = parseInt(rightValue);
        let success = false;
        switch (conditionNode.operator) {
          case '>': success = leftValue > rightVal; break;
          case '<': success = leftValue < rightVal; break;
          case '=':
          case '==': success = leftValue === rightVal; break;
          case '>=': success = leftValue >= rightVal; break;
          case '<=': success = leftValue <= rightVal; break;
        }
        if (success) {
          let isCritical = false;
          if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
            for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
              const rawVal = parseInt(rawDiceValue);
              if (rawVal >= criticalThreshold) {
                if (canProduceResult(calc, conditionNode.left, rawVal, leftValue)) { isCritical = true; break; }
              }
            }
          } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
            for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
              const rawVal = parseInt(rawDiceValue);
              if (rawVal >= criticalThreshold) {
                if (canProduceResult(calc, conditionNode.right, rawVal, rightVal)) { isCritical = true; break; }
              }
            }
          }
          if (isCritical) totalCriticalSuccessCount += rightCount; else totalSuccessCount += rightCount;
        } else {
          totalFailureCount += rightCount;
        }
      }
    } else {
      for (const [leftValue, leftCount] of Object.entries(leftDistribution)) {
        for (const [rightValue, rightCount] of Object.entries(rightDistribution)) {
          const leftVal = parseInt(leftValue); const rightVal = parseInt(rightValue); const combinationCount = leftCount * rightCount;
          let success = false;
          switch (conditionNode.operator) {
            case '>': success = leftVal > rightVal; break;
            case '<': success = leftVal < rightVal; break;
            case '=':
            case '==': success = leftVal === rightVal; break;
            case '>=': success = leftVal >= rightVal; break;
            case '<=': success = leftVal <= rightVal; break;
          }
          if (success) {
            let isCritical = false;
            if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
              for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
                const rawVal = parseInt(rawDiceValue);
                if (rawVal >= criticalThreshold) {
                  if (canProduceResult(calc, conditionNode.left, rawVal, leftVal)) { isCritical = true; break; }
                }
              }
            } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
              for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
                const rawVal = parseInt(rawDiceValue);
                if (rawVal >= criticalThreshold) {
                  if (canProduceResult(calc, conditionNode.right, rawVal, rightVal)) { isCritical = true; break; }
                }
              }
            }
            if (isCritical) totalCriticalSuccessCount += combinationCount; else totalSuccessCount += combinationCount;
          } else {
            totalFailureCount += combinationCount;
          }
        }
      }
    }
    const total = totalSuccessCount + totalCriticalSuccessCount + totalFailureCount;
    const normalSuccessProbability = total > 0 ? totalSuccessCount / total : 0;
    const criticalSuccessProbability = total > 0 ? totalCriticalSuccessCount / total : 0;
    const failureProbability = total > 0 ? totalFailureCount / total : 1;
    const combined = { 1: Math.round(total * (normalSuccessProbability + criticalSuccessProbability)), 0: Math.round(total * failureProbability) };
    return {
      type: 'conditional_critical',
      combined,
      normalSuccessProbability,
      criticalSuccessProbability,
      failureProbability,
      normalHitValues: { 1: Math.round(total * normalSuccessProbability) },
      criticalHitValues: { 1: Math.round(total * criticalSuccessProbability) },
      missValues: { 0: Math.round(total * failureProbability) },
      nestedConditions: []
    };
  }
  return { type: 'probability', successProbability: 0, failureProbability: 1, successCount: 0, totalCount: 0, distribution: { 0: 1 } };
}
