// 基础骰子 (NdM) 分布计算：纯函数，可在多处复用
// 返回一个对象：sum -> count（未归一化的计数分布）
export function calculateBasicDice(count, sides) {
  const result = {};

  function calculateMultipleDice(diceCount, diceSides, currentResult = { 0: 1 }) {
    if (diceCount === 0) return currentResult;

    const newResult = {};

    for (const [currentSum, currentCount] of Object.entries(currentResult)) {
      const sum = parseInt(currentSum);
      for (let diceValue = 1; diceValue <= diceSides; diceValue++) {
        const newSum = sum + diceValue;
        newResult[newSum] = (newResult[newSum] || 0) + currentCount;
      }
    }

    return calculateMultipleDice(diceCount - 1, diceSides, newResult);
  }

  return calculateMultipleDice(count, sides);
}
