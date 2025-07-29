// 测试复杂表达式功能
import DiceCalculator from './src/lib/diceCalculator.js';

const calculator = new DiceCalculator();

console.log('=== 测试复杂掷骰表达式 ===\n');

// 测试用例
const testCases = [
  {
    name: '基础概率乘法',
    formula: '((d20+6)>14)*(2d6+4)',
    description: 'd20+6大于14的概率 乘以 2d6+4的结果'
  },
  {
    name: '简单比较',
    formula: '(d20+6)>14',
    description: 'd20+6大于14的概率'
  },
  {
    name: '基础掷骰',
    formula: '2d6+4',
    description: '2d6+4的结果分布'
  },
  {
    name: '更复杂的比较',
    formula: '(3d6)>=15',
    description: '3d6大于等于15的概率'
  },
  {
    name: '概率相加',
    formula: '((d20)>15)+((d20)>10)',
    description: '两个概率相加'
  },
  {
    name: '嵌套括号',
    formula: '((d20+5)>14)*((2d6+3)>8)',
    description: '两个条件概率相乘'
  }
];

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`公式: ${testCase.formula}`);
  console.log(`说明: ${testCase.description}`);
  
  try {
    const result = calculator.calculate(testCase.formula);
    
    if (result.success) {
      console.log('✅ 计算成功');
      console.log(`平均值: ${result.average.toFixed(4)}`);
      console.log(`总结果数: ${result.totalOutcomes}`);
      
      if (result.isProbability) {
        console.log(`✨ 这是概率结果`);
        console.log(`成功概率: ${result.probabilityPercentage}`);
        console.log(`成功次数: ${result.successCount}/${result.totalOutcomes}`);
      }
      
      // 显示前几个结果
      const sortedResults = Object.entries(result.distribution)
        .map(([value, count]) => [parseFloat(value), count])
        .sort((a, b) => a[0] - b[0])
        .slice(0, 10);
      
      console.log('分布 (前10个结果):');
      sortedResults.forEach(([value, count]) => {
        const probability = (count / result.totalOutcomes * 100).toFixed(2);
        console.log(`  ${value}: ${count} 次 (${probability}%)`);
      });
    } else {
      console.log('❌ 计算失败');
      console.log(`错误: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ 程序错误');
    console.log(`错误: ${error.message}`);
  }
  
  console.log('─'.repeat(50));
  console.log('');
});
