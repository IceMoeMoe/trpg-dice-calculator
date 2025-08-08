// 骰子复用相关：快速组合与固定值求值、暴击组合过滤等

// 从 calc 实例复用必要能力：evaluate / extractDistribution / calculateAverage / calculateNormalBinaryOp 等

export function calculateWithDiceReuseOperator(calc, ast, diceRegistry, criticalOptions) {
  // 预计算每个独立骰子的分布
  const diceDistributions = new Map();
  for (const [id, def] of diceRegistry.entries()) {
    const distribution = calc.calculateBasicDice(def.count, def.sides);
    diceDistributions.set(id, distribution);
  }
  const result = {};
  calculateDiceReuseFast(calc, diceDistributions, ast, result);

  const average = calc.calculateAverage(result);
  const totalOutcomes = Object.values(result).reduce((s, c) => s + c, 0);
  return {
    distribution: result,
    average,
    totalOutcomes,
    success: true,
    isProbability: false,
    hasDiceReuse: true,
  };
}

export function calculateDiceReuseFast(calc, diceDistributions, ast, result) {
  const diceIds = Array.from(diceDistributions.keys());
  if (diceIds.length === 0) {
    const normalResult = calc.evaluate(ast);
    Object.assign(result, normalResult);
    return;
  }
  enumerateCombinationsFast(calc, diceDistributions, diceIds, 0, new Map(), 1, ast, result);
}

function enumerateCombinationsFast(calc, diceDistributions, diceIds, index, currentValues, currentWeight, ast, result) {
  if (index >= diceIds.length) {
    if (calc.isCalculatingCritical !== undefined && calc.currentDiceRegistry) {
      const shouldInclude = shouldIncludeCombinationForCritical(calc, currentValues, ast);
      if (!shouldInclude) return;
    }
    calc.currentDiceValues = currentValues;
    const expressionResult = calc.evaluateWithFixedDice(ast);
    delete calc.currentDiceValues;

    if (typeof expressionResult === 'object' && expressionResult.distribution) {
      for (const [value, count] of Object.entries(expressionResult.distribution)) {
        const val = parseFloat(value);
        result[val] = (result[val] || 0) + count * currentWeight;
      }
    } else {
      for (const [value, count] of Object.entries(expressionResult)) {
        const val = parseFloat(value);
        result[val] = (result[val] || 0) + count * currentWeight;
      }
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
    enumerateCombinationsFast(calc, diceDistributions, diceIds, index + 1, newValues, newWeight, ast, result);
  }
}

export function shouldIncludeCombinationForCritical(calc, currentValues, ast = null) {
  if (!calc.currentDiceRegistry || !calc.criticalOptions) return true;
  const criticalDiceValues = getEffectiveCriticalDiceValues(calc, currentValues, ast);
  if (criticalDiceValues.length === 0) return true;

  for (const { diceId, effectiveValue } of criticalDiceValues) {
    const diceDef = calc.currentDiceRegistry.get(diceId);
    if (diceDef && diceDef.isCriticalDice) {
      const diceSides = diceDef.sides;
      const criticalRate = calc.criticalOptions.criticalRate || 5;
      const criticalSides = Math.max(1, Math.round(diceSides * criticalRate / 100));
      const criticalThreshold = diceSides - criticalSides + 1;
      const isCriticalValue = effectiveValue >= criticalThreshold;
      if (calc.isCalculatingCritical && !isCriticalValue) return false;
      if (!calc.isCalculatingCritical && isCriticalValue) return false;
    }
  }
  return true;
}

export function getEffectiveCriticalDiceValues(calc, currentValues, ast) {
  const analyze = (node, values) => {
    if (!node) return [];
    switch (node.type) {
      case 'dice':
        if (node.isCriticalDice && node.id !== undefined && values.has(node.id)) {
          const diceCount = node.count || 1;
          if (diceCount > 1) {
            const results = [];
            for (let i = 0; i < diceCount; i++) {
              const individualDiceId = `${node.id}_${i}`;
              if (values.has(individualDiceId)) {
                results.push({ diceId: individualDiceId, effectiveValue: values.get(individualDiceId) });
              }
            }
            return results;
          }
          return [{ diceId: node.id, effectiveValue: values.get(node.id) }];
        }
    // 非暴击骰或当前组合中没有该骰子的固定值，视为无效贡献
    return [];
      case 'dice_ref':
        if (node.isCriticalDice && values.has(node.id)) {
          return [{ diceId: node.id, effectiveValue: values.get(node.id) }];
        }
    return [];
      case 'keep': {
        const expressions = node.expressions || [node.expression];
        let allVals = [];
        for (const expr of expressions) allVals.push(...analyze(expr, values));
        return allVals;
      }
      case 'reroll':
        if (node.dice && node.dice.isCriticalDice && node.dice.id !== undefined && values.has(node.dice.id)) {
          return [{ diceId: node.dice.id, effectiveValue: values.get(node.dice.id) }];
        }
    return [];
      case 'binary_op':
      case 'comparison': {
        const l = analyze(node.left, values);
        const r = analyze(node.right, values);
        return [...l, ...r];
      }
      case 'conditional': {
        const c = analyze(node.condition, values);
        const t = analyze(node.trueValue, values);
        const f = analyze(node.falseValue, values);
        return [...c, ...t, ...f];
      }
      case 'exploding':
      case 'exploding_sum':
        return analyze(node.baseExpression || node.diceNode, values);
      case 'critical_double':
      case 'critical_only':
        return analyze(node.expression, values);
      case 'critical_switch': {
        const n = analyze(node.normalExpression, values);
        const cr = analyze(node.criticalExpression, values);
        return [...n, ...cr];
      }
      default:
        return [];
    }
  // 兜底：任何未显式返回的路径都不应贡献有效的暴击骰
  return [];
  };

  if (ast) return analyze(ast, currentValues);
  const criticalDiceValues = [];
  for (const [diceId, diceValue] of currentValues.entries()) {
    const diceDef = calc.currentDiceRegistry.get(diceId);
    if (diceDef && diceDef.isCriticalDice) {
      criticalDiceValues.push({ diceId, effectiveValue: diceValue });
    }
  }
  return criticalDiceValues;
}

export const diceReuseInternals = {
  calculateDiceReuseFast,
  enumerateCombinationsFast,
  shouldIncludeCombinationForCritical,
  getEffectiveCriticalDiceValues,
};
