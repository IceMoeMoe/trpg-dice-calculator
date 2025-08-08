// 语法分析器 - 将Token序列转换为AST（从 diceCalculator.js 抽离，无行为改动）
export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
    this.diceIdCounter = 1; // 骰子ID计数器
    this.diceRegistry = new Map(); // 骰子注册表：id -> dice definition
    this.enableDiceReuse = false; // 是否启用骰子复用模式
  }

  parse() {
    // 首先检查tokens中是否包含骰子引用
    const hasDiceReferences = this.tokens.some(token => token.type === 'DICE_REF');
    
    if (hasDiceReferences) {
      // 如果有骰子引用，则启用骰子复用模式
      this.enableDiceReuse = true;
    }
    
    const result = this.parseConditional();
    if (this.currentToken().type !== 'EOF') {
      throw new Error(`意外的token: ${this.currentToken().type}`);
    }
    return {
      ast: result,
      diceRegistry: this.diceRegistry
    };
  }

  parseConditional() {
    let expression = this.parseComparison();
    
    // 检查是否是条件表达式 (condition ? valueIfTrue : valueIfFalse)
    if (this.currentToken().type === 'QUESTION') {
      this.advance(); // 跳过 '?'
      // 支持在条件表达式的真值和假值部分解析暴击表达式和嵌套条件
      const trueValue = this.parseConditional();
      
      if (this.currentToken().type !== 'COLON') {
        throw new Error('条件表达式中缺少 ":"');
      }
      this.advance(); // 跳过 ':'
      
      const falseValue = this.parseConditional();
      
      // 验证条件是否为比较表达式
      if (expression.type !== 'comparison') {
        throw new Error('条件表达式的条件部分必须是比较操作（如 d20+6 >= 17）');
      }
      
      return {
        type: 'conditional',
        condition: expression,
        trueValue,
        falseValue
      };
    }
    
    return expression;
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

  // 解析支持重骰的表达式（用于keep操作内部）
  parseRerollExpression() {
    let left = this.parseExpression();
    
    // 在表达式解析完成后，检查是否有重骰操作
    if (this.currentToken().type === 'REROLL' || this.currentToken().type === 'R') {
      return this.parseReroll(left);
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
    let diceNode = this.parseCritical();
    
    // 检查是否有重骰操作
    if (this.currentToken().type === 'REROLL' || this.currentToken().type === 'R') {
      diceNode = this.parseReroll(diceNode);
    }
    
    // 检查是否有爆炸骰操作
    if (this.currentToken().type === 'EXPLODING') {
      return this.parseExploding(diceNode);
    }
    
    // 检查是否有总和型爆炸骰操作
    if (this.currentToken().type === 'EXPLODING_SUM') {
      return this.parseExplodingSum(diceNode);
    }
    
    return diceNode;
  }
  
  parseCritical() {
    const token = this.currentToken();
    
    // 解析 #表达式# (暴击翻倍)
    if (token.type === 'HASH') {
      this.advance(); // 跳过第一个 #
      const expression = this.parseExpression();
      
      if (this.currentToken().type !== 'HASH') {
        throw new Error('暴击翻倍表达式缺少结束的 #');
      }
      this.advance(); // 跳过第二个 #
      
      return {
        type: 'critical_double',
        expression
      };
    }
    
    // 解析 |普通表达式|暴击表达式| (暴击切换)
    if (token.type === 'PIPE') {
      this.advance(); // 跳过第一个 |
      const normalExpression = this.parseExpression();
      
      if (this.currentToken().type !== 'PIPE') {
        throw new Error('暴击切换表达式缺少中间的 |');
      }
      this.advance(); // 跳过中间的 |
      
      const criticalExpression = this.parseExpression();
      
      if (this.currentToken().type !== 'PIPE') {
        throw new Error('暴击切换表达式缺少结束的 |');
      }
      this.advance(); // 跳过最后的 |
      
      return {
        type: 'critical_switch',
        normalExpression,
        criticalExpression
      };
    }
    
    // 解析 [表达式] (仅暴击时)
    if (token.type === 'LBRACKET') {
      this.advance(); // 跳过 [
      const expression = this.parseExpression();
      
      if (this.currentToken().type !== 'RBRACKET') {
        throw new Error('暴击专用表达式缺少结束的 ]');
      }
      this.advance(); // 跳过 ]
      
      return {
        type: 'critical_only',
        expression
      };
    }
    
    return this.parseDice();
  }
  
  parseDice() {
    const token = this.currentToken();
    
    // 解析函数调用
    if (token.type === 'FUNCTION') {
      return this.parseFunction();
    }
    
    if (token.type === 'NUMBER') {
      // 检查下一个token是否是'd'或'D'，如果是则解析为掷骰
      const nextToken = this.tokens[this.position + 1];
      if (nextToken && (nextToken.type === 'd' || nextToken.type === 'D')) {
        const count = token.value;
        const isCriticalDice = nextToken.type === 'D';
        this.advance(); // 跳过数字
        this.advance(); // 跳过'd'或'D'
        
        const sidesToken = this.currentToken();
        if (sidesToken.type === 'NUMBER') {
          const sides = sidesToken.value;
          this.advance();
          
          // 在骰子复用模式下，每个骰子都需要独立的ID
          if (this.enableDiceReuse) {
            const diceId = this.diceIdCounter++;
            const diceDefinition = {
              count: count,
              sides: sides,
              isCriticalDice: isCriticalDice
            };
            
            // 注册骰子
            this.diceRegistry.set(diceId, diceDefinition);
            
            return {
              type: 'dice',
              id: diceId,
              count: count,
              sides: sides,
              isCriticalDice: isCriticalDice
            };
          } else {
            // 普通模式，不分配ID
            return {
              type: 'dice',
              count: count,
              sides: sides,
              isCriticalDice: isCriticalDice
            };
          }
        } else {
          throw new Error(`${nextToken.value}后面必须跟数字`);
        }
      }
      
      this.advance();
      return {
        type: 'number',
        value: token.value
      };
    }
    
    // 处理单独的'd'或'D'开头的掷骰（如d6表示1d6，D6表示暴击检定1D6）
    if (token.type === 'd' || token.type === 'D') {
      const isCriticalDice = token.type === 'D';
      this.advance(); // 跳过'd'或'D'
      
      const sidesToken = this.currentToken();
      if (sidesToken.type === 'NUMBER') {
        const sides = sidesToken.value;
        this.advance();
        
        // 在骰子复用模式下，每个骰子都需要独立的ID
        if (this.enableDiceReuse) {
          const diceId = this.diceIdCounter++;
          const diceDefinition = {
            count: 1,
            sides: sides,
            isCriticalDice: isCriticalDice
          };
          
          // 注册骰子
          this.diceRegistry.set(diceId, diceDefinition);
          
          return {
            type: 'dice',
            id: diceId,
            count: 1,
            sides: sides,
            isCriticalDice: isCriticalDice
          };
        } else {
          // 普通模式，不分配ID
          return {
            type: 'dice',
            count: 1,
            sides: sides,
            isCriticalDice: isCriticalDice
          };
        }
      } else {
        throw new Error(`${token.value}后面必须跟数字`);
      }
    }
    
    if (token.type === 'DICE') {
      this.advance();
      // 在骰子复用模式下，每个骰子都需要独立的ID
      if (this.enableDiceReuse) {
        const diceId = this.diceIdCounter++;
        const diceDefinition = {
          count: token.value.count,
          sides: token.value.sides,
          isCriticalDice: token.value.isCriticalDice || false
        };
        
        // 注册骰子
        this.diceRegistry.set(diceId, diceDefinition);
        
        return {
          type: 'dice',
          id: diceId,
          count: token.value.count,
          sides: token.value.sides,
          isCriticalDice: token.value.isCriticalDice || false
        };
      } else {
        // 普通模式，不分配ID
        return {
          type: 'dice',
          count: token.value.count,
          sides: token.value.sides,
          isCriticalDice: token.value.isCriticalDice || false
        };
      }
    }
    
    if (token.type === 'DICE_REF') {
      this.advance();
      const diceId = token.value.id;
      
      // 检查引用的骰子是否已经存在
      if (!this.diceRegistry.has(diceId)) {
        throw new Error(`引用的骰子 d_${diceId} 不存在或尚未定义`);
      }
      
      const diceDefinition = this.diceRegistry.get(diceId);
      return {
        type: 'dice_ref',
        id: diceId,
        count: diceDefinition.count,
        sides: diceDefinition.sides,
        isCriticalDice: diceDefinition.isCriticalDice
      };
    }
    
    if (token.type === 'KEEP') {
      const keepToken = token;
      this.advance();
      
      if (this.currentToken().type !== 'LPAREN') {
        throw new Error('Keep操作后必须跟括号');
      }
      this.advance(); // 跳过 '('
      
      // 解析表达式列表，支持分号分隔
      const expressions = [];
      expressions.push(this.parseRerollExpression());
      
      // 检查是否有分号分隔的其他表达式
      while (this.currentToken().type === 'SEMICOLON') {
        this.advance(); // 跳过 ';'
        expressions.push(this.parseRerollExpression());
      }
      
      if (this.currentToken().type !== 'RPAREN') {
        throw new Error('缺少右括号');
      }
      this.advance(); // 跳过 ')'
      
      return {
        type: 'keep',
        count: keepToken.value.count,
        keepType: keepToken.value.type,
        expressions: expressions
      };
    }
    
    if (token.type === 'LPAREN') {
      this.advance(); // 跳过 '('
      const expression = this.parseConditional();
      
      if (this.currentToken().type !== 'RPAREN') {
        throw new Error('缺少右括号');
      }
      this.advance(); // 跳过 ')'
      
      return expression;
    }
    
    throw new Error(`意外的token: ${token.type}`);
  }
  
  parseReroll(diceNode) {
    // 检查节点类型并找到可以重骰的骰子节点
    const findDiceNode = (node) => {
      if (node.type === 'dice') {
        return node;
      } else if (node.type === 'binary_op') {
        // 如果是二元操作，检查左右子节点
        const leftDice = findDiceNode(node.left);
        if (leftDice) return leftDice;
        const rightDice = findDiceNode(node.right);
        if (rightDice) return rightDice;
      } else if (node.type === 'keep') {
        // 如果是keep操作，检查其表达式中的骰子
        for (const expr of node.expressions) {
          const dice = findDiceNode(expr);
          if (dice) return dice;
        }
      } else if (node.type === 'critical_double' || node.type === 'critical_switch' || node.type === 'critical_only') {
        // 如果是暴击操作，检查其表达式
        const expr = node.type === 'critical_switch' ? node.normalExpression : node.expression;
        const dice = findDiceNode(expr);
        if (dice) return dice;
      }
      return null;
    };
    
    const actualDiceNode = findDiceNode(diceNode);
    if (!actualDiceNode) {
      throw new Error('重骰操作只能应用于包含掷骰的表达式');
    }
    
    const token = this.currentToken();
    
    if (token.type === 'REROLL') {
      // 完整的重骰token，包含所有信息
      this.advance();
      return {
        type: 'reroll',
        dice: actualDiceNode,
        minValue: token.value.minValue,
        maxValue: token.value.maxValue,
        maxRerolls: token.value.maxRerolls
      };
    } else if (token.type === 'R') {
      // 分离式的重骰解析：r数字~数字e数字
      this.advance(); // 跳过 'r'
      
      // 读取最小值
      if (this.currentToken().type !== 'NUMBER') {
        throw new Error('重骰操作r后必须跟数字');
      }
      const minValue = this.currentToken().value;
      this.advance();
      
      let maxValue = minValue; // 默认最大值等于最小值
      let maxRerolls = 1; // 默认重骰1次
      
      // 检查是否有波浪号（范围）
      if (this.currentToken().type === 'TILDE') {
        this.advance(); // 跳过 '~'
        if (this.currentToken().type !== 'NUMBER') {
          throw new Error('~后必须跟数字');
        }
        maxValue = this.currentToken().value;
        this.advance();
      }
      
      // 检查是否有e（最大重骰次数）
      if (this.currentToken().type === 'E') {
        this.advance(); // 跳过 'e'
        if (this.currentToken().type !== 'NUMBER') {
          throw new Error('e后必须跟数字');
        }
        maxRerolls = this.currentToken().value;
        this.advance();
      }
      
      return {
        type: 'reroll',
        dice: actualDiceNode,
        minValue,
        maxValue,
        maxRerolls
      };
    }
    
    return diceNode;
  }
  
  parseExploding(diceNode) {
    const token = this.currentToken();
    
    if (token.type === 'EXPLODING') {
      this.advance();
      
      // 查找实际的骰子节点
      const findDiceNode = (node) => {
        if (node.type === 'dice') {
          return node;
        } else if (node.type === 'reroll') {
          return findDiceNode(node.dice);
        } else if (node.type === 'binary_op') {
          const leftDice = findDiceNode(node.left);
          if (leftDice) return leftDice;
          const rightDice = findDiceNode(node.right);
          if (rightDice) return rightDice;
        }
        return null;
      };
      
      const actualDiceNode = findDiceNode(diceNode);
      if (!actualDiceNode) {
        throw new Error('爆炸骰操作只能应用于包含掷骰的表达式');
      }
      
      return {
        type: 'exploding',
        baseExpression: diceNode,
        diceNode: actualDiceNode,
        minSuccess: token.value.minSuccess,
        maxSuccess: token.value.maxSuccess,
        minExplode: token.value.minExplode,
        maxExplode: token.value.maxExplode,
        maxExplosions: token.value.maxExplosions
      };
    }
    
    return diceNode;
  }
  
  parseExplodingSum(diceNode) {
    const token = this.currentToken();
    
    if (token.type === 'EXPLODING_SUM') {
      this.advance();
      
      // 查找实际的骰子节点
      const findDiceNode = (node) => {
        if (node.type === 'dice') {
          return node;
        } else if (node.type === 'reroll') {
          return findDiceNode(node.dice);
        } else if (node.type === 'binary_op') {
          const leftDice = findDiceNode(node.left);
          if (leftDice) return leftDice;
          const rightDice = findDiceNode(node.right);
          if (rightDice) return rightDice;
        }
        return null;
      };
      
      const actualDiceNode = findDiceNode(diceNode);
      if (!actualDiceNode) {
        throw new Error('总和型爆炸骰操作只能应用于包含掷骰的表达式');
      }
      
      return {
        type: 'exploding_sum',
        baseExpression: diceNode,
        diceNode: actualDiceNode,
        minExplode: token.value.minExplode,
        maxExplode: token.value.maxExplode,
        maxExplosions: token.value.maxExplosions
      };
    }
    
    return diceNode;
  }

  currentToken() {
    return this.tokens[this.position];
  }

  advance() {
    this.position++;
  }

  parseFunction() {
    const functionName = this.currentToken().value;
    this.advance(); // 跳过函数名
    
    if (this.currentToken().type !== 'LPAREN') {
      throw new Error(`函数 ${functionName} 后必须跟 (`);
    }
    this.advance(); // 跳过 (
    
    const args = [];
    
    // 解析参数列表
    if (this.currentToken().type !== 'RPAREN') {
      args.push(this.parseExpression());
      
      while (this.currentToken().type === 'COMMA') {
        this.advance(); // 跳过逗号
        args.push(this.parseExpression());
      }
    }
    
    if (this.currentToken().type !== 'RPAREN') {
      throw new Error(`函数 ${functionName} 缺少结束的 )`);
    }
    this.advance(); // 跳过 )
    
    return {
      type: 'function_call',
      name: functionName,
      arguments: args
    };
  }
}

export default Parser;
