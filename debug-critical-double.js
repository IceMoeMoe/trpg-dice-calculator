import DiceCalculator from './src/lib/diceCalculator.js';

// 创建计算器实例
const calculator = new DiceCalculator();

// 测试表达式
try {
  console.log('=== 调试表达式: d20>17?#1#:0 ===');
  
  // 计算结果（启用暴击）
  const result = calculator.calculate('d20>17?#1#:0', {
    criticalEnabled: true,
    criticalRate: 5
  });
  
  console.log('计算结果:', JSON.stringify(result, null, 2));
  
  // 检查是否有NaN
  console.log('hasNaN:', Object.keys(result.distribution || {}).some(key => isNaN(parseFloat(key))));
  
  // 计算总结果数
  const totalOutcomes = Object.values(result.distribution || {}).reduce((sum, count) => sum + count, 0);
  console.log('totalOutcomes:', totalOutcomes);
  
  // 检查暴击相关字段
  console.log('type:', result.type);
  console.log('normalHitValues:', result.normalHitValues);
  console.log('criticalHitValues:', result.criticalHitValues);
  console.log('missValues:', result.missValues);
  
  // 检查distribution内容
  console.log('distribution:', result.distribution);
  
} catch (error) {
  console.error('错误:', error);
  console.error('堆栈:', error.stack);
}