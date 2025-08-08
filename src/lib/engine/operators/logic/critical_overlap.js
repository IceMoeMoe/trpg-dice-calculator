// 条件表达式中命中与暴击重合的计算逻辑（从 DiceCalculator 抽离）

export function calculateConditionalWithCriticalOverlap(calc, conditionNode, trueValueNode, falseValueNode, baseConditionResult) {
  const criticalRate = calc.criticalOptions.criticalRate;
  const diceInfo = calc.getDiceInfoFromCondition(conditionNode);
  const diceSides = diceInfo.sides;
  const diceCount = diceInfo.count;

  const criticalSides = Math.max(1, Math.round(diceSides * criticalRate / 100));
  const actualCriticalProbability = criticalSides / diceSides;
  const conditionResult = calc.evaluateConditionWithCritical(conditionNode, actualCriticalProbability);

  calc.isCalculatingCritical = false;
  const normalSuccessResult = calc.evaluate(trueValueNode);
  const failureResult = calc.evaluate(falseValueNode);

  calc.isCalculatingCritical = true;
  const criticalSuccessResult = calc.evaluate(trueValueNode);

  const normalSuccessDist = calc.extractDistribution(normalSuccessResult);
  const criticalSuccessDist = calc.extractDistribution(criticalSuccessResult);
  const failureDist = calc.extractDistribution(failureResult);

  const totalPossibleOutcomes = Math.pow(diceSides, diceCount) || 20;
  const scaleFactor = Math.max(totalPossibleOutcomes, 400);

  const result = {};

  const normalSuccessCount = Math.round(scaleFactor * conditionResult.normalSuccessProbability);
  if (normalSuccessCount > 0) {
    const normalSuccessTotal = Object.values(normalSuccessDist).reduce((sum, count) => sum + count, 0);
    for (const [value, count] of Object.entries(normalSuccessDist)) {
      const val = parseFloat(value);
      const relativeProbability = normalSuccessTotal > 0 ? count / normalSuccessTotal : 0;
      const weightedCount = Math.round(relativeProbability * normalSuccessCount);
      if (weightedCount > 0) {
        result[val] = (result[val] || 0) + weightedCount;
      }
    }
  }

  const criticalSuccessCount = Math.round(scaleFactor * conditionResult.criticalSuccessProbability);
  if (criticalSuccessCount > 0) {
    const criticalSuccessTotal = Object.values(criticalSuccessDist).reduce((sum, count) => sum + count, 0);
    for (const [value, count] of Object.entries(criticalSuccessDist)) {
      const val = parseFloat(value);
      const relativeProbability = criticalSuccessTotal > 0 ? count / criticalSuccessTotal : 0;
      const weightedCount = Math.round(relativeProbability * criticalSuccessCount);
      if (weightedCount > 0) {
        result[val] = (result[val] || 0) + weightedCount;
      }
    }
  }

  const failureCount = Math.round(scaleFactor * conditionResult.failureProbability);
  if (failureCount > 0) {
    const failureTotal = Object.values(failureDist).reduce((sum, count) => sum + count, 0);
    for (const [value, count] of Object.entries(failureDist)) {
      const val = parseFloat(value);
      const relativeProbability = failureTotal > 0 ? count / failureTotal : 0;
      const weightedCount = Math.round(relativeProbability * failureCount);
      if (weightedCount > 0) {
        result[val] = (result[val] || 0) + weightedCount;
      }
    }
  }

  const nestedConditions = [];
  const currentCondition = {
    condition: calc.nodeToString(conditionNode),
    successProbability: conditionResult.normalSuccessProbability + conditionResult.criticalSuccessProbability,
    failureProbability: conditionResult.failureProbability,
    normalHitProbability: conditionResult.normalSuccessProbability,
    criticalHitProbability: conditionResult.criticalSuccessProbability,
    isCriticalCondition: true,
    level: 0
  };
  nestedConditions.push(currentCondition);

  if (normalSuccessResult.nestedConditions) {
    normalSuccessResult.nestedConditions.forEach(cond => {
      nestedConditions.push({
        ...cond,
        level: cond.level + 1,
        parentProbability: conditionResult.normalSuccessProbability,
        conditionalProbability: cond.successProbability * conditionResult.normalSuccessProbability,
        path: 'normal_hit'
      });
    });
  }

  if (criticalSuccessResult.nestedConditions) {
    criticalSuccessResult.nestedConditions.forEach(cond => {
      nestedConditions.push({
        ...cond,
        level: cond.level + 1,
        parentProbability: conditionResult.criticalSuccessProbability,
        conditionalProbability: cond.successProbability * conditionResult.criticalSuccessProbability,
        path: 'critical_hit'
      });
    });
  }

  if (failureResult.nestedConditions) {
    failureResult.nestedConditions.forEach(cond => {
      nestedConditions.push({
        ...cond,
        level: cond.level + 1,
        parentProbability: conditionResult.failureProbability,
        conditionalProbability: cond.successProbability * conditionResult.failureProbability,
        path: 'miss'
      });
    });
  }

  const finalActualCriticalProbability = (conditionResult.normalSuccessProbability + conditionResult.criticalSuccessProbability) > 0 
    ? conditionResult.criticalSuccessProbability / (conditionResult.normalSuccessProbability + conditionResult.criticalSuccessProbability) 
    : 0;

  return {
    type: 'conditional_critical',
    combined: result,
    normalHitValues: normalSuccessDist,
    criticalHitValues: criticalSuccessDist,
    missValues: conditionResult.failureProbability > 0 ? failureDist : {},
    probabilities: {
      normalHit: conditionResult.normalSuccessProbability,
      criticalHit: conditionResult.criticalSuccessProbability,
      miss: conditionResult.failureProbability
    },
    actualCriticalProbability: isNaN(finalActualCriticalProbability) ? 0 : finalActualCriticalProbability,
    criticalProbability: criticalRate,
    nestedConditions: nestedConditions
  };
}
