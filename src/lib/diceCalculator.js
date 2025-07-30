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
      } else if (char === 'd' && this.position === 0) {
        // 处理开头的'd'（如d20）
        this.tokens.push({ type: 'D', value: 'd' });
        this.position++;
      } else if (char === 'd') {
        // 检查前一个字符是否是数字
        if (this.position > 0 && this.isDigit(this.input[this.position - 1])) {
          // 这个'd'是掷骰表达式的一部分，在readNumber中已经处理
          this.tokens.push({ type: 'D', value: 'd' });
          this.position++;
        } else {
          this.tokens.push({ type: 'D', value: 'd' });
          this.position++;
        }
      } else if (this.isLetter(char)) {
        this.readIdentifier();
      } else if (char === '(') {
        this.tokens.push({ type: 'LPAREN', value: '(' });
        this.position++;
      } else if (char === ')') {
        this.tokens.push({ type: 'RPAREN', value: ')' });
        this.position++;
      } else if (char === ';') {
        this.tokens.push({ type: 'SEMICOLON', value: ';' });
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
      } else if (char === '?') {
        this.tokens.push({ type: 'QUESTION', value: '?' });
        this.position++;
      } else if (char === ':') {
        this.tokens.push({ type: 'COLON', value: ':' });
        this.position++;
      } else if (char === '~') {
        this.tokens.push({ type: 'TILDE', value: '~' });
        this.position++;
      } else if (char === '#') {
        this.tokens.push({ type: 'HASH', value: '#' });
        this.position++;
      } else if (char === '|') {
        this.tokens.push({ type: 'PIPE', value: '|' });
        this.position++;
      } else if (char === '[') {
        this.tokens.push({ type: 'LBRACKET', value: '[' });
        this.position++;
      } else if (char === ']') {
        this.tokens.push({ type: 'RBRACKET', value: ']' });
        this.position++;
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
    const startPos = this.position;
    
    // 特殊处理：如果是以 'r' 开头，继续读取包括 '~' 和更多字符直到下一个空格或操作符
    if (this.input[this.position] === 'r') {
      while (this.position < this.input.length && 
             (this.isLetter(this.input[this.position]) || 
              this.isDigit(this.input[this.position]) || 
              this.input[this.position] === '~')) {
        identifier += this.input[this.position];
        this.position++;
      }
    } else if (this.input[this.position] === 's') {
      // 特殊处理爆炸骰语法：读取完整的修饰符串
      while (this.position < this.input.length && 
             (this.isLetter(this.input[this.position]) || 
              this.isDigit(this.input[this.position]) || 
              this.input[this.position] === '~')) {
        identifier += this.input[this.position];
        this.position++;
      }
    } else {
      // 正常的标识符读取
      while (this.position < this.input.length && 
             (this.isLetter(this.input[this.position]) || this.isDigit(this.input[this.position]))) {
        identifier += this.input[this.position];
        this.position++;
      }
    }
    
    // 智能解析复杂标识符（如 d6r1, d6r1~2e1, 3d10s8x10l5 等）
    if (identifier.includes('d') && identifier.includes('r')) {
      // 尝试拆分掷骰和重骰部分
      const diceMatch = identifier.match(/^(\d*)d(\d+)(.*)$/);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const sides = parseInt(diceMatch[2]);
        const remaining = diceMatch[3];
        
        // 添加掷骰token
        this.tokens.push({ 
          type: 'DICE', 
          value: { count, sides }
        });
        
        // 处理剩余的重骰部分
        if (remaining) {
          this.parseRerollFromString(remaining);
        }
        return;
      }
    }
    
    // 智能解析掷骰+爆炸骰（如 3d10s8~10x10l5）
    if (identifier.includes('d') && identifier.includes('s')) {
      const diceMatch = identifier.match(/^(\d*)d(\d+)(.*)$/);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const sides = parseInt(diceMatch[2]);
        const remaining = diceMatch[3];
        
        // 添加掷骰token
        this.tokens.push({ 
          type: 'DICE', 
          value: { count, sides }
        });
        
        // 处理剩余的爆炸骰部分
        if (remaining) {
          this.parseExplodingFromString(remaining);
        }
        return;
      }
    }
    
    // 智能解析掷骰+总和型爆炸骰（如 3d10e10l5）
    if (identifier.includes('d') && identifier.includes('e') && !identifier.includes('r')) {
      const diceMatch = identifier.match(/^(\d*)d(\d+)(.*)$/);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const sides = parseInt(diceMatch[2]);
        const remaining = diceMatch[3];
        
        // 添加掷骰token
        this.tokens.push({ 
          type: 'DICE', 
          value: { count, sides }
        });
        
        // 处理剩余的总和型爆炸骰部分
        if (remaining) {
          this.parseExplodingSumFromString(remaining);
        }
        return;
      }
    }
    
    // 检查是否是掷骰表达式 (如 "2d6" 或 "d20")
    if (identifier.includes('d') && !identifier.includes('r')) {
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
    
    // 检查是否是keep操作 (如 "kh", "kl", "kh3", "kl3")
    if (identifier.startsWith('k')) {
      const match = identifier.match(/^k([hl])(\d*)$/);
      if (match) {
        const type = match[1] === 'h' ? 'highest' : 'lowest';
        const count = match[2] ? parseInt(match[2]) : 1;
        this.tokens.push({ 
          type: 'KEEP', 
          value: { count, type }
        });
        return;
      }
    }
    
    // 检查是否是重骰操作 (如 "r1~2e3", "r1e1", "r1~2", "r1")
    if (identifier.startsWith('r')) {
      const rerollMatch = identifier.match(/^r(\d+)(?:~(\d+))?(?:e(\d+))?$/);
      if (rerollMatch) {
        const minValue = parseInt(rerollMatch[1]);
        const maxValue = rerollMatch[2] ? parseInt(rerollMatch[2]) : minValue;
        const maxRerolls = rerollMatch[3] ? parseInt(rerollMatch[3]) : 1;
        
        this.tokens.push({ 
          type: 'REROLL', 
          value: { 
            minValue, 
            maxValue, 
            maxRerolls 
          }
        });
        return;
      }
    }
    
    // 检查是否是爆炸骰操作 (如 "s8~10x10l5" 表示8~10成功，10爆炸，最多5次)
    if (identifier.startsWith('s')) {
      const explodeMatch = identifier.match(/^s(\d+)(?:~(\d+))?(?:x(\d+))?(?:l(\d+))?$/);
      if (explodeMatch) {
        const minSuccess = parseInt(explodeMatch[1]);
        const maxSuccess = explodeMatch[2] ? parseInt(explodeMatch[2]) : minSuccess;
        const explodeOn = explodeMatch[3] ? parseInt(explodeMatch[3]) : null;
        const maxExplosions = explodeMatch[4] ? parseInt(explodeMatch[4]) : 10;
        
        this.tokens.push({ 
          type: 'EXPLODING', 
          value: { 
            minSuccess, 
            maxSuccess, 
            explodeOn,
            maxExplosions 
          }
        });
        return;
      }
    }
    
    // 检查是否是总和型爆炸骰操作 (如 "e10l5" 表示10爆炸，最多5次，计算总和)
    if (identifier.startsWith('e')) {
      const explodeSumMatch = identifier.match(/^e(\d+)(?:l(\d+))?$/);
      if (explodeSumMatch) {
        const explodeOn = parseInt(explodeSumMatch[1]);
        const maxExplosions = explodeSumMatch[2] ? parseInt(explodeSumMatch[2]) : 10;
        
        this.tokens.push({ 
          type: 'EXPLODING_SUM', 
          value: { 
            explodeOn,
            maxExplosions 
          }
        });
        return;
      }
    }
    
    // 检查是否是单独的 'r' 字符
    if (identifier === 'r') {
      this.tokens.push({ type: 'R', value: 'r' });
      return;
    }
    
    // 检查是否是单独的 'e' 字符
    if (identifier === 'e') {
      this.tokens.push({ type: 'E', value: 'e' });
      return;
    }
    
    // 检查是否是以'e'开头的数字（如 e1, e2, e3）
    if (identifier.startsWith('e')) {
      const eMatch = identifier.match(/^e(\d+)$/);
      if (eMatch) {
        this.tokens.push({ type: 'E', value: 'e' });
        this.tokens.push({ type: 'NUMBER', value: parseInt(eMatch[1]) });
        return;
      }
    }
    
    throw new Error(`未知标识符: ${identifier}`);
  }
  
  // 辅助方法：从字符串解析重骰部分
  parseRerollFromString(rerollStr) {
    const match = rerollStr.match(/^r(\d+)(?:~(\d+))?(?:e(\d+))?$/);
    if (match) {
      const minValue = parseInt(match[1]);
      const maxValue = match[2] ? parseInt(match[2]) : minValue;
      const maxRerolls = match[3] ? parseInt(match[3]) : 1;
      
      this.tokens.push({ 
        type: 'REROLL', 
        value: { 
          minValue, 
          maxValue, 
          maxRerolls 
        }
      });
    } else {
      throw new Error(`无法解析重骰字符串: ${rerollStr}`);
    }
  }
  
  // 辅助方法：从字符串解析爆炸骰部分
  parseExplodingFromString(explodingStr) {
    const match = explodingStr.match(/^s(\d+)(?:~(\d+))?(?:x(\d+))?(?:l(\d+))?$/);
    if (match) {
      const minSuccess = parseInt(match[1]);
      const maxSuccess = match[2] ? parseInt(match[2]) : minSuccess;
      const explodeOn = match[3] ? parseInt(match[3]) : null;
      const maxExplosions = match[4] ? parseInt(match[4]) : 10;
      
      this.tokens.push({ 
        type: 'EXPLODING', 
        value: { 
          minSuccess, 
          maxSuccess, 
          explodeOn,
          maxExplosions 
        }
      });
    } else {
      throw new Error(`无法解析爆炸骰字符串: ${explodingStr}`);
    }
  }
  
  // 辅助方法：从字符串解析总和型爆炸骰部分
  parseExplodingSumFromString(explodingSumStr) {
    const match = explodingSumStr.match(/^e(\d+)(?:l(\d+))?$/);
    if (match) {
      const explodeOn = parseInt(match[1]);
      const maxExplosions = match[2] ? parseInt(match[2]) : 10;
      
      this.tokens.push({ 
        type: 'EXPLODING_SUM', 
        value: { 
          explodeOn,
          maxExplosions 
        }
      });
    } else {
      throw new Error(`无法解析总和型爆炸骰字符串: ${explodingSumStr}`);
    }
  }
}

// 语法分析器 - 将Token序列转换为AST
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  parse() {
    const result = this.parseConditional();
    if (this.currentToken().type !== 'EOF') {
      throw new Error(`意外的token: ${this.currentToken().type}`);
    }
    return result;
  }

  parseConditional() {
    let expression = this.parseComparison();
    
    // 检查是否是条件表达式 (condition ? valueIfTrue : valueIfFalse)
    if (this.currentToken().type === 'QUESTION') {
      this.advance(); // 跳过 '?'
      // 修改：支持在条件表达式的真值和假值部分解析暴击表达式和嵌套条件
      const trueValue = this.parseConditional(); // 改为递归调用 parseConditional
      
      if (this.currentToken().type !== 'COLON') {
        throw new Error('条件表达式中缺少 ":"');
      }
      this.advance(); // 跳过 ':'
      
      const falseValue = this.parseConditional(); // 改为递归调用 parseConditional
      
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
    let diceNode = this.parseCritical(); // 改为先解析暴击表达式
    
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
      
      // 解析表达式列表，支持分号分隔
      const expressions = [];
      expressions.push(this.parseRerollExpression()); // 改为支持重骰的表达式解析
      
      // 检查是否有分号分隔的其他表达式
      while (this.currentToken().type === 'SEMICOLON') {
        this.advance(); // 跳过 ';'
        expressions.push(this.parseRerollExpression()); // 改为支持重骰的表达式解析
      }
      
      if (this.currentToken().type !== 'RPAREN') {
        throw new Error('缺少右括号');
      }
      this.advance(); // 跳过 ')'
      
      return {
        type: 'keep',
        count: keepToken.value.count,
        keepType: keepToken.value.type,
        expressions: expressions // 支持多个表达式
      };
    }
    
    if (token.type === 'LPAREN') {
      this.advance(); // 跳过 '('
      const expression = this.parseConditional(); // 改为parseConditional以支持条件操作
      
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
        explodeOn: token.value.explodeOn,
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
        explodeOn: token.value.explodeOn,
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

  // 计算Keep操作 (取最高/最低) - 支持多种表达式和复合掷骰
  calculateKeep(expressions, keepCount, keepType) {
    // 如果只有一个表达式，检查是否为传统格式
    if (expressions.length === 1) {
      const expr = expressions[0];
      // 对于传统的单一骰子表达式（如4d6），按原逻辑处理
      if (expr.type === 'dice') {
        return this.calculateKeepSingleDice(expr, keepCount, keepType);
      }
      // 对于复合表达式（如带重骰的），需要特殊处理
      return this.calculateKeepComplex(expr, keepCount, keepType);
    }
    
    // 多个表达式的情况（如kl(1d8;1d10)）
    return this.calculateKeepMultiple(expressions, keepCount, keepType);
  }

  // 计算单一骰子的Keep操作（原逻辑）
  calculateKeepSingleDice(expression, keepCount, keepType) {
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

  // 计算复合表达式的Keep操作（支持重骰等）
  calculateKeepComplex(expression, keepCount, keepType) {
    // 首先计算复合表达式的所有可能结果
    const baseResult = this.evaluate(expression);
    
    // 如果基础结果不是分布，无法应用keep
    if (typeof baseResult !== 'object' || baseResult.distribution) {
      return baseResult;
    }
    
    // 将分布转换为值数组，然后应用keep逻辑
    const result = {};
    
    // 对于复合表达式，我们需要模拟每个骰子的单独结果
    // 这里需要更复杂的逻辑来处理重骰等情况
    if (expression.type === 'reroll') {
      return this.calculateKeepWithReroll(expression, keepCount, keepType);
    }
    
    return baseResult;
  }

  // 计算带重骰的Keep操作
  calculateKeepWithReroll(rerollExpr, keepCount, keepType) {
    const { dice, minValue, maxValue, maxRerolls } = rerollExpr;
    const { count, sides } = dice;
    const result = {};
    
    // 生成单个骰子的重骰结果分布
    const singleDiceOutcomes = this.generateSingleDiceRerollOutcomes(
      sides, minValue, maxValue, maxRerolls
    );
    
    // 生成所有可能的多骰子组合
    function generateRerollCombinations(diceCount, singleOutcomes) {
      if (diceCount === 1) {
        return Object.entries(singleOutcomes).map(([value, count]) => ({
          values: [parseInt(value)],
          probability: count
        }));
      }
      
      const smallerCombinations = generateRerollCombinations(diceCount - 1, singleOutcomes);
      const combinations = [];
      
      for (const [value, count] of Object.entries(singleOutcomes)) {
        for (const combo of smallerCombinations) {
          combinations.push({
            values: [parseInt(value), ...combo.values],
            probability: count * combo.probability
          });
        }
      }
      
      return combinations;
    }
    
    const allCombinations = generateRerollCombinations(count, singleDiceOutcomes);
    
    // 对每个组合应用keep规则
    for (const combination of allCombinations) {
      const sorted = [...combination.values].sort((a, b) => keepType === 'highest' ? b - a : a - b);
      const kept = sorted.slice(0, keepCount);
      const sum = kept.reduce((acc, val) => acc + val, 0);
      
      result[sum] = (result[sum] || 0) + combination.probability;
    }
    
    // 将概率转换为整数计数
    const scaleFactor = Object.values(singleDiceOutcomes).reduce((sum, count) => sum + count, 0) ** count;
    const integerResult = {};
    for (const [value, probability] of Object.entries(result)) {
      const count = Math.round(probability);
      if (count > 0) {
        integerResult[value] = count;
      }
    }
    
    return integerResult;
  }

  // 计算多个不同表达式的Keep操作
  calculateKeepMultiple(expressions, keepCount, keepType) {
    // 计算每个表达式的结果分布
    const distributions = expressions.map(expr => this.evaluate(expr));
    
    const result = {};
    
    // 生成所有可能的组合
    function generateMultipleExpressionCombinations(distributions) {
      if (distributions.length === 1) {
        const dist = distributions[0];
        return Object.entries(dist).map(([value, count]) => ({
          values: [parseInt(value)],
          count
        }));
      }
      
      const firstDist = distributions[0];
      const restCombinations = generateMultipleExpressionCombinations(distributions.slice(1));
      const combinations = [];
      
      for (const [value, count] of Object.entries(firstDist)) {
        for (const combo of restCombinations) {
          combinations.push({
            values: [parseInt(value), ...combo.values],
            count: count * combo.count
          });
        }
      }
      
      return combinations;
    }
    
    const allCombinations = generateMultipleExpressionCombinations(distributions);
    
    // 对每个组合应用keep规则
    for (const combination of allCombinations) {
      const sorted = [...combination.values].sort((a, b) => keepType === 'highest' ? b - a : a - b);
      const kept = sorted.slice(0, keepCount);
      const sum = kept.reduce((acc, val) => acc + val, 0);
      
      result[sum] = (result[sum] || 0) + combination.count;
    }
    
    return result;
  }

  // 生成单个骰子的重骰结果分布
  generateSingleDiceRerollOutcomes(sides, minReroll, maxReroll, maxRerollCount) {
    const outcomes = {};
    
    // 递归函数计算重骰结果，携带概率权重
    function calculateWithRerolls(currentValue, rerollsUsed, probability) {
      // 如果当前值不在重骰范围内，或者已经用完重骰次数，则接受这个值
      if (currentValue < minReroll || currentValue > maxReroll || rerollsUsed >= maxRerollCount) {
        outcomes[currentValue] = (outcomes[currentValue] || 0) + probability;
        return;
      }
      
      // 如果在重骰范围内且还有重骰次数，进行重骰
      const newProbability = probability / sides;
      for (let newValue = 1; newValue <= sides; newValue++) {
        calculateWithRerolls(newValue, rerollsUsed + 1, newProbability);
      }
    }
    
    // 对每个初始值开始计算，初始概率为 1/sides
    for (let initialValue = 1; initialValue <= sides; initialValue++) {
      calculateWithRerolls(initialValue, 0, 1);
    }
    
    // 将概率转换为整数计数
    const scaleFactor = Math.pow(sides, maxRerollCount + 2);
    const integerOutcomes = {};
    for (const [value, probability] of Object.entries(outcomes)) {
      const count = Math.round(probability * scaleFactor);
      if (count > 0) {
        integerOutcomes[value] = count;
      }
    }
    
    return integerOutcomes;
  }

  // 计算重骰操作
  calculateReroll(diceNode, minValue, maxValue, maxRerolls) {
    const { count, sides } = diceNode;
    const result = {};
    
    // 获取单个骰子的重骰结果分布
    const singleDiceOutcomes = this.generateSingleDiceRerollOutcomes(sides, minValue, maxValue, maxRerolls);
    
    // 如果只有一个骰子，直接返回结果
    if (count === 1) {
      return singleDiceOutcomes;
    }
    
    // 多个骰子的情况：组合所有骰子的结果
    function combineMultipleDice(diceCount, singleOutcomes, currentResult = { 0: 1 }) {
      if (diceCount === 0) return currentResult;
      
      const newResult = {};
      
      for (const [currentSum, currentCount] of Object.entries(currentResult)) {
        const sum = parseInt(currentSum);
        
        for (const [diceValue, diceCount] of Object.entries(singleOutcomes)) {
          const newSum = sum + parseInt(diceValue);
          const newCount = currentCount * diceCount;
          newResult[newSum] = (newResult[newSum] || 0) + newCount;
        }
      }
      
      return combineMultipleDice(diceCount - 1, singleOutcomes, newResult);
    }
    
    return combineMultipleDice(count, singleDiceOutcomes);
  }

  // 计算爆炸骰操作 (成功计数型)
  calculateExploding(node) {
    const { baseExpression, diceNode, minSuccess, maxSuccess, explodeOn, maxExplosions } = node;
    
    // 获取基础表达式的结果分布（可能包含重骰等操作）
    const baseResult = this.evaluate(baseExpression);
    const baseDist = baseResult.distribution || baseResult;
    const { count, sides } = diceNode;
    
    // 计算单个骰子的爆炸结果分布（包含成功数统计）
    const singleDiceExplodingOutcomes = this.generateSingleDiceExplodingOutcomes(
      sides, minSuccess, maxSuccess, explodeOn, maxExplosions
    );
    
    // 如果只有一个骰子，直接返回结果
    if (count === 1) {
      return singleDiceExplodingOutcomes;
    }
    
    // 多个骰子的情况：组合所有骰子的成功数
    const result = {};
    
    function combineMultipleDice(diceCount, singleOutcomes, currentResult = { 0: 1 }) {
      if (diceCount === 0) return currentResult;
      
      const newResult = {};
      
      for (const [currentSuccesses, currentCount] of Object.entries(currentResult)) {
        const successes = parseInt(currentSuccesses);
        
        for (const [diceSuccesses, diceCount] of Object.entries(singleOutcomes)) {
          const newSuccesses = successes + parseInt(diceSuccesses);
          const newCount = currentCount * diceCount;
          newResult[newSuccesses] = (newResult[newSuccesses] || 0) + newCount;
        }
      }
      
      return combineMultipleDice(diceCount - 1, singleOutcomes, newResult);
    }
    
    return combineMultipleDice(count, singleDiceExplodingOutcomes);
  }

  // 生成单个骰子的爆炸结果分布（成功计数）
  generateSingleDiceExplodingOutcomes(sides, minSuccess, maxSuccess, explodeOn, maxExplosions) {
    const outcomes = {};
    
    // 递归函数计算爆炸结果，返回成功数分布
    function calculateWithExplosions(currentSuccesses, explosionsUsed, probability) {
      // 投掷一个骰子
      for (let rollValue = 1; rollValue <= sides; rollValue++) {
        const rollProbability = probability / sides;
        let successes = currentSuccesses;
        
        // 检查是否成功
        if (rollValue >= minSuccess && rollValue <= maxSuccess) {
          successes += 1;
        }
        
        // 检查是否爆炸
        const shouldExplode = explodeOn && rollValue === explodeOn && explosionsUsed < maxExplosions;
        
        if (shouldExplode) {
          // 继续爆炸
          calculateWithExplosions(successes, explosionsUsed + 1, rollProbability);
        } else {
          // 停止，记录最终成功数
          outcomes[successes] = (outcomes[successes] || 0) + rollProbability;
        }
      }
    }
    
    // 开始计算，初始成功数为0
    calculateWithExplosions(0, 0, 1);
    
    // 将概率转换为整数计数
    const scaleFactor = Math.pow(sides, Math.min(maxExplosions + 2, 6)); // 限制缩放因子以避免数值过大
    const integerOutcomes = {};
    for (const [successCount, probability] of Object.entries(outcomes)) {
      const count = Math.round(probability * scaleFactor);
      if (count > 0) {
        integerOutcomes[successCount] = count;
      }
    }
    
    return integerOutcomes;
  }

  // 计算总和型爆炸骰操作
  calculateExplodingSum(node) {
    const { baseExpression, diceNode, explodeOn, maxExplosions } = node;
    
    // 获取基础表达式的结果分布（可能包含重骰等操作）
    const baseResult = this.evaluate(baseExpression);
    const baseDist = baseResult.distribution || baseResult;
    const { count, sides } = diceNode;
    
    // 计算单个骰子的总和型爆炸结果分布
    const singleDiceExplodingSumOutcomes = this.generateSingleDiceExplodingSumOutcomes(
      sides, explodeOn, maxExplosions
    );
    
    // 如果只有一个骰子，直接返回结果
    if (count === 1) {
      return singleDiceExplodingSumOutcomes;
    }
    
    // 多个骰子的情况：组合所有骰子的总和
    const result = {};
    
    function combineMultipleDice(diceCount, singleOutcomes, currentResult = { 0: 1 }) {
      if (diceCount === 0) return currentResult;
      
      const newResult = {};
      
      for (const [currentSum, currentCount] of Object.entries(currentResult)) {
        const sum = parseInt(currentSum);
        
        for (const [diceSum, diceCount] of Object.entries(singleOutcomes)) {
          const newSum = sum + parseInt(diceSum);
          const newCount = currentCount * diceCount;
          newResult[newSum] = (newResult[newSum] || 0) + newCount;
        }
      }
      
      return combineMultipleDice(diceCount - 1, singleOutcomes, newResult);
    }
    
    return combineMultipleDice(count, singleDiceExplodingSumOutcomes);
  }

  // 生成单个骰子的总和型爆炸结果分布
  generateSingleDiceExplodingSumOutcomes(sides, explodeOn, maxExplosions) {
    const outcomes = {};
    
    // 递归函数计算爆炸结果，返回总和分布
    function calculateWithExplosions(currentSum, explosionsUsed, probability) {
      // 投掷一个骰子
      for (let rollValue = 1; rollValue <= sides; rollValue++) {
        const rollProbability = probability / sides;
        const newSum = currentSum + rollValue;
        
        // 检查是否爆炸
        const shouldExplode = rollValue === explodeOn && explosionsUsed < maxExplosions;
        
        if (shouldExplode) {
          // 继续爆炸
          calculateWithExplosions(newSum, explosionsUsed + 1, rollProbability);
        } else {
          // 停止，记录最终总和
          outcomes[newSum] = (outcomes[newSum] || 0) + rollProbability;
        }
      }
    }
    
    // 开始计算，初始总和为0
    calculateWithExplosions(0, 0, 1);
    
    // 将概率转换为整数计数
    const scaleFactor = Math.pow(sides, Math.min(maxExplosions + 2, 6)); // 限制缩放因子以避免数值过大
    const integerOutcomes = {};
    for (const [sum, probability] of Object.entries(outcomes)) {
      const count = Math.round(probability * scaleFactor);
      if (count > 0) {
        integerOutcomes[sum] = count;
      }
    }
    
    return integerOutcomes;
  }

  // 计算条件表达式
  calculateConditional(conditionNode, trueValueNode, falseValueNode) {
    const conditionResult = this.evaluate(conditionNode);
    
    // 如果条件结果不是概率类型，抛出错误
    if (conditionResult.type !== 'probability') {
      throw new Error('条件表达式的条件部分必须是比较操作（如 d20+6 >= 17）');
    }
    
    // 如果启用了暴击系统且条件中包含d20，使用特殊处理
    if (this.criticalOptions && this.criticalOptions.criticalEnabled && this.hasD20InCondition(conditionNode)) {
      return this.calculateConditionalWithCriticalOverlap(conditionNode, trueValueNode, falseValueNode, conditionResult);
    }
    
    const trueValueResult = this.evaluate(trueValueNode);
    const falseValueResult = this.evaluate(falseValueNode);
    
    const result = {};
    
    // 获取真值和假值的分布
    const trueDist = trueValueResult.combined || trueValueResult.distribution || trueValueResult;
    const falseDist = falseValueResult.combined || falseValueResult.distribution || falseValueResult;
    
    // 计算总计数来规范化概率
    const trueTotal = Object.values(trueDist).reduce((sum, count) => sum + count, 0);
    const falseTotal = Object.values(falseDist).reduce((sum, count) => sum + count, 0);
    
    // 计算条件成功时的结果分布
    for (const [value, count] of Object.entries(trueDist)) {
      const val = parseFloat(value);
      const relativeProbability = count / trueTotal; // 在该分布内的相对概率
      const weightedCount = relativeProbability * conditionResult.successProbability;
      result[val] = (result[val] || 0) + weightedCount;
    }
    
    // 计算条件失败时的结果分布
    for (const [value, count] of Object.entries(falseDist)) {
      const val = parseFloat(value);
      const relativeProbability = count / falseTotal; // 在该分布内的相对概率
      const weightedCount = relativeProbability * conditionResult.failureProbability;
      result[val] = (result[val] || 0) + weightedCount;
    }
    
    // 标准化结果（将权重转换为整数计数）
    const totalWeight = Object.values(result).reduce((sum, weight) => sum + weight, 0);
    const normalizedResult = {};
    // 对于条件表达式，正确的总数应该考虑条件的总可能性
    // 条件总数 × 真值总数（当条件成功时）+ 条件总数 × 假值总数（当条件失败时）
    // 但实际上应该是条件总数 × max(真值总数, 假值总数)，因为每个条件结果对应一个完整的值分布
    const conditionTotalCount = conditionResult.totalCount;
    const maxBranchCount = Math.max(trueTotal, falseTotal);
    const originalTotalCount = conditionTotalCount * maxBranchCount;
    const scaleFactor = originalTotalCount;
    
    for (const [value, weight] of Object.entries(result)) {
      const normalizedCount = Math.round(weight * scaleFactor / totalWeight);
      if (normalizedCount > 0) {
        normalizedResult[value] = normalizedCount;
      }
    }
    
    // 收集嵌套条件信息
    const nestedConditions = [];
    
    // 收集当前条件信息
    const currentCondition = {
      condition: this.nodeToString(conditionNode),
      successProbability: conditionResult.successProbability,
      failureProbability: conditionResult.failureProbability,
      level: 0
    };
    nestedConditions.push(currentCondition);
    
    // 递归收集真值分支中的条件
    if (trueValueResult.nestedConditions) {
      trueValueResult.nestedConditions.forEach(cond => {
        nestedConditions.push({
          ...cond,
          level: cond.level + 1,
          parentProbability: conditionResult.successProbability,
          conditionalProbability: cond.successProbability * conditionResult.successProbability,
          path: 'true'
        });
      });
    }
    
    // 递归收集假值分支中的条件
    if (falseValueResult.nestedConditions) {
      falseValueResult.nestedConditions.forEach(cond => {
        nestedConditions.push({
          ...cond,
          level: cond.level + 1,
          parentProbability: conditionResult.failureProbability,
          conditionalProbability: cond.successProbability * conditionResult.failureProbability,
          path: 'false'
        });
      });
    }
    
    // 返回包含分离数据的结果
    return {
      type: 'conditional',
      combined: normalizedResult,
      trueValues: trueDist,
      falseValues: falseDist,
      condition: {
        successProbability: conditionResult.successProbability,
        failureProbability: conditionResult.failureProbability
      },
      nestedConditions: nestedConditions
    };
  }

  // 检查条件中是否包含d20
  hasD20InCondition(conditionNode) {
    if (conditionNode.type === 'comparison') {
      return this.containsD20(conditionNode.left) || this.containsD20(conditionNode.right);
    }
    return false;
  }

  // 将AST节点转换为字符串表示
  nodeToString(node) {
    if (!node) return '';
    
    switch (node.type) {
      case 'number':
        return node.value.toString();
      case 'dice':
        return `${node.count || ''}d${node.sides}`;
      case 'binary_op':
        return `${this.nodeToString(node.left)} ${node.operator} ${this.nodeToString(node.right)}`;
      case 'comparison':
        return `${this.nodeToString(node.left)} ${node.operator} ${this.nodeToString(node.right)}`;
      case 'conditional':
        return `${this.nodeToString(node.condition)} ? ${this.nodeToString(node.trueValue)} : ${this.nodeToString(node.falseValue)}`;
      case 'group':
        return `(${this.nodeToString(node.expression)})`;
      default:
        return node.value ? node.value.toString() : '';
    }
  }

  // 递归检查表达式中是否包含d20
  containsD20(node) {
    if (node.type === 'dice' && node.sides === 20) {
      return true;
    }
    if (node.type === 'binary_op') {
      return this.containsD20(node.left) || this.containsD20(node.right);
    }
    return false;
  }

  // 处理暴击与命中重合的条件表达式
  calculateConditionalWithCriticalOverlap(conditionNode, trueValueNode, falseValueNode, baseConditionResult) {
    const criticalRate = this.criticalOptions.criticalRate;
    
    // 对于d20系统，暴击通常发生在20（5%）
    const criticalThreshold = 21 - Math.ceil(criticalRate / 5); // 5%对应20，10%对应19-20，依此类推
    
    // 分别计算普通命中、暴击命中、失败的概率和结果
    let normalHitProbability = 0;
    let criticalHitProbability = 0;
    let missProbability = 0;
    
    // 检查条件是否涉及简单的d20比较
    if (this.isSimpleD20Condition(conditionNode)) {
      const threshold = this.extractThresholdFromCondition(conditionNode);
      const operator = conditionNode.operator;
      
      // 计算各种情况的概率
      for (let roll = 1; roll <= 20; roll++) {
        let hits = false;
        const isCritical = roll >= criticalThreshold;
        
        switch (operator) {
          case '>':
            hits = roll > threshold;
            break;
          case '>=':
            hits = roll >= threshold;
            break;
          case '<':
            hits = roll < threshold;
            break;
          case '<=':
            hits = roll <= threshold;
            break;
          case '=':
          case '==':
            hits = roll === threshold;
            break;
        }
        
        if (hits && isCritical) {
          criticalHitProbability += 0.05; // 每个值5%概率
        } else if (hits && !isCritical) {
          normalHitProbability += 0.05;
        } else {
          missProbability += 0.05;
        }
      }
    } else {
      // 对于复杂条件，使用近似计算
      // 假设暴击概率均匀分布在成功概率中
      normalHitProbability = baseConditionResult.successProbability * (1 - criticalRate / 100);
      criticalHitProbability = baseConditionResult.successProbability * (criticalRate / 100);
      missProbability = baseConditionResult.failureProbability;
    }
    
    // 计算各种情况下的结果分布
    this.isCalculatingCritical = false;
    const normalHitResult = this.evaluate(trueValueNode);
    const missResult = this.evaluate(falseValueNode);
    
    this.isCalculatingCritical = true;
    const criticalHitResult = this.evaluate(trueValueNode);
    
    // 合并结果
    const result = {};
    
    // 计算各分布的总计数
    const normalHitDist = normalHitResult.combined || normalHitResult.distribution || normalHitResult;
    const normalHitTotal = Object.values(normalHitDist).reduce((sum, count) => sum + count, 0);
    
    const criticalHitDist = criticalHitResult.combined || criticalHitResult.distribution || criticalHitResult;
    const criticalHitTotal = Object.values(criticalHitDist).reduce((sum, count) => sum + count, 0);
    
    const missDist = missResult.combined || missResult.distribution || missResult;
    const missTotal = Object.values(missDist).reduce((sum, count) => sum + count, 0);
    
    // 普通命中的贡献
    for (const [value, count] of Object.entries(normalHitDist)) {
      const val = parseFloat(value);
      const relativeProbability = normalHitTotal > 0 ? count / normalHitTotal : 0;
      const weightedCount = relativeProbability * normalHitProbability;
      result[val] = (result[val] || 0) + weightedCount;
    }
    
    // 暴击命中的贡献
    for (const [value, count] of Object.entries(criticalHitDist)) {
      const val = parseFloat(value);
      const relativeProbability = criticalHitTotal > 0 ? count / criticalHitTotal : 0;
      const weightedCount = relativeProbability * criticalHitProbability;
      result[val] = (result[val] || 0) + weightedCount;
    }
    
    // 失败的贡献
    for (const [value, count] of Object.entries(missDist)) {
      const val = parseFloat(value);
      const relativeProbability = missTotal > 0 ? count / missTotal : 0;
      const weightedCount = relativeProbability * missProbability;
      result[val] = (result[val] || 0) + weightedCount;
    }
    
    // 标准化结果
    const totalWeight = Object.values(result).reduce((sum, weight) => sum + weight, 0);
    const normalizedResult = {};
    // 计算原始总数：20个d20结果 × 对应分支的总数
    const maxBranchCount = Math.max(normalHitTotal, criticalHitTotal, missTotal);
    const originalTotalCount = 20 * maxBranchCount; // d20有20种可能
    const scaleFactor = originalTotalCount;
    
    for (const [value, weight] of Object.entries(result)) {
      const normalizedCount = Math.round(weight * scaleFactor / totalWeight);
      if (normalizedCount > 0) {
        normalizedResult[value] = normalizedCount;
      }
    }
    
    // 收集嵌套条件信息（针对条件暴击）
    const nestedConditions = [];
    
    // 主条件信息
    const currentCondition = {
      condition: this.nodeToString(conditionNode),
      successProbability: normalHitProbability + criticalHitProbability,
      failureProbability: missProbability,
      level: 0,
      isCriticalCondition: true,
      normalHitProbability: normalHitProbability,
      criticalHitProbability: criticalHitProbability
    };
    nestedConditions.push(currentCondition);
    
    // 收集真值分支中的条件（普通命中）
    if (normalHitResult.nestedConditions) {
      normalHitResult.nestedConditions.forEach(cond => {
        nestedConditions.push({
          ...cond,
          level: cond.level + 1,
          parentProbability: normalHitProbability,
          conditionalProbability: cond.successProbability * normalHitProbability,
          path: 'normal_hit'
        });
      });
    }
    
    // 收集真值分支中的条件（暴击命中）
    if (criticalHitResult.nestedConditions) {
      criticalHitResult.nestedConditions.forEach(cond => {
        nestedConditions.push({
          ...cond,
          level: cond.level + 1,
          parentProbability: criticalHitProbability,
          conditionalProbability: cond.successProbability * criticalHitProbability,
          path: 'critical_hit'
        });
      });
    }
    
    // 收集假值分支中的条件（失败）
    if (missResult.nestedConditions) {
      missResult.nestedConditions.forEach(cond => {
        nestedConditions.push({
          ...cond,
          level: cond.level + 1,
          parentProbability: missProbability,
          conditionalProbability: cond.successProbability * missProbability,
          path: 'miss'
        });
      });
    }
    
    return {
      type: 'conditional_critical',
      combined: normalizedResult,
      normalHitValues: normalHitDist,
      criticalHitValues: criticalHitDist,
      missValues: missDist,
      probabilities: {
        normalHit: normalHitProbability,
        criticalHit: criticalHitProbability,
        miss: missProbability
      },
      nestedConditions: nestedConditions
    };
  }

  // 检查是否是简单的d20条件（d20 > threshold 形式）
  isSimpleD20Condition(conditionNode) {
    if (conditionNode.type !== 'comparison') return false;
    
    const left = conditionNode.left;
    const right = conditionNode.right;
    
    // 检查左边是否是单独的d20
    if (left.type === 'dice' && left.sides === 20 && left.count === 1) {
      return right.type === 'number';
    }
    
    return false;
  }

  // 从条件中提取阈值
  extractThresholdFromCondition(conditionNode) {
    if (conditionNode.right && conditionNode.right.type === 'number') {
      return conditionNode.right.value;
    }
    return 0;
  }
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
        // 兼容旧版本的单表达式和新版本的多表达式
        const expressions = node.expressions || [node.expression];
        return this.calculateKeep(expressions, node.count, node.keepType);
        
      case 'reroll':
        return this.calculateReroll(node.dice, node.minValue, node.maxValue, node.maxRerolls);
        
      case 'exploding':
        return this.calculateExploding(node);
        
      case 'exploding_sum':
        return this.calculateExplodingSum(node);
        
      case 'comparison':
        return this.calculateComparison(node.left, node.right, node.operator);
        
      case 'conditional':
        return this.calculateConditional(node.condition, node.trueValue, node.falseValue);
        
      case 'binary_op':
        return this.calculateBinaryOp(node.left, node.right, node.operator);
        
      case 'critical_double':
        return this.calculateCriticalDouble(node.expression);
        
      case 'critical_switch':
        return this.calculateCriticalSwitch(node.normalExpression, node.criticalExpression);
        
      case 'critical_only':
        return this.calculateCriticalOnly(node.expression);
        
      default:
        throw new Error(`未知节点类型: ${node.type}`);
    }
  }

  // 计算暴击翻倍 #表达式#
  calculateCriticalDouble(expression) {
    const result = this.evaluate(expression);
    
    if (this.isCalculatingCritical) {
      // 暴击时：结果翻倍
      const doubledResult = {};
      const distribution = result.distribution || result;
      
      for (const [value, count] of Object.entries(distribution)) {
        const doubledValue = parseFloat(value) * 2;
        doubledResult[doubledValue] = count;
      }
      
      return doubledResult;
    } else {
      // 非暴击时：正常结果
      return result;
    }
  }

  // 计算暴击切换 |普通|暴击|
  calculateCriticalSwitch(normalExpression, criticalExpression) {
    if (this.isCalculatingCritical) {
      // 暴击时：使用暴击表达式
      return this.evaluate(criticalExpression);
    } else {
      // 非暴击时：使用普通表达式
      return this.evaluate(normalExpression);
    }
  }

  // 计算暴击专用 [表达式]
  calculateCriticalOnly(expression) {
    if (this.isCalculatingCritical) {
      // 暴击时：计算表达式
      return this.evaluate(expression);
    } else {
      // 非暴击时：返回0
      return { 0: 1 };
    }
  }

  // 计算带暴击的结果
  calculateWithCritical(ast, criticalRate) {
    const criticalProbability = criticalRate / 100;
    const normalProbability = 1 - criticalProbability;
    
    // 分别计算普通情况和暴击情况
    this.isCalculatingCritical = false;
    const normalResult = this.evaluate(ast);
    
    this.isCalculatingCritical = true;
    const criticalResult = this.evaluate(ast);
    
    // 处理不同类型的结果
    if (normalResult.type === 'conditional' || criticalResult.type === 'conditional' ||
        normalResult.type === 'conditional_critical' || criticalResult.type === 'conditional_critical') {
      // 如果是条件表达式，返回特殊处理
      // 但是如果已经是 conditional_critical 类型，需要格式化返回
      if (normalResult.type === 'conditional_critical') {
        const result = normalResult;
        const average = this.calculateAverage(result);
        const totalOutcomes = Object.values(result.combined).reduce((sum, count) => sum + count, 0);
        
        return {
          distribution: result.combined,
          average,
          totalOutcomes,
          success: true,
          isConditionalCritical: true,
          normalHitValues: result.normalHitValues,
          criticalHitValues: result.criticalHitValues,
          missValues: result.missValues,
          probabilities: result.probabilities
        };
      }
      if (criticalResult.type === 'conditional_critical') {
        const result = criticalResult;
        const average = this.calculateAverage(result);
        const totalOutcomes = Object.values(result.combined).reduce((sum, count) => sum + count, 0);
        
        return {
          distribution: result.combined,
          average,
          totalOutcomes,
          success: true,
          isConditionalCritical: true,
          normalHitValues: result.normalHitValues,
          criticalHitValues: result.criticalHitValues,
          missValues: result.missValues,
          probabilities: result.probabilities
        };
      }
      return this.handleConditionalCritical(normalResult, criticalResult, normalProbability, criticalProbability);
    }
    
    // 合并普通分布结果
    const combinedDistribution = {};
    const normalDist = normalResult.distribution || normalResult;
    const criticalDist = criticalResult.distribution || criticalResult;
    
    // 计算各分布的总计数
    const normalTotal = Object.values(normalDist).reduce((sum, count) => sum + count, 0);
    const criticalTotal = Object.values(criticalDist).reduce((sum, count) => sum + count, 0);
    
    // 添加普通情况的权重
    for (const [value, count] of Object.entries(normalDist)) {
      const val = parseFloat(value);
      const relativeProbability = count / normalTotal;
      const weightedCount = relativeProbability * normalProbability;
      combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
    }
    
    // 添加暴击情况的权重
    for (const [value, count] of Object.entries(criticalDist)) {
      const val = parseFloat(value);
      const relativeProbability = count / criticalTotal;
      const weightedCount = relativeProbability * criticalProbability;
      combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
    }
    
    // 标准化结果
    const totalWeight = Object.values(combinedDistribution).reduce((sum, weight) => sum + weight, 0);
    const normalizedResult = {};
    // 使用原始总数作为缩放因子，保持总体可能性数量不变
    const originalTotalCount = normalTotal; // 普通和暴击情况应该有相同的总数
    const scaleFactor = originalTotalCount;
    
    for (const [value, weight] of Object.entries(combinedDistribution)) {
      const normalizedCount = Math.round(weight * scaleFactor / totalWeight);
      if (normalizedCount > 0) {
        normalizedResult[value] = normalizedCount;
      }
    }
    
    const average = this.calculateAverage({ distribution: normalizedResult });
    const totalOutcomes = Object.values(normalizedResult).reduce((sum, count) => sum + count, 0);
    
    return {
      distribution: normalizedResult,
      average,
      totalOutcomes,
      success: true,
      isCritical: true,
      criticalRate,
      normalDistribution: normalDist,
      criticalDistribution: criticalDist,
      normalProbability,
      criticalProbability
    };
  }

  // 处理条件表达式的暴击
  handleConditionalCritical(normalResult, criticalResult, normalProbability, criticalProbability) {
    // 简化处理：直接合并条件结果
    const normalDist = normalResult.combined || normalResult.distribution || normalResult;
    const criticalDist = criticalResult.combined || criticalResult.distribution || criticalResult;
    
    const combinedDistribution = {};
    
    // 计算各分布的总计数
    const normalTotal = Object.values(normalDist).reduce((sum, count) => sum + count, 0);
    const criticalTotal = Object.values(criticalDist).reduce((sum, count) => sum + count, 0);
    
    // 添加普通情况的权重
    for (const [value, count] of Object.entries(normalDist)) {
      const val = parseFloat(value);
      const relativeProbability = count / normalTotal;
      const weightedCount = relativeProbability * normalProbability;
      combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
    }
    
    // 添加暴击情况的权重
    for (const [value, count] of Object.entries(criticalDist)) {
      const val = parseFloat(value);
      const relativeProbability = count / criticalTotal;
      const weightedCount = relativeProbability * criticalProbability;
      combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
    }
    
    // 标准化结果
    const totalWeight = Object.values(combinedDistribution).reduce((sum, weight) => sum + weight, 0);
    const normalizedResult = {};
    // 使用原始总数作为缩放因子，保持总体可能性数量不变
    const originalTotalCount = normalTotal; // 普通和暴击情况应该有相同的总数
    const scaleFactor = originalTotalCount;
    
    for (const [value, weight] of Object.entries(combinedDistribution)) {
      const normalizedCount = Math.round(weight * scaleFactor / totalWeight);
      if (normalizedCount > 0) {
        normalizedResult[value] = normalizedCount;
      }
    }
    
    const average = this.calculateAverage({ distribution: normalizedResult });
    const totalOutcomes = Object.values(normalizedResult).reduce((sum, count) => sum + count, 0);
    
    return {
      distribution: normalizedResult, // 主要修复：确保 distribution 字段正确设置
      average,
      totalOutcomes,
      success: true,
      isCritical: true,
      criticalRate: this.criticalOptions.criticalRate,
      normalDistribution: normalDist,
      criticalDistribution: criticalDist,
      normalProbability,
      criticalProbability
    };
  }

  // 计算平均值（支持概率类型）
  calculateAverage(result) {
    if (result.type === 'probability') {
      // 对于概率类型，返回成功概率
      return result.successProbability;
    }
    
    if (result.type === 'conditional' || result.type === 'conditional_critical') {
      // 对于条件类型，计算合并分布的平均值
      const distribution = result.combined;
      let totalSum = 0;
      let totalCount = 0;
      
      for (const [value, count] of Object.entries(distribution)) {
        totalSum += parseFloat(value) * count;
        totalCount += count;
      }
      
      return totalCount > 0 ? totalSum / totalCount : 0;
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
  calculate(formula, criticalOptions = {}) {
    try {
      this.criticalOptions = criticalOptions;
      
      const lexer = new Lexer(formula);
      const tokens = lexer.tokenize();
      
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      // 如果启用了暴击系统，需要分别计算普通和暴击情况
      if (criticalOptions.criticalEnabled && criticalOptions.criticalRate > 0) {
        return this.calculateWithCritical(ast, criticalOptions.criticalRate);
      } else {
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
        } else if (result.type === 'conditional') {
          const totalOutcomes = Object.values(result.combined).reduce((sum, count) => sum + count, 0);
          
          return {
            distribution: result.combined,
            average,
            totalOutcomes,
            success: true,
            isConditional: true,
            trueValues: result.trueValues,
            falseValues: result.falseValues,
            condition: result.condition,
            nestedConditions: result.nestedConditions || []
          };
        } else if (result.type === 'conditional_critical') {
          const totalOutcomes = Object.values(result.combined).reduce((sum, count) => sum + count, 0);
          
          return {
            distribution: result.combined,
            average,
            totalOutcomes,
            success: true,
            isConditionalCritical: true,
            normalHitValues: result.normalHitValues,
            criticalHitValues: result.criticalHitValues,
            missValues: result.missValues,
            probabilities: result.probabilities,
            nestedConditions: result.nestedConditions || []
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

