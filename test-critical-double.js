import DiceCalculator from './src/lib/diceCalculator.js';

const calculator = new DiceCalculator();

console.log('=== 测试暴击翻倍表达式 ===');

// 测试用户指定的表达式
try {
  const result = calculator.calculate('d20>17?#1#:0', { criticalEnabled: true, criticalRate: 5 });
  console.log('表达式 d20>17?#1#:0 结果:', {
    distribution: result.distribution,
    average: result.average,
    totalOutcomes: result.totalOutcomes,
    hasNaN: Object.values(result.distribution).some(v => isNaN(v)),
    isConditionalCritical: result.isConditionalCritical,
    success: result.success
  });
  
  if (result.error) {
    console.error('计算错误:', result.error);
  }
} catch (error) {
  console.error('表达式错误:', error.message);
  console.error('错误堆栈:', error.stack);
}

// 测试更简单的版本
try {
  const result2 = calculator.calculate('d20>17?1:0', { criticalEnabled: true, criticalRate: 5 });
  console.log('表达式 d20>17?1:0 结果:', {
    distribution: result2.distribution,
    average: result2.average,
    totalOutcomes: result2.totalOutcomes,
    hasNaN: Object.values(result2.distribution).some(v => isNaN(v)),
    isConditionalCritical: result2.isConditionalCritical,
    success: result2.success
  });
} catch (error) {
  console.error('简单表达式错误:', error.message);
}