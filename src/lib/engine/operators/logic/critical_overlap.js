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

  // 使用分支分布的总组合数决定缩放基数：取三个分支总数的最小公倍数（LCM），更贴近真实组合规模
  const normalTotalRaw = Object.values(normalSuccessDist).reduce((sum, count) => sum + count, 0);
  const criticalTotalRaw = Object.values(criticalSuccessDist).reduce((sum, count) => sum + count, 0);
  const failureTotalRaw = Object.values(failureDist).reduce((sum, count) => sum + count, 0);
  const totalPossibleOutcomes = Math.pow(diceSides, diceCount) || 1;

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; }
  function lcm(a, b) { if (a === 0 || b === 0) return Math.max(a, b); return Math.abs(a / gcd(a, b) * b); }
  function lcmMany(arr) { return arr.filter(n => n > 0).reduce((acc, n) => lcm(acc, n), 1); }

  let scaleFactor = lcmMany([normalTotalRaw, criticalTotalRaw, failureTotalRaw, totalPossibleOutcomes]);
  if (!scaleFactor || scaleFactor <= 0) {
    // 回退：若全部为空，至少给 1，避免除零
    scaleFactor = 1;
  }
  // 不设上限：按真实组合空间精确表达

  // 辅助：将 totalCount 按分布相对概率精确分配（最大余数法），保证整数和总和一致
  function allocateCountsExactly(dist, totalCount) {
    if (!dist || totalCount <= 0) return {};
    const entries = Object.entries(dist);
    if (entries.length === 0) return {};
    const total = entries.reduce((s, [, c]) => s + c, 0);
    if (total <= 0) return {};
    const baseAlloc = new Map();
    const remainders = [];
    let assigned = 0;
    for (const [value, count] of entries) {
      const exact = (count / total) * totalCount;
      const base = Math.floor(exact);
      baseAlloc.set(value, base);
      assigned += base;
      remainders.push({ value, rem: exact - base });
    }
    let remaining = totalCount - assigned;
    remainders.sort((a, b) => (b.rem - a.rem) || (parseFloat(a.value) - parseFloat(b.value)));
    for (let i = 0; i < remainders.length && remaining > 0; i++) {
      const v = remainders[i].value;
      baseAlloc.set(v, (baseAlloc.get(v) || 0) + 1);
      remaining--;
    }
    const out = {};
    for (const [k, v] of baseAlloc.entries()) {
      if (v > 0) out[parseFloat(k)] = v;
    }
    return out;
  }

  // 辅助：将 scaleFactor 按概率精确分配到三个分支（普通命中/暴击命中/失败）
  function allocateBranchCounts(total, probs) {
    const exacts = probs.map(p => (p || 0) * total);
    const bases = exacts.map(e => Math.floor(e));
    let assigned = bases.reduce((s, c) => s + c, 0);
    let remaining = total - assigned;
    const remainders = exacts.map((e, i) => ({ i, rem: e - Math.floor(e) }));
    remainders.sort((a, b) => (b.rem - a.rem) || (a.i - b.i));
    for (let j = 0; j < remainders.length && remaining > 0; j++) {
      bases[remainders[j].i] += 1;
      remaining--;
    }
    return bases; // [normal, critical, miss]
  }

  const result = {};

  // 先把三个分支的总数精确分配到 scaleFactor
  const [normalSuccessCount, criticalSuccessCount, failureCount] = allocateBranchCounts(scaleFactor, [
    conditionResult.normalSuccessProbability,
    conditionResult.criticalSuccessProbability,
    conditionResult.failureProbability
  ]);

  // 再将每个分支的 total 精确分配到各自的取值
  const normalAlloc = allocateCountsExactly(normalSuccessDist, normalSuccessCount);
  for (const [value, count] of Object.entries(normalAlloc)) {
    const val = parseFloat(value);
    result[val] = (result[val] || 0) + count;
  }

  const criticalAlloc = allocateCountsExactly(criticalSuccessDist, criticalSuccessCount);
  for (const [value, count] of Object.entries(criticalAlloc)) {
    const val = parseFloat(value);
    result[val] = (result[val] || 0) + count;
  }

  const failureAlloc = allocateCountsExactly(failureDist, failureCount);
  for (const [value, count] of Object.entries(failureAlloc)) {
    const val = parseFloat(value);
    result[val] = (result[val] || 0) + count;
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
