import DiceCalculator from './src/lib/diceCalculator.js';

const calculator = new DiceCalculator();

// 测试高暴击率下是否出现NaN问题
console.log('=== 测试高暴击率下的NaN问题 ===');

const testCases = [
  { formula: 'd20>17?#1#:0', criticalRate: 50 },
  { formula: 'd20>15?#5#:0', criticalRate: 30 },
  { formula: 'd20>10?#10#:0', criticalRate: 20 },
  { formula: 'd20>5?#20#:0', criticalRate: 10 }
];

testCases.forEach(({ formula, criticalRate }) => {
  try {
    console.log(`\n测试表达式: ${formula} (暴击率: ${criticalRate}%)`);
    
    const result = calculator.calculate(formula, {
      criticalEnabled: true,
      criticalRate
    });
    
    // 检查是否有NaN值
    const hasNaNKeys = Object.keys(result.distribution || {}).some(key => isNaN(parseFloat(key)));
    const hasNaNValues = Object.values(result.distribution || {}).some(value => isNaN(value));
    
    console.log(`结果数: ${result.totalOutcomes}`);
    console.log(`平均值: ${result.average}`);
    console.log(`是否有NaN键: ${hasNaNKeys}`);
    console.log(`是否有NaN值: ${hasNaNValues}`);
    console.log(`分布:`, result.distribution);
    
    if (hasNaNKeys || hasNaNValues) {
      console.log('❌ 发现NaN问题！');
    } else {
      console.log('✅ 无NaN问题');
    }
    
  } catch (error) {
    console.error(`错误: ${error.message}`);
    console.error(error.stack);
  }
});