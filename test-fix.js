// 测试修复后的骰子计算器
import DiceCalculator from './src/lib/diceCalculator.js';

const calculator = new DiceCalculator();

console.log('测试 d20 公式:');
const result = calculator.calculate('d20');
console.log('结果:', result);

if (result.success) {
  console.log('✅ d20 公式解析成功!');
  console.log('分布:', Object.keys(result.distribution).slice(0, 5), '...(共', Object.keys(result.distribution).length, '个结果)');
  console.log('平均值:', result.average);
  console.log('总可能性:', result.totalOutcomes);
} else {
  console.log('❌ d20 公式解析失败:', result.error);
}

// 测试其他相关公式
const testCases = ['2d6', '1d20', 'd6', 'kh(2d20)', 'd20>15'];

testCases.forEach(formula => {
  console.log(`\n测试 ${formula}:`);
  const testResult = calculator.calculate(formula);
  if (testResult.success) {
    console.log('✅ 成功');
  } else {
    console.log('❌ 失败:', testResult.error);
  }
});
