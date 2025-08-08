// 复杂条件暴击合成与 AST 替换相关的工具（从 DiceCalculator 抽离）

// 在AST中找到包含暴击检定骰的条件表达式
export function findCriticalConditionInAST(calc, node) {
  if (!node) return null;
  if (node.type === 'conditional' && calc.containsCriticalDice(node.condition)) {
    return { conditionNode: node.condition, trueValueNode: node.trueValue, falseValueNode: node.falseValue, fullNode: node };
  }
  if (node.type === 'binary_op') {
    const leftResult = findCriticalConditionInAST(calc, node.left); if (leftResult) return leftResult;
    const rightResult = findCriticalConditionInAST(calc, node.right); if (rightResult) return rightResult;
  }
  if (node.expressions) {
    for (const expr of node.expressions) {
      const res = findCriticalConditionInAST(calc, expr); if (res) return res;
    }
  }
  return null;
}

// 在AST中替换指定节点
export function substituteNodeInAST(calc, ast, targetNode, substitutionResult) {
  if (ast === targetNode) {
    return createDistributionNode(calc, substitutionResult);
  }
  if (ast.type === 'binary_op') {
    return { ...ast, left: substituteNodeInAST(calc, ast.left, targetNode, substitutionResult), right: substituteNodeInAST(calc, ast.right, targetNode, substitutionResult) };
  }
  return ast;
}

// 创建表示分布结果的节点
export function createDistributionNode(calc, distributionResult) {
  const dist = calc.extractDistribution(distributionResult);
  const values = Object.keys(dist).map(Number);
  if (values.length === 1) return { type: 'number', value: values[0] };
  return { type: 'distribution', distribution: dist };
}

// 计算表达式，将条件部分替换为指定的结果
export function evaluateExpressionWithSubstitution(calc, ast, conditionInfo, substitutionResult) {
  const substitutedAST = substituteNodeInAST(calc, ast, conditionInfo.fullNode, substitutionResult);
  return calc.evaluate(substitutedAST);
}

// 标准暴击计算（作为回退方案）
export function calculateStandardCritical(calc, ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
  calc.isCalculatingCritical = false; const normalResult = calc.evaluate(ast);
  calc.isCalculatingCritical = true; const criticalResult = calc.evaluate(ast);
  const combinedDistribution = {}; const normalDist = calc.extractDistribution(normalResult); const criticalDist = calc.extractDistribution(criticalResult);
  const normalTotal = Object.values(normalDist).reduce((s, c) => s + c, 0);
  const criticalTotal = Object.values(criticalDist).reduce((s, c) => s + c, 0);
  for (const [value, count] of Object.entries(normalDist)) {
    const val = parseFloat(value); const rel = count / normalTotal; const w = rel * normalProbability; combinedDistribution[val] = (combinedDistribution[val] || 0) + w;
  }
  for (const [value, count] of Object.entries(criticalDist)) {
    const val = parseFloat(value); const rel = count / criticalTotal; const w = rel * criticalProbability; combinedDistribution[val] = (combinedDistribution[val] || 0) + w;
  }
  const totalWeight = Object.values(combinedDistribution).reduce((s, w) => s + w, 0); const normalizedResult = {}; const scaleFactor = normalTotal;
  for (const [value, weight] of Object.entries(combinedDistribution)) {
    const normalizedCount = Math.round((weight * scaleFactor) / totalWeight); if (normalizedCount > 0) normalizedResult[value] = normalizedCount;
  }
  const average = calc.calculateAverage({ distribution: normalizedResult }); const totalOutcomes = Object.values(normalizedResult).reduce((s, c) => s + c, 0);
  return { distribution: normalizedResult, average, totalOutcomes, success: true, isCritical: true, originalCriticalRate, actualCriticalProbability: criticalProbability * 100, diceSides, criticalSides, normalDistribution: normalDist, criticalDistribution: criticalDist, normalProbability, criticalProbability };
}

// 处理条件表达式的暴击
export function handleConditionalCritical(calc, normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
  const normalDist = calc.extractDistribution(normalResult); const criticalDist = calc.extractDistribution(criticalResult); const combinedDistribution = {};
  const normalTotal = Object.values(normalDist).reduce((s, c) => s + c, 0); const criticalTotal = Object.values(criticalDist).reduce((s, c) => s + c, 0);
  for (const [value, count] of Object.entries(normalDist)) { const val = parseFloat(value); const rel = count / normalTotal; const w = rel * normalProbability; combinedDistribution[val] = (combinedDistribution[val] || 0) + w; }
  for (const [value, count] of Object.entries(criticalDist)) { const val = parseFloat(value); const rel = count / criticalTotal; const w = rel * criticalProbability; combinedDistribution[val] = (combinedDistribution[val] || 0) + w; }
  const totalWeight = Object.values(combinedDistribution).reduce((s, w) => s + w, 0); const normalizedResult = {}; const scaleFactor = normalTotal;
  for (const [value, weight] of Object.entries(combinedDistribution)) { const normalizedCount = Math.round((weight * scaleFactor) / totalWeight); if (normalizedCount > 0) normalizedResult[value] = normalizedCount; }
  const average = calc.calculateAverage({ distribution: normalizedResult }); const totalOutcomes = Object.values(normalizedResult).reduce((s, c) => s + c, 0);
  return { type: 'conditional_critical', distribution: normalizedResult, average, totalOutcomes, success: true, isConditionalCritical: true, originalCriticalRate, actualCriticalProbability: criticalProbability * 100, diceSides, criticalSides, normalDistribution: normalDist, criticalDistribution: criticalDist, normalProbability, criticalProbability, nestedConditions: [] };
}

// 处理复杂的条件暴击表达式（如 (D20>10?#1#:0)+d8）
export function calculateComplexConditionalCritical(calc, ast, normalProbability, criticalProbability, originalCriticalRate) {
  const conditionInfo = findCriticalConditionInAST(calc, ast);
  if (!conditionInfo) return calculateStandardCritical(calc, ast, normalProbability, criticalProbability, calc.getCriticalDiceSidesFromAST(ast), Math.max(1, Math.round(calc.getCriticalDiceSidesFromAST(ast) * originalCriticalRate / 100)), originalCriticalRate);

  const { conditionNode, trueValueNode, falseValueNode } = conditionInfo;
  const criticalRate = originalCriticalRate; const diceInfo = calc.getDiceInfoFromCondition(conditionNode); const actualDiceSides = diceInfo.sides; const diceCount = diceInfo.count;
  let actualCriticalProbability = 0; let skipGeneralCalculation = false;
  try {
    let diceDistribution = {};
    if (conditionNode.type === 'keep' && conditionNode.expressions && conditionNode.expressions[0]) {
      const diceExpression = conditionNode.expressions[0];
      if (diceExpression.type === 'dice') {
        const singleDiceCriticalRate = criticalRate / 100; const cnt = diceExpression.count || 1;
        actualCriticalProbability = 1 - Math.pow(1 - singleDiceCriticalRate, cnt); skipGeneralCalculation = true;
      } else { const diceResult = calc.evaluate(diceExpression); diceDistribution = calc.extractDistribution(diceResult); }
    } else if (conditionNode.type === 'comparison' && conditionNode.left) {
      if (calc.containsCriticalDice(conditionNode.left)) {
        if (conditionNode.left.type === 'keep' && conditionNode.left.expressions && conditionNode.left.expressions[0]) {
          const diceExpression = conditionNode.left.expressions[0];
          if (diceExpression.type === 'dice') { const single = criticalRate / 100; const cnt = diceExpression.count || 1; actualCriticalProbability = 1 - Math.pow(1 - single, cnt); skipGeneralCalculation = true; }
        }
        if (!skipGeneralCalculation) {
          const rawDice = calc.findCriticalDiceInNode(conditionNode.left);
          if (rawDice) {
            const diceExpression = { type: 'dice', sides: rawDice.sides, count: rawDice.count, isCriticalDice: true };
            const diceResult = calc.evaluate(diceExpression); diceDistribution = calc.extractDistribution(diceResult);
          }
        }
      } else { const leftResult = calc.evaluate(conditionNode.left); diceDistribution = calc.extractDistribution(leftResult); }
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
    if (!skipGeneralCalculation) { const criticalSidesCount = Math.max(1, Math.round(actualDiceSides * criticalRate / 100)); actualCriticalProbability = criticalSidesCount / actualDiceSides; }
  }

  const baseConditionResult = calc.evaluateConditionWithCritical(conditionNode, actualCriticalProbability);
  calc.isCalculatingCritical = false; const normalSuccessResult = calc.evaluate(trueValueNode); const failureResult = calc.evaluate(falseValueNode);
  calc.isCalculatingCritical = true; const criticalSuccessResult = calc.evaluate(trueValueNode);
  const normalSuccessFullDist = evaluateExpressionWithSubstitution(calc, ast, conditionInfo, normalSuccessResult);
  const criticalSuccessFullDist = evaluateExpressionWithSubstitution(calc, ast, conditionInfo, criticalSuccessResult);
  const failureFullDist = evaluateExpressionWithSubstitution(calc, ast, conditionInfo, failureResult);
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
    for (const [value, count] of Object.entries(normalSuccessDist)) { const val = parseFloat(value); const rel = normalSuccessTotal > 0 ? count / normalSuccessTotal : 0; const weighted = Math.round(rel * normalSuccessCount); if (weighted > 0) result[val] = (result[val] || 0) + weighted; }
  }
  const criticalSuccessCount = Math.round(scaleFactor * baseConditionResult.criticalSuccessProbability);
  if (criticalSuccessCount > 0) {
    const criticalSuccessTotal = Object.values(criticalSuccessDist).reduce((s, c) => s + c, 0);
    for (const [value, count] of Object.entries(criticalSuccessDist)) { const val = parseFloat(value); const rel = criticalSuccessTotal > 0 ? count / criticalSuccessTotal : 0; const weighted = Math.round(rel * criticalSuccessCount); if (weighted > 0) result[val] = (result[val] || 0) + weighted; }
  }
  const failureCount = Math.round(scaleFactor * baseConditionResult.failureProbability);
  if (failureCount > 0) {
    const failureTotal = Object.values(failureDist).reduce((s, c) => s + c, 0);
    for (const [value, count] of Object.entries(failureDist)) { const val = parseFloat(value); const rel = failureTotal > 0 ? count / failureTotal : 0; const weighted = Math.round(rel * failureCount); if (weighted > 0) result[val] = (result[val] || 0) + weighted; }
  }
  const average = calc.calculateAverage({ distribution: result }); const totalOutcomes = Object.values(result).reduce((s, c) => s + c, 0);
  const totalSuccessProbability = baseConditionResult.normalSuccessProbability + baseConditionResult.criticalSuccessProbability;
  const finalActualCriticalProbability = totalSuccessProbability > 0 ? actualCriticalProbability : 0;
  return { distribution: result, average, totalOutcomes, success: true, isConditionalCritical: true, normalHitValues: conditionNormalHitValues, criticalHitValues: conditionCriticalHitValues, missValues: conditionMissValues, probabilities: { normalHit: baseConditionResult.normalSuccessProbability, criticalHit: baseConditionResult.criticalSuccessProbability, miss: baseConditionResult.failureProbability }, diceSides: actualDiceSides, criticalSides: Math.max(1, Math.round(actualDiceSides * criticalRate / 100)), originalCriticalRate, actualCriticalProbability: finalActualCriticalProbability * 100, criticalProbability: finalActualCriticalProbability * 100, nestedConditions: [] };
}
