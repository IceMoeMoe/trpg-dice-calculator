// 简化版掷骰计算器 - 专注于基本功能

class SimpleDiceCalculator {
  // 计算基本掷骰 (NdM)
  calculateBasicDice(count, sides) {
    const result = {};
    
    // 使用动态规划计算多个骰子的结果分布
    let currentDistribution = { 0: 1 }; // 初始状态：0个骰子，结果为0，概率为1
    
    for (let i = 0; i < count; i++) {
      const newDistribution = {};
      
      for (const [currentSum, currentCount] of Object.entries(currentDistribution)) {
        const sum = parseInt(currentSum);
        
        for (let diceValue = 1; diceValue <= sides; diceValue++) {
          const newSum = sum + diceValue;
          newDistribution[newSum] = (newDistribution[newSum] || 0) + currentCount;
        }
      }
      
      currentDistribution = newDistribution;
    }
    
    return currentDistribution;
  }

  // 解析简单的掷骰表达式
  parseSimpleDice(formula) {
    // 移除空格
    formula = formula.replace(/\s+/g, '');
    
    // 匹配 NdM 格式
    const diceMatch = formula.match(/^(\d+)d(\d+)$/);
    if (diceMatch) {
      return {
        type: 'dice',
        count: parseInt(diceMatch[1]),
        sides: parseInt(diceMatch[2])
      };
    }
    
    // 匹配 dM 格式 (等同于 1dM)
    const singleDiceMatch = formula.match(/^d(\d+)$/);
    if (singleDiceMatch) {
      return {
        type: 'dice',
        count: 1,
        sides: parseInt(singleDiceMatch[1])
      };
    }
    
    // 匹配数字
    const numberMatch = formula.match(/^(\d+)$/);
    if (numberMatch) {
      return {
        type: 'number',
        value: parseInt(numberMatch[1])
      };
    }
    
    throw new Error(`无法解析公式: ${formula}`);
  }

  // 计算平均值
  calculateAverage(distribution) {
    let totalSum = 0;
    let totalCount = 0;
    
    for (const [value, count] of Object.entries(distribution)) {
      totalSum += parseInt(value) * count;
      totalCount += count;
    }
    
    return totalCount > 0 ? totalSum / totalCount : 0;
  }

  // 主要计算函数
  calculate(formula) {
    try {
      const parsed = this.parseSimpleDice(formula);
      
      let distribution;
      
      if (parsed.type === 'dice') {
        distribution = this.calculateBasicDice(parsed.count, parsed.sides);
      } else if (parsed.type === 'number') {
        distribution = { [parsed.value]: 1 };
      } else {
        throw new Error('未知的表达式类型');
      }
      
      const average = this.calculateAverage(distribution);
      const totalOutcomes = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      
      return {
        distribution,
        average,
        totalOutcomes,
        success: true
      };
    } catch (error) {
      return {
        distribution: {},
        average: 0,
        totalOutcomes: 0,
        success: false,
        error: error.message
      };
    }
  }
}

export default SimpleDiceCalculator;

