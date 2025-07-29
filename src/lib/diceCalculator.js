// 掷骰计算器核心逻辑

// 词法分析器 - 将输入字符串转换为Token序列
class Lexer {
  constructor(input) {
    this.input = input.replace(/\s+/g, ''); // 移除空格
    this.position = 0;
    this.tokens = [];
  }

  tokenize() {
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      
      if (this.isDigit(char)) {
        this.readNumber();
      } else if (this.isLetter(char)) {
        this.readIdentifier();
      } else if (char === '(') {
        this.tokens.push({ type: 'LPAREN', value: '(' });
        this.position++;
      } else if (char === ')') {
        this.tokens.push({ type: 'RPAREN', value: ')' });
        this.position++;
      } else if (char === '+') {
        this.tokens.push({ type: 'PLUS', value: '+' });
        this.position++;
      } else if (char === '-') {
        this.tokens.push({ type: 'MINUS', value: '-' });
        this.position++;
      } else if (char === '*') {
        this.tokens.push({ type: 'MULTIPLY', value: '*' });
        this.position++;
      } else if (char === '/') {
        this.tokens.push({ type: 'DIVIDE', value: '/' });
        this.position++;
      } else if (char === '>') {
        // 检查是否是 '>='
        if (this.position + 1 < this.input.length && this.input[this.position + 1] === '=') {
          this.tokens.push({ type: 'GTE', value: '>=' });
          this.position += 2;
        } else {
          this.tokens.push({ type: 'GT', value: '>' });
          this.position++;
        }
      } else if (char === '<') {
        // 检查是否是 '<='
        if (this.position + 1 < this.input.length && this.input[this.position + 1] === '=') {
          this.tokens.push({ type: 'LTE', value: '<=' });
          this.position += 2;
        } else {
          this.tokens.push({ type: 'LT', value: '<' });
          this.position++;
        }
      } else if (char === '=') {
        // 检查是否是 '=='
        if (this.position + 1 < this.input.length && this.input[this.position + 1] === '=') {
          this.tokens.push({ type: 'EQ', value: '==' });
          this.position += 2;
        } else {
          this.tokens.push({ type: 'EQ', value: '=' });
          this.position++;
        }
      } else {
        throw new Error(`未知字符: ${char}`);
      }
    }
    
    this.tokens.push({ type: 'EOF', value: null });
    return this.tokens;
  }

  isDigit(char) {
    return /\d/.test(char);
  }

  isLetter(char) {
    return /[a-zA-Z]/.test(char);
  }

  readNumber() {
    let number = '';
    while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
      number += this.input[this.position];
      this.position++;
    }
    
    // 检查数字后面是否跟着 'd'，如果是则解析为掷骰表达式
    if (this.position < this.input.length && this.input[this.position] === 'd') {
      this.position++; // 跳过 'd'
      
      // 读取骰子面数
      let sides = '';
      while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
        sides += this.input[this.position];
        this.position++;
      }
      
      if (sides === '') {
        throw new Error('d后面必须跟数字');
      }
      
      this.tokens.push({ 
        type: 'DICE', 
        value: { count: parseInt(number), sides: parseInt(sides) }
      });
    } else {
      // 普通数字
      this.tokens.push({ type: 'NUMBER', value: parseInt(number) });
    }
  }

  readIdentifier() {
    let identifier = '';
    while (this.position < this.input.length && 
           (this.isLetter(this.input[this.position]) || this.isDigit(this.input[this.position]))) {
      identifier += this.input[this.position];
      this.position++;
    }
    
    // 检查是否是掷骰表达式 (如 "2d6" 或 "d20")
    if (identifier.includes('d')) {
      const parts = identifier.split('d');
      if (parts.length === 2) {
        // 处理 "2d6" 格式
        if (parts[0] !== '' && parts[1] !== '' && parts.every(part => /^\d+$/.test(part))) {
          this.tokens.push({ 
            type: 'DICE', 
            value: { count: parseInt(parts[0]), sides: parseInt(parts[1]) }
          });
          return;
        }
        // 处理 "d20" 格式 (默认数量为1)
        if (parts[0] === '' && parts[1] !== '' && /^\d+$/.test(parts[1])) {
          this.tokens.push({ 
            type: 'DICE', 
            value: { count: 1, sides: parseInt(parts[1]) }
          });
          return;
        }
      }
    }
    
    // 检查是否是单独的'd'字符（用于处理像"d6"这样的表达式）
    if (identifier === 'd') {
      this.tokens.push({ type: 'D', value: 'd' });
      return;
    }
    
    // 检查是否是keep操作 (如 "kh", "kl", "k3h", "k3l")
    if (identifier.startsWith('k')) {
      const match = identifier.match(/^k(\d*)([hl])$/);
      if (match) {
        const count = match[1] ? parseInt(match[1]) : 1;
        const type = match[2] === 'h' ? 'highest' : 'lowest';
        this.tokens.push({ 
          type: 'KEEP', 
          value: { count, type }
        });
        return;
      }
    }
    
    throw new Error(`未知标识符: ${identifier}`);
  }
}

// 语法分析器 - 将Token序列转换为AST
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  parse() {
    const result = this.parseComparison();
    if (this.currentToken().type !== 'EOF') {
      throw new Error(`意外的token: ${this.currentToken().type}`);
    }
    return result;
  }

  parseComparison() {
    let left = this.parseExpression();
    
    while (this.currentToken().type === 'GT' || 
           this.currentToken().type === 'LT' || 
           this.currentToken().type === 'EQ' ||
           this.currentToken().type === 'GTE' ||
           this.currentToken().type === 'LTE') {
      const operator = this.currentToken().value;
      this.advance();
      const right = this.parseExpression();
      left = {
        type: 'comparison',
        operator,
        left,
        right
      };
    }
    
    return left;
  }

  parseExpression() {
    let left = this.parseTerm();
    
    while (this.currentToken().type === 'PLUS' || this.currentToken().type === 'MINUS') {
      const operator = this.currentToken().value;
      this.advance();
      const right = this.parseTerm();
      left = {
        type: 'binary_op',
        operator,
        left,
        right
      };
    }
    
    return left;
  }

  parseTerm() {
    let left = this.parseFactor();
    
    while (this.currentToken().type === 'MULTIPLY' || this.currentToken().type === 'DIVIDE') {
      const operator = this.currentToken().value;
      this.advance();
      const right = this.parseFactor();
      left = {
        type: 'binary_op',
        operator,
        left,
        right
      };
    }
    
    return left;
  }

  parseFactor() {
    const token = this.currentToken();
    
    if (token.type === 'NUMBER') {
      // 检查下一个token是否是'D'，如果是则解析为掷骰
      const nextToken = this.tokens[this.position + 1];
      if (nextToken && nextToken.type === 'D') {
        const count = token.value;
        this.advance(); // 跳过数字
        this.advance(); // 跳过'd'
        
        const sidesToken = this.currentToken();
        if (sidesToken.type === 'NUMBER') {
          const sides = sidesToken.value;
          this.advance();
          return {
            type: 'dice',
            count: count,
            sides: sides
          };
        } else {
          throw new Error('d后面必须跟数字');
        }
      }
      
      this.advance();
      return {
        type: 'number',
        value: token.value
      };
    }
    
    // 处理单独的'd'开头的掷骰（如d6表示1d6）
    if (token.type === 'D') {
      this.advance(); // 跳过'd'
      const sidesToken = this.currentToken();
      if (sidesToken.type === 'NUMBER') {
        const sides = sidesToken.value;
        this.advance();
        return {
          type: 'dice',
          count: 1,
          sides: sides
        };
      } else {
        throw new Error('d后面必须跟数字');
      }
    }
    
    if (token.type === 'DICE') {
      this.advance();
      return {
        type: 'dice',
        count: token.value.count,
        sides: token.value.sides
      };
    }
    
    if (token.type === 'KEEP') {
      const keepToken = token;
      this.advance();
      
      if (this.currentToken().type !== 'LPAREN') {
        throw new Error('Keep操作后必须跟括号');
      }
      this.advance(); // 跳过 '('
      
      const expression = this.parseExpression();
      
      if (this.currentToken().type !== 'RPAREN') {
        throw new Error('缺少右括号');
      }
      this.advance(); // 跳过 ')'
      
      return {
        type: 'keep',
        count: keepToken.value.count,
        keepType: keepToken.value.type,
        expression
      };
    }
    
    if (token.type === 'LPAREN') {
      this.advance(); // 跳过 '('
      const expression = this.parseComparison(); // 改为parseComparison以支持比较操作
      
      if (this.currentToken().type !== 'RPAREN') {
        throw new Error('缺少右括号');
      }
      this.advance(); // 跳过 ')'
      
      return expression;
    }
    
    throw new Error(`意外的token: ${token.type}`);
  }

  currentToken() {
    return this.tokens[this.position];
  }

  advance() {
    this.position++;
  }
}

// 掷骰结果计算器
class DiceCalculator {
  // 计算基本掷骰 (NdM)
  calculateBasicDice(count, sides) {
    const result = {};
    
    // 递归计算多个骰子的结果分布
    function calculateMultipleDice(diceCount, diceSides, currentResult = { 0: 1 }) {
      if (diceCount === 0) return currentResult;
      
      const newResult = {};
      
      // 对于当前结果的每个值
      for (const [currentSum, currentCount] of Object.entries(currentResult)) {
        const sum = parseInt(currentSum);
        
        // 对于新骰子的每个可能值
        for (let diceValue = 1; diceValue <= diceSides; diceValue++) {
          const newSum = sum + diceValue;
          newResult[newSum] = (newResult[newSum] || 0) + currentCount;
        }
      }
      
      return calculateMultipleDice(diceCount - 1, diceSides, newResult);
    }
    
    return calculateMultipleDice(count, sides);
  }

  // 计算Keep操作 (取最高/最低)
  calculateKeep(expression, keepCount, keepType) {
    const baseResult = this.evaluate(expression);
    
    // 如果基础表达式不是掷骰，直接返回
    if (expression.type !== 'dice') {
      return baseResult;
    }
    
    const { count, sides } = expression;
    const result = {};
    
    // 生成所有可能的掷骰组合
    function generateCombinations(diceCount, diceSides) {
      if (diceCount === 1) {
        return Array.from({ length: diceSides }, (_, i) => [i + 1]);
      }
      
      const smallerCombinations = generateCombinations(diceCount - 1, diceSides);
      const combinations = [];
      
      for (let value = 1; value <= diceSides; value++) {
        for (const combo of smallerCombinations) {
          combinations.push([value, ...combo]);
        }
      }
      
      return combinations;
    }
    
    const allCombinations = generateCombinations(count, sides);
    
    // 对每个组合应用keep规则
    for (const combination of allCombinations) {
      const sorted = [...combination].sort((a, b) => keepType === 'highest' ? b - a : a - b);
      const kept = sorted.slice(0, keepCount);
      const sum = kept.reduce((acc, val) => acc + val, 0);
      
      result[sum] = (result[sum] || 0) + 1;
    }
    
    return result;
  }

  // 计算比较操作
  calculateComparison(left, right, operator) {
    const leftResult = this.evaluate(left);
    const rightResult = this.evaluate(right);
    
    let successCount = 0;
    let totalCount = 0;
    
    // 如果右边是单个数值（不是分布），简化计算
    if (Object.keys(rightResult).length === 1 && Object.keys(rightResult)[0] !== undefined) {
      const rightValue = parseInt(Object.keys(rightResult)[0]);
      
      for (const [leftValue, leftCount] of Object.entries(leftResult)) {
        const leftVal = parseInt(leftValue);
        totalCount += leftCount;
        
        let success = false;
        switch (operator) {
          case '>':
            success = leftVal > rightValue;
            break;
          case '<':
            success = leftVal < rightValue;
            break;
          case '=':
            success = leftVal === rightValue;
            break;
          case '>=':
            success = leftVal >= rightValue;
            break;
          case '<=':
            success = leftVal <= rightValue;
            break;
        }
        
        if (success) {
          successCount += leftCount;
        }
      }
    } else {
      // 完整的分布比较
      for (const [leftValue, leftCount] of Object.entries(leftResult)) {
        for (const [rightValue, rightCount] of Object.entries(rightResult)) {
          const leftVal = parseInt(leftValue);
          const rightVal = parseInt(rightValue);
          const combinationCount = leftCount * rightCount;
          
          totalCount += combinationCount;
          
          let success = false;
          switch (operator) {
            case '>':
              success = leftVal > rightVal;
              break;
            case '<':
              success = leftVal < rightVal;
              break;
            case '=':
              success = leftVal === rightVal;
              break;
            case '>=':
              success = leftVal >= rightVal;
              break;
            case '<=':
              success = leftVal <= rightVal;
              break;
          }
          
          if (success) {
            successCount += combinationCount;
          }
        }
      }
    }
    
    // 返回成功概率和失败概率的分布
    const successProbability = totalCount > 0 ? successCount / totalCount : 0;
    const failureProbability = totalCount > 0 ? (totalCount - successCount) / totalCount : 1;
    
    return {
      type: 'probability',
      successProbability,
      failureProbability,
      successCount,
      totalCount,
      // 也保留原有的1/0分布用于兼容性
      distribution: {
        1: successCount,
        0: totalCount - successCount
      }
    };
  }

  // 计算二元运算
  calculateBinaryOp(left, right, operator) {
    const leftResult = this.evaluate(left);
    const rightResult = this.evaluate(right);
    
    // 检查是否有概率类型的结果
    const leftIsProbability = leftResult.type === 'probability';
    const rightIsProbability = rightResult.type === 'probability';
    
    if (leftIsProbability && !rightIsProbability) {
      // 左边是概率，右边是数值分布
      return this.calculateProbabilityOperation(leftResult, rightResult, operator, 'left');
    } else if (!leftIsProbability && rightIsProbability) {
      // 左边是数值分布，右边是概率
      return this.calculateProbabilityOperation(rightResult, leftResult, operator, 'right');
    } else if (leftIsProbability && rightIsProbability) {
      // 两边都是概率 - 概率相乘
      if (operator === '*') {
        const newSuccessProbability = leftResult.successProbability * rightResult.successProbability;
        const totalOutcomes = leftResult.totalCount * rightResult.totalCount;
        const successOutcomes = Math.round(newSuccessProbability * totalOutcomes);
        
        return {
          type: 'probability',
          successProbability: newSuccessProbability,
          failureProbability: 1 - newSuccessProbability,
          successCount: successOutcomes,
          totalCount: totalOutcomes,
          distribution: {
            1: successOutcomes,
            0: totalOutcomes - successOutcomes
          }
        };
      }
      // 对于其他操作，转换为普通分布计算
      return this.calculateNormalBinaryOp(leftResult.distribution, rightResult.distribution, operator);
    } else {
      // 都是普通数值分布
      const leftDist = leftResult.distribution || leftResult;
      const rightDist = rightResult.distribution || rightResult;
      return this.calculateNormalBinaryOp(leftDist, rightDist, operator);
    }
  }

  // 计算概率与数值的运算
  calculateProbabilityOperation(probabilityResult, valueResult, operator, probabilityPosition) {
    if (operator !== '*') {
      // 对于非乘法操作，转换为普通分布计算
      return this.calculateNormalBinaryOp(probabilityResult.distribution, valueResult, operator);
    }
    
    // 概率乘法：结果是期望值的分布
    const valueDist = valueResult.distribution || valueResult;
    const result = {};
    
    // 计算期望值分布
    for (const [value, count] of Object.entries(valueDist)) {
      const val = parseInt(value);
      const expectedValue = val * probabilityResult.successProbability;
      const scaledCount = count;
      
      // 将期望值四舍五入到最近的整数或保留小数
      const roundedExpectedValue = Math.round(expectedValue * 100) / 100;
      
      result[roundedExpectedValue] = (result[roundedExpectedValue] || 0) + scaledCount;
    }
    
    return result;
  }

  // 普通的二元运算计算
  calculateNormalBinaryOp(leftResult, rightResult, operator) {
    const result = {};
    
    for (const [leftValue, leftCount] of Object.entries(leftResult)) {
      for (const [rightValue, rightCount] of Object.entries(rightResult)) {
        const leftVal = parseFloat(leftValue);
        const rightVal = parseFloat(rightValue);
        const combinationCount = leftCount * rightCount;
        
        let newValue;
        switch (operator) {
          case '+':
            newValue = leftVal + rightVal;
            break;
          case '-':
            newValue = leftVal - rightVal;
            break;
          case '*':
            newValue = leftVal * rightVal;
            break;
          case '/':
            newValue = rightVal !== 0 ? leftVal / rightVal : 0;
            break;
          default:
            throw new Error(`未知运算符: ${operator}`);
        }
        
        // 四舍五入到合理精度
        newValue = Math.round(newValue * 100) / 100;
        result[newValue] = (result[newValue] || 0) + combinationCount;
      }
    }
    
    return result;
  }

  // 评估AST节点
  evaluate(node) {
    switch (node.type) {
      case 'number':
        return { [node.value]: 1 };
        
      case 'dice':
        return this.calculateBasicDice(node.count, node.sides);
        
      case 'keep':
        return this.calculateKeep(node.expression, node.count, node.keepType);
        
      case 'comparison':
        return this.calculateComparison(node.left, node.right, node.operator);
        
      case 'binary_op':
        return this.calculateBinaryOp(node.left, node.right, node.operator);
        
      default:
        throw new Error(`未知节点类型: ${node.type}`);
    }
  }

  // 计算平均值（支持概率类型）
  calculateAverage(result) {
    if (result.type === 'probability') {
      // 对于概率类型，返回成功概率
      return result.successProbability;
    }
    
    const distribution = result.distribution || result;
    let totalSum = 0;
    let totalCount = 0;
    
    for (const [value, count] of Object.entries(distribution)) {
      totalSum += parseFloat(value) * count;
      totalCount += count;
    }
    
    return totalCount > 0 ? totalSum / totalCount : 0;
  }

  // 主要计算函数
  calculate(formula) {
    try {
      const lexer = new Lexer(formula);
      const tokens = lexer.tokenize();
      
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      const result = this.evaluate(ast);
      const average = this.calculateAverage(result);
      
      // 处理不同类型的结果
      if (result.type === 'probability') {
        return {
          distribution: result.distribution,
          average,
          totalOutcomes: result.totalCount,
          success: true,
          isProbability: true,
          successProbability: result.successProbability,
          successCount: result.successCount,
          probabilityPercentage: (result.successProbability * 100).toFixed(2) + '%'
        };
      } else {
        const distribution = result.distribution || result;
        const totalOutcomes = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        
        return {
          distribution,
          average,
          totalOutcomes,
          success: true,
          isProbability: false
        };
      }
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

export default DiceCalculator;

