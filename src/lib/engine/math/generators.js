// 单骰结果生成器（重骰、爆骰、爆骰求和），保持与原逻辑一致

// 生成单个骰子的重骰结果分布（整数计数）
export function generateSingleDiceRerollOutcomes(sides, minReroll, maxReroll, maxRerollCount) {
  const outcomes = {};
  function calculateWithRerolls(currentValue, rerollsUsed, probability) {
    if (currentValue < minReroll || currentValue > maxReroll || rerollsUsed >= maxRerollCount) {
      outcomes[currentValue] = (outcomes[currentValue] || 0) + probability;
      return;
    }
    const newProbability = probability / sides;
    for (let newValue = 1; newValue <= sides; newValue++) {
      calculateWithRerolls(newValue, rerollsUsed + 1, newProbability);
    }
  }
  for (let initialValue = 1; initialValue <= sides; initialValue++) {
    calculateWithRerolls(initialValue, 0, 1);
  }
  const scaleFactor = Math.pow(sides, maxRerollCount + 2);
  const integerOutcomes = {};
  for (const [value, probability] of Object.entries(outcomes)) {
    const count = Math.round(probability * scaleFactor);
    if (count > 0) integerOutcomes[value] = count;
  }
  return integerOutcomes;
}

// 生成单个骰子的爆骰（成功计数）结果分布
export function generateSingleDiceExplodingOutcomes(sides, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions) {
  const outcomes = {};
  function calculateWithExplosions(currentSuccesses, explosionsUsed, probability) {
    const baseProbability = 1 / sides;
    for (let rollValue = 1; rollValue <= sides; rollValue++) {
      const isSuccess = rollValue >= minSuccess && rollValue <= maxSuccess;
      let shouldExplode = false;
      if (minExplode !== null && maxExplode !== null) {
        shouldExplode = rollValue >= minExplode && rollValue <= maxExplode && explosionsUsed < maxExplosions;
      } else if (minExplode !== null) {
        shouldExplode = rollValue === minExplode && explosionsUsed < maxExplosions;
      }
      const newSuccesses = currentSuccesses + (isSuccess ? 1 : 0);
      const newProbability = probability * baseProbability;
      if (shouldExplode) {
        calculateWithExplosions(newSuccesses, explosionsUsed + 1, newProbability);
      }
      outcomes[newSuccesses] = (outcomes[newSuccesses] || 0) + newProbability;
    }
  }
  calculateWithExplosions(0, 0, 1);
  const scaleFactor = Math.pow(sides, Math.min(maxExplosions + 2, 10));
  const integerOutcomes = {};
  for (const [successes, probability] of Object.entries(outcomes)) {
    const count = Math.round(probability * scaleFactor);
    if (count > 0) integerOutcomes[successes] = count;
  }
  return integerOutcomes;
}

// 生成单个骰子的爆骰求和值结果分布
export function generateSingleDiceExplodingSumOutcomes(sides, minExplode, maxExplode, maxExplosions) {
  const outcomes = {};
  function calculateWithExplosions(currentSum, explosionsUsed, probability) {
    const baseProbability = 1 / sides;
    for (let rollValue = 1; rollValue <= sides; rollValue++) {
      const shouldExplode = rollValue >= minExplode && rollValue <= maxExplode && explosionsUsed < maxExplosions;
      const newSum = currentSum + rollValue;
      const newProbability = probability * baseProbability;
      if (shouldExplode) {
        calculateWithExplosions(newSum, explosionsUsed + 1, newProbability);
      }
      outcomes[newSum] = (outcomes[newSum] || 0) + newProbability;
    }
  }
  calculateWithExplosions(0, 0, 1);
  const scaleFactor = Math.pow(sides, Math.min(maxExplosions + 2, 10));
  const integerOutcomes = {};
  for (const [sum, probability] of Object.entries(outcomes)) {
    const count = Math.round(probability * scaleFactor);
    if (count > 0) integerOutcomes[sum] = count;
  }
  return integerOutcomes;
}
