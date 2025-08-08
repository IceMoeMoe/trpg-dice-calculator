// min_each / max_each 操作：对每个骰子单独应用阈值，然后做卷积
// 通过传入 calc 以复用 evaluate / extractDistribution / convolveDistributions

function ensureFixedThreshold(calc, thresholdExpression, funcName) {
  const thresholdResult = calc.evaluate(thresholdExpression);
  const thresholdDist = calc.extractDistribution(thresholdResult);
  const values = Object.keys(thresholdDist).map(Number);
  if (values.length !== 1) {
    throw new Error(`${funcName}函数的阈值必须是一个固定值`);
  }
  return values[0];
}

export function calculateMinFunctionOperator(calc, diceExpression, thresholdExpression) {
  const diceResult = calc.evaluate(diceExpression);
  const threshold = ensureFixedThreshold(calc, thresholdExpression, 'min');
  const diceDist = calc.extractDistribution(diceResult);
  const result = {};
  for (const [value, count] of Object.entries(diceDist)) {
    const v = parseFloat(value);
    const adjusted = Math.max(v, threshold);
    result[adjusted] = (result[adjusted] || 0) + count;
  }
  return result;
}

export function calculateMaxFunctionOperator(calc, diceExpression, thresholdExpression) {
  const diceResult = calc.evaluate(diceExpression);
  const threshold = ensureFixedThreshold(calc, thresholdExpression, 'max');
  const diceDist = calc.extractDistribution(diceResult);
  const result = {};
  for (const [value, count] of Object.entries(diceDist)) {
    const v = parseFloat(value);
    const adjusted = Math.min(v, threshold);
    result[adjusted] = (result[adjusted] || 0) + count;
  }
  return result;
}

export function calculateMinEachForBasicDiceOperator(calc, diceNode, threshold) {
  const { count, sides } = diceNode;
  const single = {};
  for (let i = 1; i <= sides; i++) {
    const adjusted = Math.max(i, threshold);
    single[adjusted] = (single[adjusted] || 0) + 1;
  }
  if (count === 1) return single;
  let result = single;
  for (let i = 1; i < count; i++) {
    result = calc.convolveDistributions(result, single);
  }
  return result;
}

export function calculateMaxEachForBasicDiceOperator(calc, diceNode, threshold) {
  const { count, sides } = diceNode;
  const single = {};
  for (let i = 1; i <= sides; i++) {
    const adjusted = Math.min(i, threshold);
    single[adjusted] = (single[adjusted] || 0) + 1;
  }
  if (count === 1) return single;
  let result = single;
  for (let i = 1; i < count; i++) {
    result = calc.convolveDistributions(result, single);
  }
  return result;
}

export function calculateMinEachFunctionOperator(calc, diceExpression, thresholdExpression) {
  const threshold = ensureFixedThreshold(calc, thresholdExpression, 'min_each');
  if (diceExpression.type === 'dice') {
    return calculateMinEachForBasicDiceOperator(calc, diceExpression, threshold);
  }
  console.warn('min_each函数对复杂表达式退回到min函数行为');
  return calculateMinFunctionOperator(calc, diceExpression, thresholdExpression);
}

export function calculateMaxEachFunctionOperator(calc, diceExpression, thresholdExpression) {
  const threshold = ensureFixedThreshold(calc, thresholdExpression, 'max_each');
  if (diceExpression.type === 'dice') {
    return calculateMaxEachForBasicDiceOperator(calc, diceExpression, threshold);
  }
  console.warn('max_each函数对复杂表达式退回到max函数行为');
  return calculateMaxFunctionOperator(calc, diceExpression, thresholdExpression);
}
