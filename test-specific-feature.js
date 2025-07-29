// 专门测试你要求的功能：((d20+6)>14)*(2d6+4)
import DiceCalculator from './src/lib/diceCalculator.js';

const calculator = new DiceCalculator();

console.log('=== 专项测试：((d20+6)>14)*(2d6+4) ===\n');

// 分步测试
console.log('1. 测试 d20+6 的分布:');
const step1 = calculator.calculate('d20+6');
console.log(`平均值: ${step1.average}`);
console.log(`范围: 7-26`);

console.log('\n2. 测试 (d20+6)>14 的概率:');
const step2 = calculator.calculate('(d20+6)>14');
console.log(`成功概率: ${step2.probabilityPercentage}`);
console.log(`解释: d20+6的结果范围是7-26，大于14的结果是15-26，共12个值`);
console.log(`概率计算: 12/20 = 60%`);

console.log('\n3. 测试 2d6+4 的分布:');
const step3 = calculator.calculate('2d6+4');
console.log(`平均值: ${step3.average}`);
console.log(`范围: 6-16`);
console.log('分布详情:');
Object.entries(step3.distribution)
  .map(([value, count]) => [parseInt(value), count])
  .sort((a, b) => a[0] - b[0])
  .forEach(([value, count]) => {
    const probability = (count / step3.totalOutcomes * 100).toFixed(2);
    console.log(`  ${value}: ${count}/36 (${probability}%)`);
  });

console.log('\n4. 测试完整表达式 ((d20+6)>14)*(2d6+4):');
const finalResult = calculator.calculate('((d20+6)>14)*(2d6+4)');
console.log(`平均值: ${finalResult.average.toFixed(4)}`);
console.log(`解释: 这个结果是期望值，计算方式是:`);
console.log(`  对于2d6+4的每个可能结果，乘以60%的概率`);
console.log(`  例如: 结果6的期望值 = 6 * 0.6 = 3.6`);
console.log(`        结果11的期望值 = 11 * 0.6 = 6.6`);

console.log('\n期望值分布:');
Object.entries(finalResult.distribution)
  .map(([value, count]) => [parseFloat(value), count])
  .sort((a, b) => a[0] - b[0])
  .forEach(([value, count]) => {
    const probability = (count / finalResult.totalOutcomes * 100).toFixed(2);
    const originalValue = value / 0.6; // 反推原始值
    console.log(`  ${value}: ${count}/36 (${probability}%) [来自原始值 ${originalValue.toFixed(1)}]`);
  });

console.log('\n总体统计:');
console.log(`总的期望值: ${finalResult.average.toFixed(4)}`);
console.log(`理论验证: 2d6+4的期望值是11，乘以60%概率 = ${(11 * 0.6).toFixed(1)}`);

// 额外测试：不同条件的概率乘法
console.log('\n=== 额外测试：不同难度的检定 ===');

const extraTests = [
  {
    formula: '((d20+6)>10)*(2d6+4)',
    description: '简单检定 (DC10)'
  },
  {
    formula: '((d20+6)>15)*(3d6)',
    description: '困难检定 (DC15) 乘以 3d6伤害'
  },
  {
    formula: '((d20+6)>20)*(4d6+2)',
    description: '极难检定 (DC20) 乘以 4d6+2伤害'
  }
];

extraTests.forEach(test => {
  console.log(`\n${test.description}:`);
  console.log(`公式: ${test.formula}`);
  const result = calculator.calculate(test.formula);
  if (result.success) {
    console.log(`期望伤害: ${result.average.toFixed(4)}`);
    
    // 计算基础概率
    const conditionFormula = test.formula.split('*')[0];
    const conditionResult = calculator.calculate(conditionFormula);
    console.log(`成功概率: ${conditionResult.probabilityPercentage}`);
  }
});
