import DiceCalculator from './src/lib/diceCalculator.js';

const calculator = new DiceCalculator();

console.log('=== 测试暴击计算 ===');

// 测试1: 高暴击率的条件表达式
const result1 = calculator.calculate('d20>10?5:0', { criticalEnabled: true, criticalRate: 50 });
console.log('条件表达式(50%暴击率):', {
  distribution: result1.distribution,
  average: result1.average,
  totalOutcomes: result1.totalOutcomes,
  hasNaN: Object.values(result1.distribution).some(v => isNaN(v)),
  isConditionalCritical: result1.isConditionalCritical
});

// 测试2: 简单骰子
const result2 = calculator.calculate('d20', { criticalEnabled: true, criticalRate: 10 });
console.log('简单骰子(10%暴击率):', {
  distribution: result2.distribution,
  average: result2.average,
  totalOutcomes: result2.totalOutcomes,
  hasNaN: Object.values(result2.distribution).some(v => isNaN(v)),
  isCritical: result2.isCritical
});

// 测试3: 检查是否包含暴击字段
if (result1.isConditionalCritical) {
  console.log('条件表达式暴击字段:', {
    normalHitValues: result1.normalHitValues,
    criticalHitValues: result1.criticalHitValues,
    missValues: result1.missValues,
    probabilities: result1.probabilities
  });
}