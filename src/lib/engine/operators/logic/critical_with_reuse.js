// 带骰子复用的暴击计算与条件暴击合并

import { calculateWithDiceReuseOperator, getEffectiveCriticalDiceValues } from './dice_reuse.js';

export function calculateWithDiceReuseAndCriticalOperator(calc, ast, diceRegistry, criticalOptions) {
  calc.currentDiceRegistry = diceRegistry;
  const actualCriticalInfo = calculateActualCriticalProbabilityWithDiceReuse(calc, ast, diceRegistry, criticalOptions.criticalRate);

  const criticalProbability = actualCriticalInfo.criticalProbability;
  const normalizedCriticalProbability = criticalProbability > 1 ? criticalProbability / 100 : criticalProbability;
  const normalProbability = 1 - normalizedCriticalProbability;

  calc.isCalculatingCritical = false;
  const normalResult = calculateWithDiceReuseOperator(calc, ast, diceRegistry, criticalOptions);
  // 失败分支（条件为假）使用真实的假值表达式进行计算，用于 missValues 展示
  let failureResultForDisplay = null;
  if (ast.type === 'conditional' && ast.falseValue) {
    try {
      failureResultForDisplay = calculateWithDiceReuseOperator(calc, ast.falseValue, diceRegistry, criticalOptions);
    } catch (_) {
      // 忽略失败分支展示的异常，按旧逻辑回退
      failureResultForDisplay = null;
    }
  }
  calc.isCalculatingCritical = true;
  const criticalResult = calculateWithDiceReuseOperator(calc, ast, diceRegistry, criticalOptions);

  const containsConditional = calc.containsConditionalExpression(ast);
  if (ast.type === 'conditional' || containsConditional) {
    let ret;
    if (ast.type === 'conditional') {
      ret = handleConditionalCriticalWithDiceReuseForConditional(
        calc,
        ast,
        normalResult,
        criticalResult,
        normalProbability,
        normalizedCriticalProbability,
        actualCriticalInfo.diceSides,
        actualCriticalInfo.criticalSides,
        criticalOptions.criticalRate,
        failureResultForDisplay
      );
    } else {
      ret = handleConditionalCriticalWithDiceReuse(
        calc,
        normalResult,
        criticalResult,
        normalProbability,
        normalizedCriticalProbability,
        actualCriticalInfo.diceSides,
        actualCriticalInfo.criticalSides,
        criticalOptions.criticalRate
      );
    }
    delete calc.currentDiceRegistry;
    return ret;
  }

  const combinedDistribution = {};
  const normalDist = calc.extractDistribution(normalResult);
  const criticalDist = calc.extractDistribution(criticalResult);
  const normalTotal = Object.values(normalDist).reduce((s, c) => s + c, 0);
  const criticalTotal = Object.values(criticalDist).reduce((s, c) => s + c, 0);

  for (const [value, count] of Object.entries(normalDist)) {
    const val = parseFloat(value);
    const rel = count / normalTotal;
    const weighted = rel * normalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weighted;
  }
  for (const [value, count] of Object.entries(criticalDist)) {
    const val = parseFloat(value);
    const rel = count / criticalTotal;
    const weighted = rel * normalizedCriticalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weighted;
  }

  const totalWeight = Object.values(combinedDistribution).reduce((s, w) => s + w, 0);
  const normalizedResult = {};
  const scaleFactor = normalTotal;
  for (const [value, weight] of Object.entries(combinedDistribution)) {
    const normalizedCount = Math.round((weight * scaleFactor) / totalWeight);
    if (normalizedCount > 0) normalizedResult[value] = normalizedCount;
  }

  const average = calc.calculateAverage({ distribution: normalizedResult });
  const totalOutcomes = Object.values(normalizedResult).reduce((s, c) => s + c, 0);
  return {
    distribution: normalizedResult,
    average,
    totalOutcomes,
    success: true,
    hasDiceReuse: true,
    isCritical: true,
    diceSides: actualCriticalInfo.diceSides,
    criticalSides: actualCriticalInfo.criticalSides,
    originalCriticalRate: criticalOptions.criticalRate,
    actualCriticalProbability: criticalProbability * 100,
    criticalProbability: criticalProbability * 100,
    normalDistribution: normalDist,
    criticalDistribution: criticalDist,
    normalProbability,
  criticalProbability: normalizedCriticalProbability,
  };
}

export function calculateActualCriticalProbabilityWithDiceReuse(calc, ast, diceRegistry, originalCriticalRate) {
  const diceDistributions = new Map();
  for (const [id, def] of diceRegistry.entries()) {
    const distribution = calc.calculateBasicDice(def.count, def.sides);
    diceDistributions.set(id, distribution);
  }

  let totalCombinations = 0;
  let criticalCombinations = 0;
  const diceIds = Array.from(diceDistributions.keys());

  let diceSides = 20;
  let foundCriticalDice = false;
  for (const [, def] of diceRegistry.entries()) {
    if (def.isCriticalDice) {
      diceSides = def.sides;
      foundCriticalDice = true;
      break;
    }
  }
  if (!foundCriticalDice) {
    return { criticalProbability: 0, diceSides: 20, criticalSides: 0 };
  }

  const enumerate = (index, currentValues, currentWeight) => {
    if (index >= diceIds.length) {
      totalCombinations += currentWeight;
  const criticalDiceValues = getEffectiveCriticalDiceValues(calc, currentValues, ast);
      if (criticalDiceValues.length > 0) {
        let isCritical = false;
        for (const { diceId, effectiveValue } of criticalDiceValues) {
          const diceDef = diceRegistry.get(diceId);
          if (diceDef && diceDef.isCriticalDice) {
            const ds = diceDef.sides;
            const rate = originalCriticalRate || 5;
            const cs = Math.max(1, Math.round(ds * rate / 100));
            const threshold = ds - cs + 1;
            if (effectiveValue >= threshold) { isCritical = true; break; }
          }
        }
        if (isCritical) criticalCombinations += currentWeight;
      }
      return;
    }
    const diceId = diceIds[index];
    const diceDistribution = diceDistributions.get(diceId);
    for (const [value, count] of Object.entries(diceDistribution)) {
      const val = parseInt(value);
      const newValues = new Map(currentValues);
      newValues.set(diceId, val);
      const newWeight = currentWeight * count;
      enumerate(index + 1, newValues, newWeight);
    }
  };
  enumerate(0, new Map(), 1);

  const criticalProbability = totalCombinations > 0 ? criticalCombinations / totalCombinations : 0;
  const criticalSides = Math.max(1, Math.round(diceSides * originalCriticalRate / 100));
  const correctedProbability = correctKeepCriticalProbability(calc, ast, criticalProbability, originalCriticalRate, diceSides);
  return { criticalProbability: correctedProbability, diceSides, criticalSides };
}

export function correctKeepCriticalProbability(calc, ast, originalProbability, criticalRate, diceSides) {
  const keepNode = findKeepNodeInAST(ast);
  if (!keepNode) return originalProbability;
  const expressions = keepNode.expressions || [keepNode.expression];
  if (expressions.length === 1 && expressions[0].type === 'dice') {
    const diceExpr = expressions[0];
    const diceCount = diceExpr.count || 1;
    if (diceCount > 1) {
      const single = criticalRate / 100;
      return 1 - Math.pow(1 - single, diceCount);
    }
  }
  return originalProbability;
}

export function findKeepNodeInAST(node) {
  if (!node) return null;
  if (node.type === 'keep') return node;
  if (node.condition) { const r = findKeepNodeInAST(node.condition); if (r) return r; }
  if (node.trueValue) { const r = findKeepNodeInAST(node.trueValue); if (r) return r; }
  if (node.falseValue) { const r = findKeepNodeInAST(node.falseValue); if (r) return r; }
  if (node.left) { const r = findKeepNodeInAST(node.left); if (r) return r; }
  if (node.right) { const r = findKeepNodeInAST(node.right); if (r) return r; }
  if (node.expressions) {
    for (const expr of node.expressions) { const r = findKeepNodeInAST(expr); if (r) return r; }
  }
  return null;
}

export function handleConditionalCriticalWithDiceReuseForConditional(calc, ast, normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate, failureResultForDisplay = null) {
  const normalDist = calc.extractDistribution(normalResult);
  const criticalDist = calc.extractDistribution(criticalResult);
  const normalHitValues = {};
  const criticalHitValues = {};
  const missValues = {};

  for (const [value, count] of Object.entries(normalDist)) { const v = parseFloat(value); if (v > 0) normalHitValues[v] = count; }
  for (const [value, count] of Object.entries(criticalDist)) { const v = parseFloat(value); if (v > 0) criticalHitValues[v] = count; }

  const actualCriticalProbability = criticalProbability;
  let actualFailureProbability = 0; let totalSuccessProbability = 1;

  if (ast.type === 'conditional' && ast.condition) {
    try {
      const was = calc.isCalculatingCritical; calc.isCalculatingCritical = false;
      const conditionResult = calc.evaluate(ast.condition);
      calc.isCalculatingCritical = was;
      if (conditionResult.type === 'probability') {
        actualFailureProbability = conditionResult.failureProbability;
        totalSuccessProbability = conditionResult.successProbability;
      } else {
        const conditionDist = calc.extractDistribution(conditionResult);
        const conditionTotal = Object.values(conditionDist).reduce((s, c) => s + c, 0);
        const successCount = Object.entries(conditionDist).filter(([value]) => parseFloat(value) > 0).reduce((s, [, c]) => s + c, 0);
        totalSuccessProbability = conditionTotal > 0 ? successCount / conditionTotal : 0;
        actualFailureProbability = 1 - totalSuccessProbability;
      }
    } catch (e) {
      const hasZeroInNormal = normalDist.hasOwnProperty('0') && normalDist['0'] > 0;
      const hasZeroInCritical = criticalDist.hasOwnProperty('0') && criticalDist['0'] > 0;
      if (hasZeroInNormal || hasZeroInCritical) {
        const totalNormalCount = Object.values(normalDist).reduce((s, c) => s + c, 0);
        const zeroCountNormal = normalDist['0'] || 0;
        const zeroCountCritical = criticalDist['0'] || 0;
        actualFailureProbability = (zeroCountNormal + zeroCountCritical) / (totalNormalCount * 2);
      }
      totalSuccessProbability = 1 - actualFailureProbability;
    }
  } else {
    const hasZeroInNormal = normalDist.hasOwnProperty('0') && normalDist['0'] > 0;
    const hasZeroInCritical = criticalDist.hasOwnProperty('0') && criticalDist['0'] > 0;
    if (hasZeroInNormal || hasZeroInCritical) {
      const totalNormalCount = Object.values(normalDist).reduce((s, c) => s + c, 0);
      const zeroCountNormal = normalDist['0'] || 0;
      const zeroCountCritical = criticalDist['0'] || 0;
      actualFailureProbability = (zeroCountNormal + zeroCountCritical) / (totalNormalCount * 2);
    }
    totalSuccessProbability = 1 - actualFailureProbability;
  }

  const normalSuccessProbability = totalSuccessProbability * (1 - actualCriticalProbability);
  const criticalSuccessProbability = totalSuccessProbability * actualCriticalProbability;
  const failureProbability = actualFailureProbability;

  // 失败分支展示：优先使用真实的失败分支分布（例如 : d_1），避免错误地显示为0
  if (actualFailureProbability > 0) {
    if (failureResultForDisplay) {
      const failureDist = calc.extractDistribution(failureResultForDisplay);
      for (const [value, count] of Object.entries(failureDist)) {
        const v = parseFloat(value);
        // 只记录出现过的失败取值形状，不做概率缩放（缩放在图表按概率完成）
        if (count > 0) missValues[v] = (missValues[v] || 0) + count;
      }
    }
    // 回退：若失败分支无法评估，则沿用旧的“0占位”逻辑
    if (Object.keys(missValues).length === 0) {
      const zeroInNormal = normalDist['0'] || 0;
      const zeroInCritical = criticalDist['0'] || 0;
      if (zeroInNormal > 0 || zeroInCritical > 0) { missValues[0] = Math.max(zeroInNormal, zeroInCritical); }
      else if (actualFailureProbability >= 0.01) { missValues[0] = 1; }
    }
  }

  const combinedDistribution = {};
  const normalTotal = Object.values(normalDist).reduce((s, c) => s + c, 0);
  const criticalTotal = Object.values(criticalDist).reduce((s, c) => s + c, 0);

  for (const [value, count] of Object.entries(normalDist)) {
    const val = parseFloat(value);
    const rel = count / normalTotal;
    const weighted = rel * normalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weighted;
  }
  for (const [value, count] of Object.entries(criticalDist)) {
    const val = parseFloat(value);
    const rel = count / criticalTotal;
    const weighted = rel * criticalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weighted;
  }

  const totalWeight = Object.values(combinedDistribution).reduce((s, w) => s + w, 0);
  const normalizedResult = {};
  const scaleFactor = Math.max(normalTotal, criticalTotal);
  for (const [value, weight] of Object.entries(combinedDistribution)) {
    const normalizedCount = Math.round((weight * scaleFactor) / totalWeight);
    if (normalizedCount > 0) normalizedResult[value] = normalizedCount;
  }

  const average = calc.calculateAverage({ distribution: normalizedResult });
  const totalOutcomes = Object.values(normalizedResult).reduce((s, c) => s + c, 0);
  return {
    distribution: normalizedResult,
    average,
    totalOutcomes,
    success: true,
    hasDiceReuse: true,
    isConditionalCritical: true,
    normalHitValues,
    criticalHitValues,
    missValues,
    probabilities: { normalHit: normalSuccessProbability, criticalHit: criticalSuccessProbability, miss: failureProbability },
    diceSides,
    criticalSides,
    originalCriticalRate,
    actualCriticalProbability: actualCriticalProbability * 100,
    criticalProbability: actualCriticalProbability * 100,
    nestedConditions: [],
  };
}

export function handleConditionalCriticalWithDiceReuse(calc, normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
  const combinedDistribution = {};
  const normalDist = calc.extractDistribution(normalResult);
  const criticalDist = calc.extractDistribution(criticalResult);
  const normalTotal = Object.values(normalDist).reduce((s, c) => s + c, 0);
  const criticalTotal = Object.values(criticalDist).reduce((s, c) => s + c, 0);

  for (const [value, count] of Object.entries(normalDist)) {
    const val = parseFloat(value);
    const rel = normalTotal > 0 ? count / normalTotal : 0;
    const weighted = rel * normalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weighted;
  }
  for (const [value, count] of Object.entries(criticalDist)) {
    const val = parseFloat(value);
    const rel = criticalTotal > 0 ? count / criticalTotal : 0;
    const weighted = rel * criticalProbability;
    combinedDistribution[val] = (combinedDistribution[val] || 0) + weighted;
  }

  const totalWeight = Object.values(combinedDistribution).reduce((s, w) => s + w, 0);
  const normalizedResult = {};
  const scaleFactor = Math.max(normalTotal, criticalTotal);
  for (const [value, weight] of Object.entries(combinedDistribution)) {
    const normalizedCount = Math.round((weight * scaleFactor) / totalWeight);
    if (normalizedCount > 0) normalizedResult[value] = normalizedCount;
  }

  const average = calc.calculateAverage({ distribution: normalizedResult });
  const totalOutcomes = Object.values(normalizedResult).reduce((s, c) => s + c, 0);
  return {
    distribution: normalizedResult,
    average,
    totalOutcomes,
    success: true,
    hasDiceReuse: true,
    isCritical: true,
    diceSides,
    criticalSides,
    originalCriticalRate,
    actualCriticalProbability: criticalProbability * 100,
    criticalProbability: criticalProbability * 100,
    normalDistribution: normalDist,
    criticalDistribution: criticalDist,
    normalProbability,
    criticalProbability,
  };
}
