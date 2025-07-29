// 测试修复后的骰子计算器
import DiceCalculator from './src/lib/diceCalculator.js';

const calculator = new DiceCalculator();

// 测试各种掷骰格式
const testCases = [
  '2d6',
  '1d20', 
  'd20',
  '3d8',
  '4d6',
  '2d10+5',
  'kh(2d20)'
];

console.log('测试掷骰公式解析：\n');

testCases.forEach(formula => {
  console.log(`测试 "${formula}":`);
  const result = calculator.calculate(formula);
  if (result.success) {
    console.log(`✅ 成功 - 平均值: ${result.average.toFixed(2)}, 总可能性: ${result.totalOutcomes}`);
  } else {
    console.log(`❌ 失败: ${result.error}`);
  }
  console.log('---');
});

// 详细测试2d6
console.log('\n详细测试 2d6:');
const result2d6 = calculator.calculate('2d6');
if (result2d6.success) {
  console.log('分布:', result2d6.distribution);
  console.log('平均值:', result2d6.average);
}
