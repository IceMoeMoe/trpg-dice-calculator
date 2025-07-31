import DiceCalculator from './src/lib/diceCalculator.js';

const calculator = new DiceCalculator();

console.log('=== 测试字段名映射修复 ===');

const testCases = [
  { formula: 'd20>17?#1#:0', criticalRate: 50 },
  { formula: 'd20>15?5:0', criticalRate: 30 }
];

testCases.forEach(({ formula, criticalRate }) => {
  try {
    console.log(`\n测试: ${formula} (暴击率: ${criticalRate}%)`);
    
    const result = calculator.calculate(formula, {
      criticalEnabled: true,
      criticalRate
    });
    
    console.log('返回的probabilities:', result.probabilities);
    
    // 检查字段名是否正确
    const hasCorrectFields = 
      'normalHit' in result.probabilities &&
      'criticalHit' in result.probabilities &&
      'miss' in result.probabilities;
    
    console.log('字段名是否正确:', hasCorrectFields);
    
    // 检查是否有NaN值
    const hasNaN = Object.values(result.probabilities).some(v => isNaN(v));
    console.log('是否有NaN值:', hasNaN);
    
    // 显示百分比
    console.log('普通命中:', (result.probabilities.normalHit * 100).toFixed(2) + '%');
    console.log('暴击命中:', (result.probabilities.criticalHit * 100).toFixed(2) + '%');
    console.log('失败:', (result.probabilities.miss * 100).toFixed(2) + '%');
    
  } catch (error) {
    console.error('错误:', error.message);
  }
});