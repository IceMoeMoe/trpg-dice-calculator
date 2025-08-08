// Critical 基础算子：翻倍、切换、仅暴击
// 通过传入 calc 实例以复用其 evaluate / extractDistribution 与 isCalculatingCritical 标志

export function calculateCriticalDoubleOperator(calc, expression) {
  const result = calc.evaluate(expression);
  if (calc.isCalculatingCritical) {
    const doubled = {};
    const dist = calc.extractDistribution(result);
    for (const [value, count] of Object.entries(dist)) {
      const v = parseFloat(value) * 2;
      doubled[v] = count;
    }
    return doubled;
  }
  return result;
}

export function calculateCriticalSwitchOperator(calc, normalExpression, criticalExpression) {
  if (calc.isCalculatingCritical) {
    return calc.evaluate(criticalExpression);
  }
  return calc.evaluate(normalExpression);
}

export function calculateCriticalOnlyOperator(calc, expression) {
  if (calc.isCalculatingCritical) {
    return calc.evaluate(expression);
  }
  return { 0: 1 };
}
