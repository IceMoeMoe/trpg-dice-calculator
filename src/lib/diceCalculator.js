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
        // 处理开头的'd'（如d20）- 小写d，普通骰子
        this.tokens.push({ type: 'd', value: 'd' });
        this.position++;
      } else if (char === 'D' && this.position === 0) {
        // 处理开头的'D'（如D20）- 大写D，暴击检定骰
        this.tokens.push({ type: 'D', value: 'D' });
        this.position++;
      } else if (char === 'd') {
        // 检查是否是 'd_' 开头的骰子引用
        if (this.position + 1 < this.input.length && this.input[this.position + 1] === '_') {
          this.readIdentifier();
        } else if (this.position > 0 && this.isDigit(this.input[this.position - 1])) {
          // 这个'd'是掷骰表达式的一部分，在readNumber中已经处理
          this.tokens.push({ type: 'd', value: 'd' });
          this.position++;
        } else {
          this.tokens.push({ type: 'd', value: 'd' });
          this.position++;
        }
      } else if (char === 'D') {
        // 检查是否是 'D_' 开头的骰子引用
        if (this.position + 1 < this.input.length && this.input[this.position + 1] === '_') {
          this.readIdentifier();
        } else if (this.position > 0 && this.isDigit(this.input[this.position - 1])) {
          // 这个'D'是掷骰表达式的一部分，在readNumber中已经处理
          this.tokens.push({ type: 'D', value: 'D' });
          this.position++;
        } else {
          this.tokens.push({ type: 'D', value: 'D' });
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
      } else if (char === '_') {
        this.tokens.push({ type: 'UNDERSCORE', value: '_' });
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
    
    // 检查数字后面是否跟着 'd' 或 'D'，如果是则解析为掷骰表达式
    if (this.position < this.input.length && (this.input[this.position] === 'd' || this.input[this.position] === 'D')) {
      const diceChar = this.input[this.position];
      const isCriticalDice = diceChar === 'D'; // 大写D表示暴击检定骰
      this.position++; // 跳过 'd' 或 'D'
      
      // 读取骰子面数
      let sides = '';
      while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
        sides += this.input[this.position];
        this.position++;
      }
      
      if (sides === '') {
        throw new Error(`${diceChar}后面必须跟数字`);
      }
      
      this.tokens.push({ 
        type: 'DICE', 
        value: { count: parseInt(number), sides: parseInt(sides), isCriticalDice: isCriticalDice }
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
    } else if (this.input[this.position] === 'e') {
      // 特殊处理总和型爆炸骰语法：读取完整的修饰符串（包含波浪号）
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
             (this.isLetter(this.input[this.position]) || this.isDigit(this.input[this.position]) || this.input[this.position] === '_')) {
        identifier += this.input[this.position];
        this.position++;
      }
    }
    
    // 智能解析复杂标识符（如 d6r1, D6r1, d6r1~2e1, 3d10s8x10l5 等）
    if ((identifier.includes('d') || identifier.includes('D')) && identifier.includes('r')) {
      // 尝试拆分掷骰和重骰部分
      const diceMatch = identifier.match(/^(\d*)([dD])(\d+)(.*)$/);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const diceChar = diceMatch[2];
        const sides = parseInt(diceMatch[3]);
        const remaining = diceMatch[4];
        const isCriticalDice = diceChar === 'D';
        
        // 添加掷骰token
        this.tokens.push({ 
          type: 'DICE', 
          value: { count, sides, isCriticalDice }
        });
        
        // 处理剩余的重骰部分
        if (remaining) {
          this.parseRerollFromString(remaining);
        }
        return;
      }
    }
    
    // 智能解析掷骰+爆炸骰（如 3d10s8~10x10l5, 3D10s8~10x10l5）
    if ((identifier.includes('d') || identifier.includes('D')) && identifier.includes('s')) {
      const diceMatch = identifier.match(/^(\d*)([dD])(\d+)(.*)$/);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const diceChar = diceMatch[2];
        const sides = parseInt(diceMatch[3]);
        const remaining = diceMatch[4];
        const isCriticalDice = diceChar === 'D';
        
        // 添加掷骰token
        this.tokens.push({ 
          type: 'DICE', 
          value: { count, sides, isCriticalDice }
        });
        
        // 处理剩余的爆炸骰部分
        if (remaining) {
          this.parseExplodingFromString(remaining);
        }
        return;
      }
    }
    
    // 智能解析掷骰+总和型爆炸骰（如 3d10e10l5, 3D10e10l5）
    if ((identifier.includes('d') || identifier.includes('D')) && identifier.includes('e') && !identifier.includes('r')) {
      const diceMatch = identifier.match(/^(\d*)([dD])(\d+)(.*)$/);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const diceChar = diceMatch[2];
        const sides = parseInt(diceMatch[3]);
        const remaining = diceMatch[4];
        const isCriticalDice = diceChar === 'D';
        
        // 添加掷骰token
        this.tokens.push({ 
          type: 'DICE', 
          value: { count, sides, isCriticalDice }
        });
        
        // 处理剩余的总和型爆炸骰部分
        if (remaining) {
          this.parseExplodingSumFromString(remaining);
        }
        return;
      }
    }
    
    // 检查是否是骰子引用 (如 "d_1", "d_2", "D_1", "D_2")
    const diceRefMatch = identifier.match(/^([dD])_(\d+)$/);
    if (diceRefMatch) {
      const diceChar = diceRefMatch[1];
      const diceId = parseInt(diceRefMatch[2]);
      const isCriticalDice = diceChar === 'D';
      
      this.tokens.push({ 
        type: 'DICE_REF', 
        value: { id: diceId, isCriticalDice }
      });
      return;
    }
    
    // 检查是否是掷骰表达式 (如 "2d6", "2D6", "d20" 或 "D20")
    if ((identifier.includes('d') || identifier.includes('D')) && !identifier.includes('r')) {
      const diceMatch = identifier.match(/^(\d*)([dD])(\d+)$/);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const diceChar = diceMatch[2];
        const sides = parseInt(diceMatch[3]);
        const isCriticalDice = diceChar === 'D';
        
        this.tokens.push({ 
          type: 'DICE', 
          value: { count, sides, isCriticalDice }
        });
        return;
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
    
    // 检查是否是爆炸骰操作 (如 "s8~10x9~10l5" 表示8~10成功，9~10爆炸，最多5次)
    if (identifier.startsWith('s')) {
      const explodeMatch = identifier.match(/^s(\d+)(?:~(\d+))?(?:x(\d+)(?:~(\d+))?)?(?:l(\d+))?$/);
      if (explodeMatch) {
        const minSuccess = parseInt(explodeMatch[1]);
        const maxSuccess = explodeMatch[2] ? parseInt(explodeMatch[2]) : minSuccess;
        const minExplode = explodeMatch[3] ? parseInt(explodeMatch[3]) : null;
        const maxExplode = explodeMatch[4] ? parseInt(explodeMatch[4]) : minExplode;
        const maxExplosions = explodeMatch[5] ? parseInt(explodeMatch[5]) : 10;
        
        this.tokens.push({ 
          type: 'EXPLODING', 
          value: { 
            minSuccess, 
            maxSuccess, 
            minExplode,
            maxExplode,
            maxExplosions 
          }
        });
        return;
      }
    }
    
    // 检查是否是总和型爆炸骰操作 (如 "e10l5" 或 "e9~10l2" 表示9~10爆炸，最多2次，计算总和)
    if (identifier.startsWith('e')) {
      const explodeSumMatch = identifier.match(/^e(\d+)(?:~(\d+))?(?:l(\d+))?$/);
      if (explodeSumMatch) {
        const minExplode = parseInt(explodeSumMatch[1]);
        const maxExplode = explodeSumMatch[2] ? parseInt(explodeSumMatch[2]) : minExplode;
        const maxExplosions = explodeSumMatch[3] ? parseInt(explodeSumMatch[3]) : 10;
        
        this.tokens.push({ 
          type: 'EXPLODING_SUM', 
          value: { 
            minExplode,
            maxExplode,
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
    const match = explodingStr.match(/^s(\d+)(?:~(\d+))?(?:x(\d+)(?:~(\d+))?)?(?:l(\d+))?$/);
    if (match) {
      const minSuccess = parseInt(match[1]);
      const maxSuccess = match[2] ? parseInt(match[2]) : minSuccess;
      const minExplode = match[3] ? parseInt(match[3]) : null;
      const maxExplode = match[4] ? parseInt(match[4]) : minExplode; // 如果没有范围，使用单个值
      const maxExplosions = match[5] ? parseInt(match[5]) : 10;
      
      this.tokens.push({ 
        type: 'EXPLODING', 
        value: { 
          minSuccess, 
          maxSuccess, 
          minExplode,
          maxExplode,
          maxExplosions 
        }
      });
    } else {
      throw new Error(`无法解析爆炸骰字符串: ${explodingStr}`);
    }
  }
  
  // 辅助方法：从字符串解析总和型爆炸骰部分
  parseExplodingSumFromString(explodingSumStr) {
    const match = explodingSumStr.match(/^e(\d+)(?:~(\d+))?(?:l(\d+))?$/);
    if (match) {
      const minExplode = parseInt(match[1]);
      const maxExplode = match[2] ? parseInt(match[2]) : minExplode;
      const maxExplosions = match[3] ? parseInt(match[3]) : 10;
      
      this.tokens.push({ 
        type: 'EXPLODING_SUM', 
        value: { 
          minExplode,
          maxExplode,
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
}

// 掷骰结果计算器
class DiceCalculator {
  constructor() {
    this.diceResults = new Map(); // 存储骰子ID到结果的映射
    this.criticalOptions = null; // 暴击选项
    this.isCalculatingCritical = false; // 是否正在计算暴击情况
  }
  
  // 设置骰子结果映射
  setDiceResults(diceResults) {
    this.diceResults = diceResults;
  }
  
  // 获取骰子结果映射
  getDiceResults() {
    return this.diceResults;
  }
  
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
        // 过滤掉非数字键，避免NaN
        return Object.entries(dist)
          .filter(([value, count]) => !isNaN(parseInt(value)))
          .map(([value, count]) => ({
            values: [parseInt(value)],
            count
          }));
      }
      
      const firstDist = distributions[0];
      const restCombinations = generateMultipleExpressionCombinations(distributions.slice(1));
      const combinations = [];
      
      // 过滤掉非数字键，避免NaN
      const filteredEntries = Object.entries(firstDist)
        .filter(([value, count]) => !isNaN(parseInt(value)));
      
      for (const [value, count] of filteredEntries) {
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
    const { baseExpression, diceNode, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions } = node;
    
    // 获取基础表达式的结果分布（可能包含重骰等操作）
    const baseResult = this.evaluate(baseExpression);
    const baseDist = this.extractDistribution(baseResult);
    const { count, sides } = diceNode;
    
    // 计算单个骰子的爆炸结果分布（包含成功数统计）
    const singleDiceExplodingOutcomes = this.generateSingleDiceExplodingOutcomes(
      sides, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions
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
    
    const explodingResult = combineMultipleDice(count, singleDiceExplodingOutcomes);
    
    // 保留原始骰子的暴击标记
    if (diceNode.isCriticalDice) {
      explodingResult.isCriticalDice = true;
    }
    
    return explodingResult;
  }

  // 生成单个骰子的爆炸结果分布（成功计数）
  generateSingleDiceExplodingOutcomes(sides, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions) {
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
        
        // 检查是否爆炸（支持范围爆炸或单值爆炸）
        let shouldExplode = false;
        if (minExplode !== null && maxExplode !== null) {
          // 范围爆炸
          shouldExplode = rollValue >= minExplode && rollValue <= maxExplode && explosionsUsed < maxExplosions;
        } else if (minExplode !== null) {
          // 单值爆炸（兼容旧版本）
          shouldExplode = rollValue === minExplode && explosionsUsed < maxExplosions;
        }
        
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
    // 对于爆炸骰，需要更大的缩放因子来保持精度
    const scaleFactor = Math.pow(sides, Math.min(maxExplosions + 2, 10)); // 提高精度限制
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
    const { baseExpression, diceNode, minExplode, maxExplode, maxExplosions } = node;
    
    // 获取基础表达式的结果分布（可能包含重骰等操作）
    const baseResult = this.evaluate(baseExpression);
    const baseDist = this.extractDistribution(baseResult);
    const { count, sides } = diceNode;
    
    // 计算单个骰子的总和型爆炸结果分布
    const singleDiceExplodingSumOutcomes = this.generateSingleDiceExplodingSumOutcomes(
      sides, minExplode, maxExplode, maxExplosions
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
    
    const explodingSumResult = combineMultipleDice(count, singleDiceExplodingSumOutcomes);
    
    // 保留原始骰子的暴击标记
    if (diceNode.isCriticalDice) {
      explodingSumResult.isCriticalDice = true;
    }
    
    return explodingSumResult;
  }

  // 生成单个骰子的总和型爆炸结果分布
  generateSingleDiceExplodingSumOutcomes(sides, minExplode, maxExplode, maxExplosions) {
    const outcomes = {};
    
    // 递归函数计算爆炸结果，返回总和分布
    function calculateWithExplosions(currentSum, explosionsUsed, probability) {
      // 投掷一个骰子
      for (let rollValue = 1; rollValue <= sides; rollValue++) {
        const rollProbability = probability / sides;
        const newSum = currentSum + rollValue;
        
        // 检查是否爆炸（在指定范围内）
        const shouldExplode = rollValue >= minExplode && rollValue <= maxExplode && explosionsUsed < maxExplosions;
        
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
    // 对于爆炸骰，需要更大的缩放因子来保持精度
    const scaleFactor = Math.pow(sides, Math.min(maxExplosions + 2, 10)); // 提高精度限制
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
    
    // 如果启用了暴击系统且条件中包含暴击检定骰，使用特殊处理
    if (this.criticalOptions && this.criticalOptions.criticalEnabled && this.hasCriticalDiceInCondition(conditionNode)) {
      return this.calculateConditionalWithCriticalOverlap(conditionNode, trueValueNode, falseValueNode, conditionResult);
    }
    
    const trueValueResult = this.evaluate(trueValueNode);
    const falseValueResult = this.evaluate(falseValueNode);
    
    const result = {};
    
    // 获取真值和假值的分布
    const trueDist = this.extractDistribution(trueValueResult);
    const falseDist = this.extractDistribution(falseValueResult);
    
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

  // 检查条件中是否包含暴击检定骰
  hasCriticalDiceInCondition(conditionNode) {
    return this.containsCriticalDice(conditionNode);
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

  // 递归检查表达式中是否包含条件表达式
  containsConditionalExpression(node) {
    if (!node) return false;
    
    if (node.type === 'conditional' || node.type === 'comparison') {
      return true;
    }
    
    if (node.type === 'binary_op') {
      return this.containsConditionalExpression(node.left) || this.containsConditionalExpression(node.right);
    }
    
    if (node.type === 'keep' && node.expressions) {
      return node.expressions.some(expr => this.containsConditionalExpression(expr));
    }
    
    if (node.type === 'reroll' && node.dice) {
      return this.containsConditionalExpression(node.dice);
    }
    
    if (node.type === 'exploding' || node.type === 'exploding_sum') {
      return this.containsConditionalExpression(node.baseExpression);
    }
    
    if (node.type === 'critical_double' && node.expression) {
      return this.containsConditionalExpression(node.expression);
    }
    
    if (node.type === 'critical_switch') {
      return this.containsConditionalExpression(node.normalExpression) || 
             this.containsConditionalExpression(node.criticalExpression);
    }
    
    if (node.type === 'critical_only' && node.expression) {
      return this.containsConditionalExpression(node.expression);
    }
    
    if (node.condition) {
      return this.containsConditionalExpression(node.condition);
    }
    
    if (node.trueValue) {
      return this.containsConditionalExpression(node.trueValue);
    }
    
    if (node.falseValue) {
      return this.containsConditionalExpression(node.falseValue);
    }
    
    return false;
  }

  // 递归检查表达式中是否包含暴击检定骰
  containsCriticalDice(node) {
    if (!node) return false;
    
    if (node.type === 'dice' && node.isCriticalDice) {
      return true;
    }
    if (node.type === 'dice_ref' && node.isCriticalDice) {
      return true;
    }
    if (node.type === 'reroll' && node.dice && node.dice.isCriticalDice) {
      return true;
    }
    if (node.type === 'exploding' && node.diceNode && node.diceNode.isCriticalDice) {
      return true;
    }
    if (node.type === 'exploding_sum' && node.diceNode && node.diceNode.isCriticalDice) {
      return true;
    }
    if (node.type === 'binary_op') {
      return this.containsCriticalDice(node.left) || this.containsCriticalDice(node.right);
    }
    if (node.type === 'keep' && node.expressions) {
      return node.expressions.some(expr => this.containsCriticalDice(expr));
    }
    if (node.type === 'conditional') {
      return this.containsCriticalDice(node.condition) || 
             this.containsCriticalDice(node.trueValue) || 
             this.containsCriticalDice(node.falseValue);
    }
    if (node.type === 'comparison') {
      return this.containsCriticalDice(node.left) || this.containsCriticalDice(node.right);
    }
    if (node.type === 'critical_double' || node.type === 'critical_only') {
      return this.containsCriticalDice(node.expression);
    }
    if (node.type === 'critical_switch') {
      return this.containsCriticalDice(node.normalExpression) || 
             this.containsCriticalDice(node.criticalExpression);
    }
    if (node.left && this.containsCriticalDice(node.left)) {
      return true;
    }
    if (node.right && this.containsCriticalDice(node.right)) {  
      return true;
    }
    if (node.expression && this.containsCriticalDice(node.expression)) {
      return true;
    }
    if (node.baseExpression && this.containsCriticalDice(node.baseExpression)) {
      return true;
    }
    if (node.diceNode && this.containsCriticalDice(node.diceNode)) {
      return true;
    }
    return false;
  }

  // 处理暴击与命中重合的条件表达式
  calculateConditionalWithCriticalOverlap(conditionNode, trueValueNode, falseValueNode, baseConditionResult) {
    const criticalRate = this.criticalOptions.criticalRate;
    
    // 获取骰子信息
    const diceInfo = this.getDiceInfoFromCondition(conditionNode);
    const diceSides = diceInfo.sides;
    const diceCount = diceInfo.count;
    
    // 计算实际的暴击概率 - 应该基于原始暴击检定骰，而不是表达式结果
    let actualCriticalProbability = 0;
    
    // 暴击判定应该始终基于原始的暴击检定骰面数
    // 不管条件表达式如何，暴击概率都是基于原始骰子值
    const criticalSides = Math.max(1, Math.round(diceSides * criticalRate / 100));
    actualCriticalProbability = criticalSides / diceSides;
    
    // 重新计算条件结果，区分暴击和非暴击情况
    const conditionResult = this.evaluateConditionWithCritical(conditionNode, actualCriticalProbability);
    
    // 计算各种情况下的结果分布
    this.isCalculatingCritical = false;
    const normalSuccessResult = this.evaluate(trueValueNode);
    const failureResult = this.evaluate(falseValueNode);
    
    this.isCalculatingCritical = true;
    const criticalSuccessResult = this.evaluate(trueValueNode);
    
    // 提取各分布数据
    const normalSuccessDist = this.extractDistribution(normalSuccessResult);
    const criticalSuccessDist = this.extractDistribution(criticalSuccessResult);
    const failureDist = this.extractDistribution(failureResult);
    
    // 使用基于骰子总可能组合数的缩放因子
    const totalPossibleOutcomes = Math.pow(diceSides, diceCount) || 20;
    const scaleFactor = Math.max(totalPossibleOutcomes, 400);
    
    // 合并结果，使用正确的计数
    const result = {};
    
    // 普通成功的贡献
    const normalSuccessCount = Math.round(scaleFactor * conditionResult.normalSuccessProbability);
    if (normalSuccessCount > 0) {
      const normalSuccessTotal = Object.values(normalSuccessDist).reduce((sum, count) => sum + count, 0);
      for (const [value, count] of Object.entries(normalSuccessDist)) {
        const val = parseFloat(value);
        const relativeProbability = normalSuccessTotal > 0 ? count / normalSuccessTotal : 0;
        const weightedCount = Math.round(relativeProbability * normalSuccessCount);
        if (weightedCount > 0) {
          result[val] = (result[val] || 0) + weightedCount;
        }
      }
    }
    
    // 暴击成功的贡献
    const criticalSuccessCount = Math.round(scaleFactor * conditionResult.criticalSuccessProbability);
    if (criticalSuccessCount > 0) {
      const criticalSuccessTotal = Object.values(criticalSuccessDist).reduce((sum, count) => sum + count, 0);
      for (const [value, count] of Object.entries(criticalSuccessDist)) {
        const val = parseFloat(value);
        const relativeProbability = criticalSuccessTotal > 0 ? count / criticalSuccessTotal : 0;
        const weightedCount = Math.round(relativeProbability * criticalSuccessCount);
        if (weightedCount > 0) {
          result[val] = (result[val] || 0) + weightedCount;
        }
      }
    }
    
    // 失败的贡献
    const failureCount = Math.round(scaleFactor * conditionResult.failureProbability);
    if (failureCount > 0) {
      const failureTotal = Object.values(failureDist).reduce((sum, count) => sum + count, 0);
      for (const [value, count] of Object.entries(failureDist)) {
        const val = parseFloat(value);
        const relativeProbability = failureTotal > 0 ? count / failureTotal : 0;
        const weightedCount = Math.round(relativeProbability * failureCount);
        if (weightedCount > 0) {
          result[val] = (result[val] || 0) + weightedCount;
        }
      }
    }
    
    // 收集嵌套条件信息 - 添加这部分逻辑
    const nestedConditions = [];
    
    // 收集当前条件信息（暴击条件特殊处理）
    const currentCondition = {
      condition: this.nodeToString(conditionNode),
      successProbability: conditionResult.normalSuccessProbability + conditionResult.criticalSuccessProbability,
      failureProbability: conditionResult.failureProbability,
      normalHitProbability: conditionResult.normalSuccessProbability,
      criticalHitProbability: conditionResult.criticalSuccessProbability,
      isCriticalCondition: true,
      level: 0
    };
    nestedConditions.push(currentCondition);
    
    // 递归收集普通命中分支中的条件
    if (normalSuccessResult.nestedConditions) {
      normalSuccessResult.nestedConditions.forEach(cond => {
        nestedConditions.push({
          ...cond,
          level: cond.level + 1,
          parentProbability: conditionResult.normalSuccessProbability,
          conditionalProbability: cond.successProbability * conditionResult.normalSuccessProbability,
          path: 'normal_hit'
        });
      });
    }
    
    // 递归收集暴击命中分支中的条件
    if (criticalSuccessResult.nestedConditions) {
      criticalSuccessResult.nestedConditions.forEach(cond => {
        nestedConditions.push({
          ...cond,
          level: cond.level + 1,
          parentProbability: conditionResult.criticalSuccessProbability,
          conditionalProbability: cond.successProbability * conditionResult.criticalSuccessProbability,
          path: 'critical_hit'
        });
      });
    }
    
    // 递归收集失败分支中的条件
    if (failureResult.nestedConditions) {
      failureResult.nestedConditions.forEach(cond => {
        nestedConditions.push({
          ...cond,
          level: cond.level + 1,
          parentProbability: conditionResult.failureProbability,
          conditionalProbability: cond.successProbability * conditionResult.failureProbability,
          path: 'miss'
        });
      });
    }
    
    // 计算实际暴击率
    const finalActualCriticalProbability = (conditionResult.normalSuccessProbability + conditionResult.criticalSuccessProbability) > 0 
      ? conditionResult.criticalSuccessProbability / (conditionResult.normalSuccessProbability + conditionResult.criticalSuccessProbability) 
      : 0;
    
    return {
      type: 'conditional_critical',
      combined: result,
      normalHitValues: normalSuccessDist,
      criticalHitValues: criticalSuccessDist,
      missValues: conditionResult.failureProbability > 0 ? failureDist : {},
      probabilities: {
        normalHit: conditionResult.normalSuccessProbability,
        criticalHit: conditionResult.criticalSuccessProbability,
        miss: conditionResult.failureProbability
      },
      actualCriticalProbability: isNaN(finalActualCriticalProbability) ? 0 : finalActualCriticalProbability,
      criticalProbability: criticalRate,
      nestedConditions: nestedConditions
    };
  }

  // 提取原始骰子值用于暴击判定
  extractRawDiceValues(node, targetValue) {
    const rawValues = [];
    
    const extractFromNode = (node, currentSum) => {
      if (!node) return;
      
      if (node.type === 'dice' && node.isCriticalDice) {
        // 对于暴击检定骰，我们需要计算出原始骰子的可能值
        // 从总值中减去其他部分来推算原始骰子值
        const diceMin = node.count || 1;
        const diceMax = (node.count || 1) * (node.sides || 20);
        
        // 尝试反推原始骰子值
        for (let diceValue = diceMin; diceValue <= diceMax; diceValue++) {
          const remainingValue = targetValue - diceValue;
          // 检查剩余值是否合理（可能来自其他部分）
          if (this.isValidRemainingValue(node, remainingValue, currentSum - diceValue)) {
            rawValues.push(diceValue);
          }
        }
        return;
      }
      
      if (node.type === 'binary_op') {
        if (node.operator === '+') {
          extractFromNode(node.left, currentSum);
          extractFromNode(node.right, currentSum);
        } else if (node.operator === '-') {
          extractFromNode(node.left, currentSum);
          extractFromNode(node.right, currentSum);
        }
      }
      
      if (node.type === 'keep' && node.expressions) {
        for (const expr of node.expressions) {
          extractFromNode(expr, currentSum);
        }
      }
    };
    
    extractFromNode(node, targetValue);
    return rawValues;
  }

  // 检查剩余值是否合理
  isValidRemainingValue(diceNode, remainingValue, expectedRemaining) {
    // 简单实现：允许一定的误差范围
    return Math.abs(remainingValue - expectedRemaining) <= 1;
  }

  // 获取原始骰子值的分布（不含加值）
  getRawDiceDistribution(node) {
    if (!node) return {};
    
    if (node.type === 'dice' && node.isCriticalDice) {
      return this.calculateBasicDice(node.count, node.sides);
    }
    
    if (node.type === 'dice_ref' && node.isCriticalDice) {
      return this.calculateBasicDice(node.count, node.sides);
    }
    
    // 处理重骰操作 - 返回原始骰子的分布
    if (node.type === 'reroll' && node.dice && node.dice.isCriticalDice) {
      return this.calculateBasicDice(node.dice.count, node.dice.sides);
    }
    
    // 处理爆炸骰操作 - 返回原始骰子的分布
    if (node.type === 'exploding' && node.diceNode && node.diceNode.isCriticalDice) {
      return this.calculateBasicDice(node.diceNode.count, node.diceNode.sides);
    }
    
    // 处理总和型爆炸骰操作 - 返回原始骰子的分布
    if (node.type === 'exploding_sum' && node.diceNode && node.diceNode.isCriticalDice) {
      return this.calculateBasicDice(node.diceNode.count, node.diceNode.sides);
    }
    
    if (node.type === 'binary_op') {
      // 对于二元操作，只返回暴击检定骰的部分
      const leftRaw = this.getRawDiceDistribution(node.left);
      const rightRaw = this.getRawDiceDistribution(node.right);
      
      // 返回非空的暴击检定骰分布
      if (Object.keys(leftRaw).length > 0) return leftRaw;
      if (Object.keys(rightRaw).length > 0) return rightRaw;
    }
    
    if (node.type === 'keep' && node.expressions) {
      // 对于keep操作，返回原始骰子的分布，而不是keep后的分布
      for (const expr of node.expressions) {
        if (expr.type === 'dice' && expr.isCriticalDice) {
          // 直接返回原始骰子的分布（单个骰子的分布）
          return this.calculateBasicDice(1, expr.sides);
        }
        const rawDist = this.getRawDiceDistribution(expr);
        if (Object.keys(rawDist).length > 0) return rawDist;
      }
    }
    
    return {};
  }

  // 评估条件表达式，区分暴击和非暴击情况
  evaluateConditionWithCritical(conditionNode, actualCriticalProbability) {
    if (conditionNode.type === 'comparison') {
      const leftResult = this.evaluate(conditionNode.left);
      const rightResult = this.evaluate(conditionNode.right);
      
      // 提取实际的分布数据
      const leftDistribution = this.extractDistribution(leftResult);
      const rightDistribution = this.extractDistribution(rightResult);
      
      // 获取骰子信息
      const diceInfo = this.getDiceInfoFromCondition(conditionNode);
      const diceSides = diceInfo.sides;
      
      // 判断暴击检定骰在哪一侧
      const leftHasCriticalDice = this.containsCriticalDice(conditionNode.left);
      const rightHasCriticalDice = this.containsCriticalDice(conditionNode.right);
      
      // 获取原始暴击检定骰的分布（不含加值）
      let rawDiceDistribution = {};
      if (leftHasCriticalDice) {
        rawDiceDistribution = this.getRawDiceDistribution(conditionNode.left);
      } else if (rightHasCriticalDice) {
        rawDiceDistribution = this.getRawDiceDistribution(conditionNode.right);
      }
      
      let totalSuccessCount = 0;
      let totalCriticalSuccessCount = 0;
      let totalFailureCount = 0;
      
      // 计算暴击对应的骰面范围 - 使用传入的实际暴击概率
      const criticalSides = Math.max(1, Math.round(diceSides * actualCriticalProbability));
      const criticalThreshold = diceSides - criticalSides + 1;
      
      // 如果右边是单个数值（不是分布），简化计算
      if (Object.keys(rightDistribution).length === 1 && Object.keys(rightDistribution)[0] !== undefined) {
        const rightValue = parseInt(Object.keys(rightDistribution)[0]);
        
        for (const [leftValue, leftCount] of Object.entries(leftDistribution)) {
          const leftVal = parseInt(leftValue);
          
          let success = false;
          switch (conditionNode.operator) {
            case '>':
              success = leftVal > rightValue;
              break;
            case '<':
              success = leftVal < rightValue;
              break;
            case '=':
            case '==':
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
            // 判断是否为暴击 - 基于原始骰子值而不是加值后的结果
            let isCritical = false;
            if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
              // 暴击检定骰在左侧，需要检查所有可能的原始骰子值
              // 对于每个成功的结果，检查对应的原始骰子值是否达到暴击阈值
              for (const [rawDiceValue, rawCount] of Object.entries(rawDiceDistribution)) {
                const rawVal = parseInt(rawDiceValue);
                if (rawVal >= criticalThreshold) {
                  // 计算在这个原始骰子值下，是否会产生当前的leftVal结果
                  if (this.canProduceResult(conditionNode.left, rawVal, leftVal)) {
                    isCritical = true;
                    break;
                  }
                }
              }
            } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
              // 暴击检定骰在右侧，检查右侧的原始骰子值
              for (const [rawDiceValue, rawCount] of Object.entries(rawDiceDistribution)) {
                const rawVal = parseInt(rawDiceValue);
                if (rawVal >= criticalThreshold) {
                  if (this.canProduceResult(conditionNode.right, rawVal, rightValue)) {
                    isCritical = true;
                    break;
                  }
                }
              }
            }
            
            if (isCritical) {
              totalCriticalSuccessCount += leftCount;
            } else {
              totalSuccessCount += leftCount;
            }
          } else {
            totalFailureCount += leftCount;
          }
        }
      } else if (Object.keys(leftDistribution).length === 1 && Object.keys(leftDistribution)[0] !== undefined) {
        // 如果左边是单个数值，右边是分布
        const leftValue = parseInt(Object.keys(leftDistribution)[0]);
        
        for (const [rightValue, rightCount] of Object.entries(rightDistribution)) {
          const rightVal = parseInt(rightValue);
          
          let success = false;
          switch (conditionNode.operator) {
            case '>':
              success = leftValue > rightVal;
              break;
            case '<':
              success = leftValue < rightVal;
              break;
            case '=':
            case '==':
              success = leftValue === rightVal;
              break;
            case '>=':
              success = leftValue >= rightVal;
              break;
            case '<=':
              success = leftValue <= rightVal;
              break;
          }
          
          if (success) {
            // 判断是否为暴击 - 基于原始骰子值而不是加值后的结果
            let isCritical = false;
            if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
              // 暴击检定骰在左侧，检查原始骰子值
              for (const [rawDiceValue, rawCount] of Object.entries(rawDiceDistribution)) {
                const rawVal = parseInt(rawDiceValue);
                if (rawVal >= criticalThreshold) {
                  if (this.canProduceResult(conditionNode.left, rawVal, leftValue)) {
                    isCritical = true;
                    break;
                  }
                }
              }
            } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
              // 暴击检定骰在右侧，检查右侧的原始骰子值
              for (const [rawDiceValue, rawCount] of Object.entries(rawDiceDistribution)) {
                const rawVal = parseInt(rawDiceValue);
                if (rawVal >= criticalThreshold) {
                  if (this.canProduceResult(conditionNode.right, rawVal, rightVal)) {
                    isCritical = true;
                    break;
                  }
                }
              }
            }
            
            if (isCritical) {
              totalCriticalSuccessCount += rightCount;
            } else {
              totalSuccessCount += rightCount;
            }
          } else {
            totalFailureCount += rightCount;
          }
        }
      } else {
        // 复杂情况：两边都是分布
        let totalCount = 0;
        
        for (const [leftVal, leftCount] of Object.entries(leftDistribution)) {
          for (const [rightVal, rightCount] of Object.entries(rightDistribution)) {
            const combinedCount = leftCount * rightCount;
            totalCount += combinedCount;
            
            const leftValue = parseFloat(leftVal);
            const rightValue = parseFloat(rightVal);
            
            let success = false;
            switch (conditionNode.operator) {
              case '>':
                success = leftValue > rightValue;
                break;
              case '<':
                success = leftValue < rightValue;
                break;
              case '=':
              case '==':
                success = leftValue === rightValue;
                break;
              case '>=':
                success = leftValue >= rightValue;
                break;
              case '<=':
                success = leftValue <= rightValue;
                break;
            }
            
            if (success) {
              // 判断是否为暴击 - 基于原始骰子值而不是加值后的结果
              let isCritical = false;
              if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
                // 暴击检定骰在左侧，检查原始骰子值
                for (const [rawDiceValue, rawCount] of Object.entries(rawDiceDistribution)) {
                  const rawVal = parseInt(rawDiceValue);
                  if (rawVal >= criticalThreshold) {
                    if (this.canProduceResult(conditionNode.left, rawVal, leftValue)) {
                      isCritical = true;
                      break;
                    }
                  }
                }
              } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
                // 暴击检定骰在右侧，检查右侧的原始骰子值
                for (const [rawDiceValue, rawCount] of Object.entries(rawDiceDistribution)) {
                  const rawVal = parseInt(rawDiceValue);
                  if (rawVal >= criticalThreshold) {
                    if (this.canProduceResult(conditionNode.right, rawVal, rightValue)) {
                      isCritical = true;
                      break;
                    }
                  }
                }
              }
              
              if (isCritical) {
                totalCriticalSuccessCount += combinedCount;
              } else {
                totalSuccessCount += combinedCount;
              }
            } else {
              totalFailureCount += combinedCount;
            }
          }
        }
      }
      
      const totalCount = totalSuccessCount + totalCriticalSuccessCount + totalFailureCount;
      
      return {
        normalSuccessProbability: totalCount > 0 ? totalSuccessCount / totalCount : 0,
        criticalSuccessProbability: totalCount > 0 ? totalCriticalSuccessCount / totalCount : 0,
        failureProbability: totalCount > 0 ? totalFailureCount / totalCount : 0
      };
    }
    
    // 默认回退到基础条件结果
    return {
      normalSuccessProbability: 0,
      criticalSuccessProbability: 0,
      failureProbability: 1
    };
  }

  // 在节点中找到暴击检定骰信息
  findCriticalDiceInNode(node) {
    if (!node) return null;
    
    if (node.type === 'dice' && node.isCriticalDice) {
      return { sides: node.sides || 20, count: node.count || 1 };
    }
    
    if (node.type === 'dice_ref' && node.isCriticalDice) {
      return { sides: node.sides || 20, count: node.count || 1 };
    }
    
    if (node.type === 'binary_op') {
      const leftResult = this.findCriticalDiceInNode(node.left);
      if (leftResult) return leftResult;
      
      const rightResult = this.findCriticalDiceInNode(node.right);
      if (rightResult) return rightResult;
    }
    
    if (node.type === 'keep' && node.expressions) {
      for (const expr of node.expressions) {
        const result = this.findCriticalDiceInNode(expr);
        if (result) return result;
      }
    }
    
    return null;
  }

  // 从条件中提取暴击检定骰信息
  getDiceInfoFromCondition(conditionNode) {
    const findCriticalDice = (node) => {
      if (!node) return null;
      
      if (node.type === 'dice' && node.isCriticalDice) {
        return { sides: node.sides || 20, count: node.count || 1 };
      }
      
      if (node.type === 'dice_ref' && node.isCriticalDice) {
        return { sides: node.sides || 20, count: node.count || 1 };
      }
      
      if (node.type === 'keep' && node.expressions) {
        for (const expr of node.expressions) {
          if ((expr.type === 'dice' || expr.type === 'dice_ref') && expr.isCriticalDice) {
            // 对于keep操作，暴击计算应该基于原始的骰子数量
            // 但是对于暴击概率计算，我们需要考虑的是单个骰子的面数
            // 而keep操作的暴击概率应该基于多个骰子中至少一个暴击的概率
            return { sides: expr.sides || 20, count: expr.count || 1 };
          }
        }
      }
      
      if (node.left) {
        const left = findCriticalDice(node.left);
        if (left) return left;
      }
      
      if (node.right) {
        const right = findCriticalDice(node.right);
        if (right) return right;
      }
      
      return null;
    };
    
    const dice = findCriticalDice(conditionNode);
    return dice || { sides: 20, count: 1 };
  }

  // 检查给定的原始骰子值是否能产生特定的最终结果
  canProduceResult(node, rawDiceValue, finalResult) {
    if (!node) return false;
    
    // 如果就是骰子本身，直接比较
    if ((node.type === 'dice' || node.type === 'dice_ref') && node.isCriticalDice) {
      return rawDiceValue === finalResult;
    }
    
    // 对于重骰操作，我们需要检查原始骰子值是否可能通过重骰产生最终结果
    if (node.type === 'reroll' && node.dice && node.dice.isCriticalDice) {
      // 对于重骰，原始骰子值有可能通过重骰机制产生任何在范围内的最终结果
      // 如果原始值在重骰范围内，它可能被重骰成其他值
      // 如果原始值不在重骰范围内，它保持不变
      const { minValue, maxValue } = node;
      if (rawDiceValue >= minValue && rawDiceValue <= maxValue) {
        // 在重骰范围内，可能产生任何合法的骰子值
        return finalResult >= 1 && finalResult <= node.dice.sides;
      } else {
        // 不在重骰范围内，保持原值
        return rawDiceValue === finalResult;
      }
    }
    
    // 对于爆炸骰操作，原始骰子值可能通过爆炸产生更大的结果
    if (node.type === 'exploding' && node.diceNode && node.diceNode.isCriticalDice) {
      // 对于爆炸骰，任何原始值都可能产生更大的最终结果
      // 这里采用简化处理：认为任何原始值都可能产生任何合法的最终结果
      return finalResult >= 0; // 爆炸骰计算成功数，所以结果应该>=0
    }
    
    // 对于总和型爆炸骰操作
    if (node.type === 'exploding_sum' && node.diceNode && node.diceNode.isCriticalDice) {
      // 对于总和型爆炸骰，原始值可能通过爆炸产生更大的总和
      // 最小可能结果就是原始值本身
      return finalResult >= rawDiceValue;
    }
    
    // 如果是二元操作
    if (node.type === 'binary_op') {
      const left = node.left;
      const right = node.right;
      
      // 检查哪边包含暴击检定骰
      if (this.containsCriticalDice(left)) {
        // 左边包含暴击检定骰
        if ((left.type === 'dice' || left.type === 'dice_ref') && left.isCriticalDice) {
          // 左边就是暴击检定骰，计算右边的贡献
          const rightContribution = this.calculateConstantContribution(right);
          
          switch (node.operator) {
            case '+':
              return rawDiceValue + rightContribution === finalResult;
            case '-':
              return rawDiceValue - rightContribution === finalResult;
            case '*':
              return rawDiceValue * rightContribution === finalResult;
            case '/':
              return rightContribution !== 0 && rawDiceValue / rightContribution === finalResult;
          }
        } else {
          // 左边是复合表达式，递归检查
          const rightContribution = this.calculateConstantContribution(right);
          let expectedLeftResult;
          
          switch (node.operator) {
            case '+':
              expectedLeftResult = finalResult - rightContribution;
              break;
            case '-':
              expectedLeftResult = finalResult + rightContribution;
              break;
            case '*':
              expectedLeftResult = rightContribution !== 0 ? finalResult / rightContribution : 0;
              break;
            case '/':
              expectedLeftResult = finalResult * rightContribution;
              break;
            default:
              return false;
          }
          
          return this.canProduceResult(left, rawDiceValue, expectedLeftResult);
        }
      } else if (this.containsCriticalDice(right)) {
        // 右边包含暴击检定骰
        if ((right.type === 'dice' || right.type === 'dice_ref') && right.isCriticalDice) {
          // 右边就是暴击检定骰，计算左边的贡献
          const leftContribution = this.calculateConstantContribution(left);
          
          switch (node.operator) {
            case '+':
              return leftContribution + rawDiceValue === finalResult;
            case '-':
              return leftContribution - rawDiceValue === finalResult;
            case '*':
              return leftContribution * rawDiceValue === finalResult;
            case '/':
              return rawDiceValue !== 0 && leftContribution / rawDiceValue === finalResult;
          }
        } else {
          // 右边是复合表达式，递归检查
          const leftContribution = this.calculateConstantContribution(left);
          let expectedRightResult;
          
          switch (node.operator) {
            case '+':
              expectedRightResult = finalResult - leftContribution;
              break;
            case '-':
              expectedRightResult = leftContribution - finalResult;
              break;
            case '*':
              expectedRightResult = leftContribution !== 0 ? finalResult / leftContribution : 0;
              break;
            case '/':
              expectedRightResult = finalResult !== 0 ? leftContribution / finalResult : 0;
              break;
            default:
              return false;
          }
          
          return this.canProduceResult(right, rawDiceValue, expectedRightResult);
        }
      }
    }
    
    // 如果是keep操作
    if (node.type === 'keep' && node.expressions) {
      for (const expr of node.expressions) {
        if (this.containsCriticalDice(expr)) {
          // 对于keep操作，需要检查keep的逻辑
          // 如果是kh1(2d20)这样的操作，当任意一个原始骰子值为rawDiceValue时，
          // 是否可能导致最终结果为finalResult
          
          if (expr.type === 'dice' && expr.isCriticalDice) {
            // 对于kh1(2d20)，如果一个骰子是rawDiceValue，另一个骰子在1-20范围内
            // 那么最终结果（保留最高）的范围是[rawDiceValue, max(rawDiceValue, 20)]或[min(rawDiceValue, 1), rawDiceValue]
            
            const diceSides = expr.sides || 20;
            const keepCount = node.count || 1;
            const keepType = node.keepType || 'highest';
            const totalDiceCount = expr.count || 1;
            
            if (keepType === 'highest') {
              // 保留最高：如果rawDiceValue是参与骰子之一，最终结果至少是rawDiceValue
              // 但也可能更高（如果其他骰子更高）
              if (finalResult >= rawDiceValue) {
                // 检查其他骰子是否可能达到finalResult
                if (finalResult <= diceSides) {
                  return true; // 可能的情况
                }
              }
            } else if (keepType === 'lowest') {
              // 保留最低：如果rawDiceValue是参与骰子之一，最终结果至多是rawDiceValue
              // 但也可能更低（如果其他骰子更低）
              if (finalResult <= rawDiceValue) {
                // 检查其他骰子是否可能达到finalResult
                if (finalResult >= 1) {
                  return true; // 可能的情况
                }
              }
            }
          } else {
            // 对于更复杂的表达式，递归检查
            return this.canProduceResult(expr, rawDiceValue, finalResult);
          }
        }
      }
    }
    
    return false;
  }

  // 计算表达式的常数贡献（不包含暴击检定骰的部分）
  calculateConstantContribution(node) {
    if (!node) return 0;
    
    if (node.type === 'number') {
      return node.value;
    }
    
    if (node.type === 'dice' && !node.isCriticalDice) {
      // 非暴击检定骰，返回期望值
      const average = ((node.sides || 20) + 1) / 2;
      return (node.count || 1) * average;
    }
    
    if ((node.type === 'dice' || node.type === 'dice_ref') && node.isCriticalDice) {
      // 暴击检定骰不参与常数计算
      return 0;
    }
    
    if (node.type === 'dice_ref' && !node.isCriticalDice) {
      // 非暴击检定骰引用，返回期望值
      const average = ((node.sides || 20) + 1) / 2;
      return (node.count || 1) * average;
    }
    
    if (node.type === 'binary_op') {
      const leftContrib = this.containsCriticalDice(node.left) ? 0 : this.calculateConstantContribution(node.left);
      const rightContrib = this.containsCriticalDice(node.right) ? 0 : this.calculateConstantContribution(node.right);
      
      switch (node.operator) {
        case '+':
          return leftContrib + rightContrib;
        case '-':
          return leftContrib - rightContrib;
        case '*':
          return leftContrib * rightContrib;
        case '/':
          return rightContrib !== 0 ? leftContrib / rightContrib : 0;
      }
    }
    
    return 0;
  }

  // 检查是否是简单的骰子条件（骰子 > threshold 形式）
  isSimpleD20Condition(conditionNode) {
    if (conditionNode.type !== 'comparison') return false;
    
    const left = conditionNode.left;
    const right = conditionNode.right;
    
    // 检查左边是否是单个骰子
    if (left.type === 'dice' && left.count === 1) {
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
  // 提取分布数据的辅助函数
  extractDistribution(result) {
    if (result.combined) {
      return result.combined;
    } else if (result.distribution) {
      return result.distribution;
    } else if (typeof result === 'object' && !Array.isArray(result)) {
      // 检查是否已经是简单的分布对象
      const keys = Object.keys(result);
      if (keys.length > 0 && keys.every(key => !isNaN(parseFloat(key)) || key === 'isCriticalDice')) {
        // 过滤掉非数字键（如isCriticalDice）
        const filteredResult = {};
        for (const [key, value] of Object.entries(result)) {
          if (!isNaN(parseFloat(key))) {
            filteredResult[key] = value;
          }
        }
        return filteredResult;
      }
    }
    return result;
  }

  calculateComparison(left, right, operator) {
    const leftResult = this.evaluate(left);
    const rightResult = this.evaluate(right);
    
    // 提取实际的分布数据
    const leftDistribution = this.extractDistribution(leftResult);
    const rightDistribution = this.extractDistribution(rightResult);
    
    let successCount = 0;
    let totalCount = 0;
    
    // 如果右边是单个数值（不是分布），简化计算
    if (Object.keys(rightDistribution).length === 1 && Object.keys(rightDistribution)[0] !== undefined) {
      const rightValue = parseInt(Object.keys(rightDistribution)[0]);
      
      for (const [leftValue, leftCount] of Object.entries(leftDistribution)) {
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
          case '==':
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
      for (const [leftValue, leftCount] of Object.entries(leftDistribution)) {
        for (const [rightValue, rightCount] of Object.entries(rightDistribution)) {
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
            case '==':
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
      const leftDist = this.extractDistribution(leftResult);
      const rightDist = this.extractDistribution(rightResult);
      return this.calculateNormalBinaryOp(leftDist, rightDist, operator);
    }
  }

  // 计算概率与数值的运算
  calculateProbabilityOperation(probabilityResult, valueResult, operator, probabilityPosition) {
    if (operator !== '*') {
      // 对于非乘法操作，转换为普通分布计算
      const valueDist = this.extractDistribution(valueResult);
      return this.calculateNormalBinaryOp(probabilityResult.distribution, valueDist, operator);
    }
    
    // 概率乘法：结果是期望值的分布
    const valueDist = this.extractDistribution(valueResult);
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
        
      case 'distribution':
        // 处理特殊的分布节点
        return node.distribution;
        
      case 'dice':
        // 新的骰子复用系统下，每个骰子都应该正常计算
        const diceResult = this.calculateBasicDice(node.count, node.sides);
        // 为骰子结果添加暴击检定标记
        if (node.isCriticalDice) {
          diceResult.isCriticalDice = true;
        }
        return diceResult;
        
      case 'dice_ref':
        // 骰子引用在新系统下不应该被直接调用
        // 它们应该在calculateWithDiceReuse中被特殊处理
        throw new Error(`骰子引用 d_${node.id} 应该在骰子复用系统中处理`);
        
      case 'keep':
        // 兼容旧版本的单表达式和新版本的多表达式
        const expressions = node.expressions || [node.expression];
        return this.calculateKeep(expressions, node.count, node.keepType);
        
      case 'reroll':
        const rerollResult = this.calculateReroll(node.dice, node.minValue, node.maxValue, node.maxRerolls);
        // 保留原始骰子的暴击标记
        if (node.dice.isCriticalDice) {
          rerollResult.isCriticalDice = true;
        }
        return rerollResult;
        
      case 'exploding':
        const explodingResult = this.calculateExploding(node);
        // 暴击标记应该已经在calculateExploding中保留了
        return explodingResult;
        
      case 'exploding_sum':
        const explodingSumResult = this.calculateExplodingSum(node);
        // 暴击标记应该已经在calculateExplodingSum中保留了
        return explodingSumResult;
        
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
  // 注意：#表达式# 在非暴击时返回正常值，暴击时返回翻倍值
  // 这与 [表达式] (暴击专用) 不同，后者在非暴击时返回0
  calculateCriticalDouble(expression) {
    const result = this.evaluate(expression);
    
    if (this.isCalculatingCritical) {
      // 暴击时：结果翻倍
      const doubledResult = {};
      const distribution = this.extractDistribution(result);
      
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
  // 注意：[表达式] 只在暴击时有效，非暴击时返回0
  // 这与 #表达式# (暴击翻倍) 不同，后者在非暴击时返回正常值，暴击时翻倍
  calculateCriticalOnly(expression) {
    if (this.isCalculatingCritical) {
      // 暴击时：计算表达式
      return this.evaluate(expression);
    } else {
      // 非暴击时：返回0
      return { 0: 1 };
    }
  }

  // 计算实际暴击概率（基于实际分布）
  calculateActualCriticalProbability(ast, originalCriticalRate) {
    // 对于条件表达式，我们需要提取条件中的骰子
    let targetAst = ast;
    
    // 如果是条件表达式，提取条件部分
    if (ast.type === 'conditional') {
      targetAst = ast.condition;
    } else if (this.containsConditionalExpression(ast)) {
      // 如果是包含条件表达式的复合表达式，找到其中的条件表达式
      const conditionInfo = this.findCriticalConditionInAST(ast);
      if (conditionInfo && conditionInfo.conditionNode) {
        targetAst = conditionInfo.conditionNode;
      }
    }
    
    // 检查是否包含暴击检定骰，如果没有则返回默认值
    if (!this.containsCriticalDice(targetAst)) {
      return {
        criticalProbability: 0,
        diceSides: 20,
        criticalSides: 0
      };
    }
    
    // 首先计算非暴击情况下的实际分布
    this.isCalculatingCritical = false;
    const normalResult = this.evaluate(targetAst);
    
    // 获取实际分布
    const normalDist = this.extractDistribution(normalResult);
    const totalOutcomes = Object.values(normalDist).reduce((sum, count) => sum + count, 0);
    
    if (totalOutcomes === 0) {
      // 对于条件表达式，使用标准的暴击检定骰
      const diceSides = this.getCriticalDiceSidesFromAST(targetAst);
      const criticalSides = Math.max(1, Math.round(diceSides * originalCriticalRate / 100));
      const actualCriticalProbability = criticalSides / diceSides;
      return {
        criticalProbability: actualCriticalProbability,
        diceSides,
        criticalSides
      };
    }
    
    // 找出用于暴击判定的骰面大小
    const diceSides = this.getCriticalDiceSidesFromAST(targetAst);
    
    // 暴击概率应该始终基于原始骰子的面数，而不是表达式的结果分布
    // 因为暴击判定是基于原始骰子值，而不是计算后的结果
    const criticalSides = Math.max(1, Math.round(diceSides * originalCriticalRate / 100));
    const actualCriticalProbability = criticalSides / diceSides;
    
    return {
      criticalProbability: actualCriticalProbability,
      diceSides,
      criticalSides
    };
  }

  // 计算带暴击的结果
  calculateWithCritical(ast, originalCriticalRate, diceSides, criticalSides) {
    // 计算实际的暴击概率
    const { criticalProbability, diceSides: actualDiceSides, criticalSides: actualCriticalSides } = 
      this.calculateActualCriticalProbability(ast, originalCriticalRate);
    
    const normalProbability = 1 - criticalProbability;
    
    // 分别计算普通情况和暴击情况
    this.isCalculatingCritical = false;
    const normalResult = this.evaluate(ast);
    
    this.isCalculatingCritical = true;
    const criticalResult = this.evaluate(ast);
    
    // 检查是否包含条件表达式（递归检查）
    const containsConditional = this.containsConditionalExpression(ast);
    
    // 处理不同类型的结果
    if (ast.type === 'conditional' || ast.type === 'comparison') {
      // 如果根节点就是条件表达式，使用专门的暴击重叠计算
      if (ast.type === 'conditional') {
        const baseConditionResult = this.evaluate(ast.condition);
        const conditionalCriticalResult = this.calculateConditionalWithCriticalOverlap(
          ast.condition,
          ast.trueValue,
          ast.falseValue,
          baseConditionResult
        );
        
        const average = this.calculateAverage(conditionalCriticalResult);
        const totalOutcomes = Object.values(conditionalCriticalResult.combined).reduce((sum, count) => sum + count, 0);
        
        return {
          distribution: conditionalCriticalResult.combined,
          average,
          totalOutcomes,
          success: true,
          isConditionalCritical: true,
          normalHitValues: conditionalCriticalResult.normalHitValues,
          criticalHitValues: conditionalCriticalResult.criticalHitValues,
          missValues: conditionalCriticalResult.missValues,
          probabilities: conditionalCriticalResult.probabilities,
          diceSides: actualDiceSides,
          criticalSides: actualCriticalSides,
          originalCriticalRate: originalCriticalRate,
          actualCriticalProbability: conditionalCriticalResult.actualCriticalProbability * 100,
          criticalProbability: conditionalCriticalResult.actualCriticalProbability * 100,
          nestedConditions: conditionalCriticalResult.nestedConditions
        };
      } else if (ast.type === 'comparison') {
        // 处理比较表达式（如d20>10）
        const baseConditionResult = this.evaluate(ast);
        const conditionalCriticalResult = this.calculateConditionalWithCriticalOverlap(
          ast,
          { type: 'number', value: 1 },  // 成功时返回1
          { type: 'number', value: 0 },  // 失败时返回0
          baseConditionResult
        );
        
        const average = this.calculateAverage(conditionalCriticalResult);
        const totalOutcomes = Object.values(conditionalCriticalResult.combined).reduce((sum, count) => sum + count, 0);
        
        return {
          distribution: conditionalCriticalResult.combined,
          average,
          totalOutcomes,
          success: true,
          isConditionalCritical: true,
          normalHitValues: conditionalCriticalResult.normalHitValues,
          criticalHitValues: conditionalCriticalResult.criticalHitValues,
          missValues: conditionalCriticalResult.missValues,
          probabilities: conditionalCriticalResult.probabilities,
          diceSides: actualDiceSides,
          criticalSides: actualCriticalSides,
          originalCriticalRate: originalCriticalRate,
          actualCriticalProbability: conditionalCriticalResult.actualCriticalProbability * 100,
          criticalProbability: conditionalCriticalResult.actualCriticalProbability * 100,
          nestedConditions: conditionalCriticalResult.nestedConditions
        };
      }
    }
    
    // 对于包含条件表达式但根节点不是条件表达式的情况（如复合表达式），
    // 需要使用特殊的处理逻辑
    if (containsConditional) {
      // 对于包含条件表达式的复合表达式，使用条件暴击处理
      // 这种情况下需要模拟条件暴击的计算逻辑
      return this.calculateComplexConditionalCritical(ast, normalProbability, criticalProbability, actualDiceSides, actualCriticalSides, originalCriticalRate);
    }
    
    // 检查计算结果中是否包含条件类型
    if (normalResult.type === 'conditional' || criticalResult.type === 'conditional') {
      // 使用标准的条件暴击处理
      const hasConditionalResults = normalResult.type === 'conditional' || criticalResult.type === 'conditional';
      
      if (hasConditionalResults) {
        return this.handleConditionalCritical(normalResult, criticalResult, normalProbability, criticalProbability, actualDiceSides, actualCriticalSides, originalCriticalRate);
      }
    }
    
    // 合并普通分布结果
    const combinedDistribution = {};
    const normalDist = this.extractDistribution(normalResult);
    const criticalDist = this.extractDistribution(criticalResult);
    
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
      originalCriticalRate,
      actualCriticalProbability: criticalProbability * 100,
      diceSides: actualDiceSides,
      criticalSides: actualCriticalSides,
      normalDistribution: normalDist,
      criticalDistribution: criticalDist,
      normalProbability,
      criticalProbability
    };
  }

  // 处理复杂的条件暴击表达式（如 (D20>10?#1#:0)+d8）
  calculateComplexConditionalCritical(ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
    // 找到包含暴击检定骰的条件表达式
    const conditionInfo = this.findCriticalConditionInAST(ast);
    
    if (!conditionInfo) {
      // 如果找不到条件信息，回退到标准处理
      return this.calculateStandardCritical(ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate);
    }
    
    const { conditionNode, trueValueNode, falseValueNode } = conditionInfo;
    
    // 重新计算实际的暴击概率，使用与calculateConditionalWithCriticalOverlap相同的逻辑
    const criticalRate = originalCriticalRate;
    const diceInfo = this.getDiceInfoFromCondition(conditionNode);
    const actualDiceSides = diceInfo.sides;
    const diceCount = diceInfo.count;
    
    let actualCriticalProbability = 0;
    let skipGeneralCalculation = false;
    
    // 获取骰子的实际分布来计算暴击概率
    try {
      let diceDistribution = {};
      
      // 根据条件类型获取骰子分布
      
      if (conditionNode.type === 'keep' && conditionNode.expressions && conditionNode.expressions[0]) {
        // 处理keep操作，如kh(2d20)
        const diceExpression = conditionNode.expressions[0];
        if (diceExpression.type === 'dice') {
          // 对于keep操作，暴击概率是至少一个原始骰子暴击的概率
          const singleDiceCriticalRate = criticalRate / 100;
          const diceCount = diceExpression.count || 1;
          // 至少一个暴击的概率 = 1 - (1 - 单个暴击概率)^骰子数量
          actualCriticalProbability = 1 - Math.pow(1 - singleDiceCriticalRate, diceCount);
          skipGeneralCalculation = true;
        } else {
          const diceResult = this.evaluate(diceExpression);
          diceDistribution = this.extractDistribution(diceResult);
        }
      } else if (conditionNode.type === 'comparison' && conditionNode.left) {
        // 处理比较操作 - 对于比较操作，我们需要获取左侧暴击检定骰的分布
        if (this.containsCriticalDice(conditionNode.left)) {
          // 特殊处理keep操作
          if (conditionNode.left.type === 'keep' && conditionNode.left.expressions && conditionNode.left.expressions[0]) {
            const diceExpression = conditionNode.left.expressions[0];
            if (diceExpression.type === 'dice') {
              // 对于keep操作，暴击概率是至少一个原始骰子暴击的概率
              const singleDiceCriticalRate = criticalRate / 100;
              const diceCount = diceExpression.count || 1;
              // 至少一个暴击的概率 = 1 - (1 - 单个暴击概率)^骰子数量
              actualCriticalProbability = 1 - Math.pow(1 - singleDiceCriticalRate, diceCount);
              skipGeneralCalculation = true;
            }
          }
          
          if (!skipGeneralCalculation) {
            // 如果左侧包含暴击检定骰但不是keep操作，获取原始骰子分布而不是比较结果
            const rawDice = this.findCriticalDiceInNode(conditionNode.left);
            if (rawDice) {
              const diceExpression = {
                type: 'dice',
                sides: rawDice.sides,
                count: rawDice.count,
                isCriticalDice: true
              };
              const diceResult = this.evaluate(diceExpression);
              diceDistribution = this.extractDistribution(diceResult);
            }
          }
        } else {
          // 如果左侧不包含暴击检定骰，使用左侧的结果分布
          const leftResult = this.evaluate(conditionNode.left);
          diceDistribution = this.extractDistribution(leftResult);
        }
      } else {
        // 普通骰子
        const diceExpression = {
          type: 'dice',
          sides: actualDiceSides,
          count: diceCount
        };
        const diceResult = this.evaluate(diceExpression);
        diceDistribution = this.extractDistribution(diceResult);
      }
      
      // 根据实际暴击率计算对应的骰面范围（仅在非keep操作时执行）
      if (!skipGeneralCalculation) {
        const diceTotalOutcomes = Object.values(diceDistribution).reduce((sum, count) => sum + count, 0);
        if (diceTotalOutcomes > 0) {
          // 对于暴击计算，我们应该基于原始骰子的分布，而不是条件满足后的分布
          // 因为暴击判定是基于原始骰子值，而不是条件结果
          const criticalSidesCount = Math.max(1, Math.round(actualDiceSides * criticalRate / 100));
          const criticalThreshold = actualDiceSides - criticalSidesCount + 1;
          
          // 暴击概率应该始终基于原始骰子分布
          actualCriticalProbability = criticalSidesCount / actualDiceSides;
        }
      }
    } catch (e) {
      // 回退到简单计算（仅在非keep操作时执行）
      if (!skipGeneralCalculation) {
        const criticalSidesCount = Math.max(1, Math.round(actualDiceSides * criticalRate / 100));
        actualCriticalProbability = criticalSidesCount / actualDiceSides;
      }
    }
    
    // 使用计算出的实际暴击概率
    const baseConditionResult = this.evaluateConditionWithCritical(conditionNode, actualCriticalProbability);
    
    // 计算各种情况下的结果分布
    this.isCalculatingCritical = false;
    const normalSuccessResult = this.evaluate(trueValueNode);
    const failureResult = this.evaluate(falseValueNode);
    
    this.isCalculatingCritical = true;
    const criticalSuccessResult = this.evaluate(trueValueNode);
    
    // 计算完整表达式在不同情况下的分布
    const normalSuccessFullDist = this.evaluateExpressionWithSubstitution(ast, conditionInfo, normalSuccessResult);
    const criticalSuccessFullDist = this.evaluateExpressionWithSubstitution(ast, conditionInfo, criticalSuccessResult);
    const failureFullDist = this.evaluateExpressionWithSubstitution(ast, conditionInfo, failureResult);
    
    // 提取各分布数据
    const normalSuccessDist = this.extractDistribution(normalSuccessFullDist);
    const criticalSuccessDist = this.extractDistribution(criticalSuccessFullDist);
    const failureDist = this.extractDistribution(failureFullDist);
    
    // 对于前端显示，我们需要条件表达式本身的结果分布，而不是完整表达式的结果分布
    const conditionNormalHitValues = this.extractDistribution(normalSuccessResult);
    const conditionCriticalHitValues = this.extractDistribution(criticalSuccessResult);
    const conditionMissValues = this.extractDistribution(failureResult);
    
    // 合并结果
    const scaleFactor = 1000; // 使用固定的缩放因子
    const result = {};
    
    // 普通成功的贡献
    const normalSuccessCount = Math.round(scaleFactor * baseConditionResult.normalSuccessProbability);
    if (normalSuccessCount > 0) {
      const normalSuccessTotal = Object.values(normalSuccessDist).reduce((sum, count) => sum + count, 0);
      for (const [value, count] of Object.entries(normalSuccessDist)) {
        const val = parseFloat(value);
        const relativeProbability = normalSuccessTotal > 0 ? count / normalSuccessTotal : 0;
        const weightedCount = Math.round(relativeProbability * normalSuccessCount);
        if (weightedCount > 0) {
          result[val] = (result[val] || 0) + weightedCount;
        }
      }
    }
    
    // 暴击成功的贡献
    const criticalSuccessCount = Math.round(scaleFactor * baseConditionResult.criticalSuccessProbability);
    if (criticalSuccessCount > 0) {
      const criticalSuccessTotal = Object.values(criticalSuccessDist).reduce((sum, count) => sum + count, 0);
      for (const [value, count] of Object.entries(criticalSuccessDist)) {
        const val = parseFloat(value);
        const relativeProbability = criticalSuccessTotal > 0 ? count / criticalSuccessTotal : 0;
        const weightedCount = Math.round(relativeProbability * criticalSuccessCount);
        if (weightedCount > 0) {
          result[val] = (result[val] || 0) + weightedCount;
        }
      }
    }
    
    // 失败的贡献
    const failureCount = Math.round(scaleFactor * baseConditionResult.failureProbability);
    if (failureCount > 0) {
      const failureTotal = Object.values(failureDist).reduce((sum, count) => sum + count, 0);
      for (const [value, count] of Object.entries(failureDist)) {
        const val = parseFloat(value);
        const relativeProbability = failureTotal > 0 ? count / failureTotal : 0;
        const weightedCount = Math.round(relativeProbability * failureCount);
        if (weightedCount > 0) {
          result[val] = (result[val] || 0) + weightedCount;
        }
      }
    }
    
    const average = this.calculateAverage({ distribution: result });
    const totalOutcomes = Object.values(result).reduce((sum, count) => sum + count, 0);
    
    // 计算实际的暴击率（使用我们修正的实际暴击概率）
    const totalSuccessProbability = baseConditionResult.normalSuccessProbability + baseConditionResult.criticalSuccessProbability;
    const finalActualCriticalProbability = totalSuccessProbability > 0 
      ? actualCriticalProbability  // 直接使用我们计算的正确暴击概率
      : 0;
    
    return {
      distribution: result,
      average,
      totalOutcomes,
      success: true,
      isConditionalCritical: true,
      normalHitValues: conditionNormalHitValues,
      criticalHitValues: conditionCriticalHitValues,
      missValues: conditionMissValues,
      probabilities: {
        normalHit: baseConditionResult.normalSuccessProbability,
        criticalHit: baseConditionResult.criticalSuccessProbability,
        miss: baseConditionResult.failureProbability
      },
      diceSides: actualDiceSides,
      criticalSides: Math.max(1, Math.round(actualDiceSides * criticalRate / 100)),
      originalCriticalRate,
      actualCriticalProbability: finalActualCriticalProbability * 100,
      criticalProbability: finalActualCriticalProbability * 100,
      nestedConditions: []  // 这个方法目前不处理嵌套条件，留空数组
    };
  }

  // 在AST中找到包含暴击检定骰的条件表达式
  findCriticalConditionInAST(node) {
    if (!node) return null;
    
    // 如果当前节点就是包含暴击检定骰的条件表达式
    if (node.type === 'conditional' && this.containsCriticalDice(node.condition)) {
      return {
        conditionNode: node.condition,
        trueValueNode: node.trueValue,
        falseValueNode: node.falseValue,
        fullNode: node
      };
    }
    
    // 递归搜索子节点
    if (node.type === 'binary_op') {
      const leftResult = this.findCriticalConditionInAST(node.left);
      if (leftResult) return leftResult;
      
      const rightResult = this.findCriticalConditionInAST(node.right);
      if (rightResult) return rightResult;
    }
    
    if (node.expressions) {
      for (const expr of node.expressions) {
        const result = this.findCriticalConditionInAST(expr);
        if (result) return result;
      }
    }
    
    return null;
  }

  // 计算表达式，将条件部分替换为指定的结果
  evaluateExpressionWithSubstitution(ast, conditionInfo, substitutionResult) {
    // 创建AST的副本，将条件表达式替换为替换结果
    const substitutedAST = this.substituteNodeInAST(ast, conditionInfo.fullNode, substitutionResult);
    return this.evaluate(substitutedAST);
  }

  // 在AST中替换指定节点
  substituteNodeInAST(ast, targetNode, substitutionResult) {
    if (ast === targetNode) {
      // 创建一个表示固定结果的节点
      return this.createDistributionNode(substitutionResult);
    }
    
    if (ast.type === 'binary_op') {
      return {
        ...ast,
        left: this.substituteNodeInAST(ast.left, targetNode, substitutionResult),
        right: this.substituteNodeInAST(ast.right, targetNode, substitutionResult)
      };
    }
    
    // 对其他节点类型，保持原样
    return ast;
  }

  // 创建表示分布结果的节点
  createDistributionNode(distributionResult) {
    const dist = this.extractDistribution(distributionResult);
    const values = Object.keys(dist).map(Number);
    
    if (values.length === 1) {
      // 如果只有一个值，创建数字节点
      return { type: 'number', value: values[0] };
    } else {
      // 如果有多个值，创建一个特殊的分布节点
      return { 
        type: 'distribution', 
        distribution: dist,
        // 这是一个特殊节点类型，需要在evaluate中处理
      };
    }
  }

  // 标准暴击计算（作为回退方案）
  calculateStandardCritical(ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
    // 这里实现标准的暴击计算逻辑
    this.isCalculatingCritical = false;
    const normalResult = this.evaluate(ast);
    
    this.isCalculatingCritical = true;
    const criticalResult = this.evaluate(ast);
    
    // 合并分布
    const combinedDistribution = {};
    const normalDist = this.extractDistribution(normalResult);
    const criticalDist = this.extractDistribution(criticalResult);
    
    const normalTotal = Object.values(normalDist).reduce((sum, count) => sum + count, 0);
    const criticalTotal = Object.values(criticalDist).reduce((sum, count) => sum + count, 0);
    
    for (const [value, count] of Object.entries(normalDist)) {
      const val = parseFloat(value);
      const relativeProbability = count / normalTotal;
      const weightedCount = relativeProbability * normalProbability;
      combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
    }
    
    for (const [value, count] of Object.entries(criticalDist)) {
      const val = parseFloat(value);
      const relativeProbability = count / criticalTotal;
      const weightedCount = relativeProbability * criticalProbability;
      combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
    }
    
    // 标准化结果
    const totalWeight = Object.values(combinedDistribution).reduce((sum, weight) => sum + weight, 0);
    const normalizedResult = {};
    const scaleFactor = normalTotal;
    
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
      originalCriticalRate,
      actualCriticalProbability: criticalProbability * 100,
      diceSides,
      criticalSides,
      normalDistribution: normalDist,
      criticalDistribution: criticalDist,
      normalProbability,
      criticalProbability
    };
  }

  // 处理条件表达式的暴击
  handleConditionalCritical(normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
    // 简化处理：直接合并条件结果
    const normalDist = this.extractDistribution(normalResult);
    const criticalDist = this.extractDistribution(criticalResult);
    
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
      type: 'conditional_critical',
      distribution: normalizedResult,
      average,
      totalOutcomes,
      success: true,
      isConditionalCritical: true,
      originalCriticalRate,
      actualCriticalProbability: criticalProbability * 100,
      diceSides,
      criticalSides,
      normalDistribution: normalDist,
      criticalDistribution: criticalDist,
      normalProbability,
      criticalProbability,
      nestedConditions: []  // 这个方法也不处理嵌套条件，留空数组
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
    
    const distribution = this.extractDistribution(result);
    let totalSum = 0;
    let totalCount = 0;
    
    for (const [value, count] of Object.entries(distribution)) {
      // 跳过非数字键（如isCriticalDice）
      if (!isNaN(parseFloat(value))) {
        totalSum += parseFloat(value) * count;
        totalCount += count;
      }
    }
    
    return totalCount > 0 ? totalSum / totalCount : 0;
  }

  // 从公式中获取用于暴击判定的骰面大小
  getCriticalDiceSidesFromAST(ast) {
    // 递归搜索AST中的暴击检定骰面数
    const findCriticalDiceSides = (node) => {
      if (!node) return null;
      
      if ((node.type === 'dice' || node.type === 'dice_ref') && node.isCriticalDice) {
        return node.sides || 20;
      }
      
      if (node.type === 'reroll' && node.dice && node.dice.isCriticalDice) {
        return node.dice.sides || 20;
      }
      
      if (node.type === 'keep' && node.expressions) {
        // 在keep表达式中找到暴击检定骰
        for (const expr of node.expressions) {
          const sides = findCriticalDiceSides(expr);
          if (sides !== null) return sides;
        }
      }
      
      if (node.left) {
        const leftSides = findCriticalDiceSides(node.left);
        if (leftSides !== null) return leftSides;
      }
      
      if (node.right) {
        const rightSides = findCriticalDiceSides(node.right);
        if (rightSides !== null) return rightSides;
      }
      
      if (node.expressions) {
        for (const expr of node.expressions) {
          const sides = findCriticalDiceSides(expr);
          if (sides !== null) return sides;
        }
      }
      
      if (node.expression) {
        return findCriticalDiceSides(node.expression);
      }
      
      if (node.condition) {
        return findCriticalDiceSides(node.condition);
      }
      
      return null;
    };
    
    return findCriticalDiceSides(ast) || 20; // 如果没找到暴击检定骰，默认为20
  }

  // 将暴击率转换为对应的骰面数量
  convertCriticalRateToSides(criticalRate, diceSides) {
    if (criticalRate <= 0) return 0;
    if (criticalRate >= 100) return diceSides;
    
    const probabilityPerSide = 100 / diceSides;
    const targetSides = Math.round(criticalRate / probabilityPerSide);
    
    // 确保在合理范围内
    return Math.max(1, Math.min(diceSides, targetSides));
  }

  // 主要计算函数
  calculate(formula, criticalOptions = {}) {
    try {
      this.criticalOptions = criticalOptions;
      
      const lexer = new Lexer(formula);
      const tokens = lexer.tokenize();
      
      const parser = new Parser(tokens);
      const parseResult = parser.parse();
      const ast = parseResult.ast;
      const diceRegistry = parseResult.diceRegistry;
      
      // 检查是否有骰子引用，如果有则使用特殊的计算方法
      if (diceRegistry.size > 0) {
        // 检查是否需要暴击处理
        if (criticalOptions.criticalEnabled && criticalOptions.criticalRate > 0 && this.containsCriticalDice(ast)) {
          return this.calculateWithDiceReuseAndCritical(ast, diceRegistry, criticalOptions);
        } else {
          return this.calculateWithDiceReuse(ast, diceRegistry, criticalOptions);
        }
      }
      
      // 原有的计算逻辑
      if (criticalOptions.criticalEnabled && criticalOptions.criticalRate > 0 && this.containsCriticalDice(ast)) {
        const criticalDiceSides = this.getCriticalDiceSidesFromAST(ast);
        const adjustedCriticalRate = this.convertCriticalRateToSides(criticalOptions.criticalRate, criticalDiceSides);
        return this.calculateWithCritical(ast, criticalOptions.criticalRate, criticalDiceSides, adjustedCriticalRate);
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
          const distribution = this.extractDistribution(result);
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
  
  // 带骰子复用的计算方法（优化版本）
  calculateWithDiceReuse(ast, diceRegistry, criticalOptions) {
    // 首先计算所有独立骰子的分布
    const diceDistributions = new Map();
    for (const [id, def] of diceRegistry.entries()) {
      const distribution = this.calculateBasicDice(def.count, def.sides);
      diceDistributions.set(id, distribution);
    }
    
    const result = {};
    
    // 使用优化的算法：直接计算分布而不是枚举每个个体情况
    this.calculateDiceReuseFast(diceDistributions, ast, result);
    
    const average = this.calculateAverage(result);
    const totalOutcomes = Object.values(result).reduce((sum, count) => sum + count, 0);
    
    return {
      distribution: result,
      average,
      totalOutcomes,
      success: true,
      isProbability: false,
      hasDiceReuse: true
    };
  }

  // 计算带骰子引用和暴击的结果
  calculateWithDiceReuseAndCritical(ast, diceRegistry, criticalOptions) {
    // 保存骰子注册表以供后续使用
    this.currentDiceRegistry = diceRegistry;
    
    // 对于骰子引用系统，需要重新计算实际的暴击概率
    // 因为keep、reroll等操作会改变暴击概率
    const actualCriticalInfo = this.calculateActualCriticalProbabilityWithDiceReuse(ast, diceRegistry, criticalOptions.criticalRate);
    
    const criticalProbability = actualCriticalInfo.criticalProbability; // 保持原始值
    
    // 检查criticalProbability的值，如果它看起来像百分比形式（>1），则转换为小数
    const normalizedCriticalProbability = criticalProbability > 1 ? criticalProbability / 100 : criticalProbability;
    const normalProbability = 1 - normalizedCriticalProbability;
    
    // 分别计算普通情况和暴击情况
    this.isCalculatingCritical = false;
    const normalResult = this.calculateWithDiceReuse(ast, diceRegistry, criticalOptions);
    
    this.isCalculatingCritical = true;
    const criticalResult = this.calculateWithDiceReuse(ast, diceRegistry, criticalOptions);
    
    // 清理临时变量
    delete this.currentDiceRegistry;
    
    // 检查是否包含条件表达式
    const containsConditional = this.containsConditionalExpression(ast);
    
    // 处理条件表达式的特殊情况
    if (ast.type === 'conditional' || containsConditional) {
      // 对于引用骰子的条件表达式，我们需要使用与非引用骰子相同的处理方式
      // 来确保返回正确的条件暴击结果格式
      
      if (ast.type === 'conditional') {
        // 根节点是条件表达式，使用专门的暴击重叠计算
        // 但需要适应引用骰子的情况
        return this.handleConditionalCriticalWithDiceReuseForConditional(
          ast, normalResult, criticalResult, normalProbability, normalizedCriticalProbability, 
          actualCriticalInfo.diceSides, actualCriticalInfo.criticalSides, criticalOptions.criticalRate
        );
      } else {
        // 包含条件表达式的复合表达式
        return this.handleConditionalCriticalWithDiceReuse(
          normalResult, criticalResult, normalProbability, normalizedCriticalProbability, 
          actualCriticalInfo.diceSides, actualCriticalInfo.criticalSides, criticalOptions.criticalRate
        );
      }
    }
    
    // 合并普通分布结果
    const combinedDistribution = {};
    const normalDist = this.extractDistribution(normalResult);
    const criticalDist = this.extractDistribution(criticalResult);
    
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
    const originalTotalCount = normalTotal;
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
      hasDiceReuse: true,
      isCritical: true,
      diceSides: actualCriticalInfo.diceSides,
      criticalSides: actualCriticalInfo.criticalSides,
      originalCriticalRate: criticalOptions.criticalRate,
      actualCriticalProbability: criticalProbability * 100,
      criticalProbability: criticalProbability * 100,
      normalDistribution: normalDist,
      criticalDistribution: criticalDist,
      normalProbability,
      criticalProbability
    };
  }

  // 计算骰子引用系统中的实际暴击概率
  // 考虑keep、reroll等操作对暴击概率的影响
  calculateActualCriticalProbabilityWithDiceReuse(ast, diceRegistry, originalCriticalRate) {
    // 首先计算所有独立骰子的分布
    const diceDistributions = new Map();
    for (const [id, def] of diceRegistry.entries()) {
      const distribution = this.calculateBasicDice(def.count, def.sides);
      diceDistributions.set(id, distribution);
    }
    
    // 枚举所有可能的骰子值组合，统计暴击和非暴击的数量
    let totalCombinations = 0;
    let criticalCombinations = 0;
    
    const diceIds = Array.from(diceDistributions.keys());
    
    // 获取基础骰面信息（用于返回值）
    let diceSides = 20;
    let foundCriticalDice = false;
    for (const [id, def] of diceRegistry.entries()) {
      if (def.isCriticalDice) {
        diceSides = def.sides;
        foundCriticalDice = true;
        break;
      }
    }
    
    if (!foundCriticalDice) {
      // 如果没有暴击骰，返回0概率
      return {
        criticalProbability: 0,
        diceSides: 20,
        criticalSides: 0
      };
    }
    
    // 递归枚举所有组合，计算暴击概率
    const enumerateForCriticalProbability = (index, currentValues, currentWeight) => {
      if (index >= diceIds.length) {
        // 所有骰子都有值了，检查这个组合是否是暴击
        totalCombinations += currentWeight;
        
        // 获取实际参与暴击判定的骰子值
        const criticalDiceValues = this.getEffectiveCriticalDiceValues(currentValues, ast);
        
        if (criticalDiceValues.length > 0) {
          let isCriticalCombination = false;
          
          for (const { diceId, effectiveValue } of criticalDiceValues) {
            const diceDef = diceRegistry.get(diceId);
            if (diceDef && diceDef.isCriticalDice) {
              const diceSides = diceDef.sides;
              const criticalRate = originalCriticalRate || 5;
              const criticalSides = Math.max(1, Math.round(diceSides * criticalRate / 100));
              const criticalThreshold = diceSides - criticalSides + 1;
              
              if (effectiveValue >= criticalThreshold) {
                isCriticalCombination = true;
                break;
              }
            }
          }
          
          if (isCriticalCombination) {
            criticalCombinations += currentWeight;
          }
        }
        
        return;
      }
      
      // 处理当前骰子的所有可能值
      const diceId = diceIds[index];
      const diceDistribution = diceDistributions.get(diceId);
      
      for (const [value, count] of Object.entries(diceDistribution)) {
        const val = parseInt(value);
        const newValues = new Map(currentValues);
        newValues.set(diceId, val);
        const newWeight = currentWeight * count;
        
        enumerateForCriticalProbability(index + 1, newValues, newWeight);
      }
    };
    
    // 开始枚举
    enumerateForCriticalProbability(0, new Map(), 1);
    
    const criticalProbability = totalCombinations > 0 ? criticalCombinations / totalCombinations : 0;
    const criticalSides = Math.max(1, Math.round(diceSides * originalCriticalRate / 100));
    
    // 修正keep操作的暴击概率
    const correctedProbability = this.correctKeepCriticalProbability(ast, criticalProbability, originalCriticalRate, diceSides);
    
    return {
      criticalProbability: correctedProbability,
      diceSides,
      criticalSides
    };
  }

  // 修正keep操作的暴击概率
  correctKeepCriticalProbability(ast, originalProbability, criticalRate, diceSides) {
    // 检查AST中是否包含keep操作
    const keepNode = this.findKeepNodeInAST(ast);
    if (!keepNode) {
      return originalProbability; // 不是keep操作，返回原始概率
    }
    
    // 检查keep操作的表达式
    const expressions = keepNode.expressions || [keepNode.expression];
    if (expressions.length === 1 && expressions[0].type === 'dice') {
      const diceExpr = expressions[0];
      const diceCount = diceExpr.count || 1;
      
      if (diceCount > 1) {
        // 对于多骰子keep操作（如kh1(2D20)），计算正确的暴击概率
        const singleDiceCriticalRate = criticalRate / 100;
        const correctProbability = 1 - Math.pow(1 - singleDiceCriticalRate, diceCount);
        
        return correctProbability;
      }
    }
    
    return originalProbability;
  }
  
  // 在AST中查找keep节点
  findKeepNodeInAST(node) {
    if (!node) return null;
    
    if (node.type === 'keep') {
      return node;
    }
    
    // 递归搜索
    if (node.condition) {
      const result = this.findKeepNodeInAST(node.condition);
      if (result) return result;
    }
    
    if (node.trueValue) {
      const result = this.findKeepNodeInAST(node.trueValue);
      if (result) return result;
    }
    
    if (node.falseValue) {
      const result = this.findKeepNodeInAST(node.falseValue);
      if (result) return result;
    }
    
    if (node.left) {
      const result = this.findKeepNodeInAST(node.left);
      if (result) return result;
    }
    
    if (node.right) {
      const result = this.findKeepNodeInAST(node.right);
      if (result) return result;
    }
    
    if (node.expressions) {
      for (const expr of node.expressions) {
        const result = this.findKeepNodeInAST(expr);
        if (result) return result;
      }
    }
    
    return null;
  }

  // 处理引用骰子的条件表达式暴击计算（根节点是条件表达式）
  handleConditionalCriticalWithDiceReuseForConditional(ast, normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
    // 对于引用骰子的条件表达式，我们需要模拟非引用骰子的处理方式
    // 由于已经计算过了normalResult和criticalResult，我们可以从中提取信息
    
    // 从已有结果中提取分布
    const normalDist = this.extractDistribution(normalResult);
    const criticalDist = this.extractDistribution(criticalResult);
    
    // 由于引用骰子的复杂性，我们使用简化的方法来模拟条件暴击的各个部分
    // 这里我们假设 normalResult 和 criticalResult 已经包含了条件表达式的完整计算结果
    
    // 简化的分离：假设结果分布中的非零值来自成功案例，零值来自失败案例
    const normalHitValues = {};
    const criticalHitValues = {};
    const missValues = {}; // 失败分布，基于实际的失败情况
    
    // 从normalDist中提取成功案例（非零值）
    for (const [value, count] of Object.entries(normalDist)) {
      const val = parseFloat(value);
      if (val > 0) {
        normalHitValues[val] = count;
      }
    }
    
    // 从criticalDist中提取暴击成功案例（非零值）
    for (const [value, count] of Object.entries(criticalDist)) {
      const val = parseFloat(value);
      if (val > 0) {
        criticalHitValues[val] = count;
      }
    }
    
    // 计算实际的条件概率 - 使用传入的已经计算好的暴击概率
    // 这个概率已经考虑了keep、reroll等操作的影响
    const actualCriticalProbability = criticalProbability;
    
    // 为了获取真实的条件概率，我们需要评估原始的条件表达式
    // 由于这是对条件表达式的处理，ast应该是conditional类型
    let actualFailureProbability = 0;
    let totalSuccessProbability = 1;
    
    if (ast.type === 'conditional' && ast.condition) {
      // 评估原始条件以获取真实的成功/失败概率
      try {
        // 临时关闭暴击计算来获取基础条件概率
        const wasCalculatingCritical = this.isCalculatingCritical;
        this.isCalculatingCritical = false;
        
        const conditionResult = this.evaluate(ast.condition);
        
        this.isCalculatingCritical = wasCalculatingCritical;
        
        if (conditionResult.type === 'probability') {
          actualFailureProbability = conditionResult.failureProbability;
          totalSuccessProbability = conditionResult.successProbability;
        } else {
          // 如果不是概率类型，从分布中计算
          const conditionDist = this.extractDistribution(conditionResult);
          const conditionTotal = Object.values(conditionDist).reduce((sum, count) => sum + count, 0);
          const successCount = Object.entries(conditionDist)
            .filter(([value]) => parseFloat(value) > 0)
            .reduce((sum, [, count]) => sum + count, 0);
          
          totalSuccessProbability = conditionTotal > 0 ? successCount / conditionTotal : 0;
          actualFailureProbability = 1 - totalSuccessProbability;
        }
      } catch (e) {
        // 如果评估失败，从结果分布中推断
        const hasZeroInNormal = normalDist.hasOwnProperty('0') && normalDist['0'] > 0;
        const hasZeroInCritical = criticalDist.hasOwnProperty('0') && criticalDist['0'] > 0;
        
        if (hasZeroInNormal || hasZeroInCritical) {
          const totalNormalCount = Object.values(normalDist).reduce((sum, count) => sum + count, 0);
          const zeroCountNormal = normalDist['0'] || 0;
          const zeroCountCritical = criticalDist['0'] || 0;
          actualFailureProbability = (zeroCountNormal + zeroCountCritical) / (totalNormalCount * 2);
        }
        totalSuccessProbability = 1 - actualFailureProbability;
      }
    } else {
      // 不是条件表达式，从分布中推断
      const hasZeroInNormal = normalDist.hasOwnProperty('0') && normalDist['0'] > 0;
      const hasZeroInCritical = criticalDist.hasOwnProperty('0') && criticalDist['0'] > 0;
      
      if (hasZeroInNormal || hasZeroInCritical) {
        const totalNormalCount = Object.values(normalDist).reduce((sum, count) => sum + count, 0);
        const zeroCountNormal = normalDist['0'] || 0;
        const zeroCountCritical = criticalDist['0'] || 0;
        actualFailureProbability = (zeroCountNormal + zeroCountCritical) / (totalNormalCount * 2);
      }
      totalSuccessProbability = 1 - actualFailureProbability;
    }
    
    const normalSuccessProbability = totalSuccessProbability * (1 - actualCriticalProbability);
    const criticalSuccessProbability = totalSuccessProbability * actualCriticalProbability;
    const failureProbability = actualFailureProbability;
    
    // 根据实际失败概率设置missValues
    if (actualFailureProbability > 0) {
      // 从normalDist和criticalDist中提取失败案例（零值）
      const zeroInNormal = normalDist['0'] || 0;
      const zeroInCritical = criticalDist['0'] || 0;
      if (zeroInNormal > 0 || zeroInCritical > 0) {
        missValues[0] = Math.max(zeroInNormal, zeroInCritical);
      } else if (actualFailureProbability >= 0.01) {
        // 如果有失败概率但分布中没有0值，添加一个象征性的失败值
        missValues[0] = 1;
      }
    }
    
    // 合并最终的分布结果
    const combinedDistribution = {};
    
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
    const originalTotalCount = Math.max(normalTotal, criticalTotal);
    const scaleFactor = originalTotalCount;
    
    for (const [value, weight] of Object.entries(combinedDistribution)) {
      const normalizedCount = Math.round(weight * scaleFactor / totalWeight);
      if (normalizedCount > 0) {
        normalizedResult[value] = normalizedCount;
      }
    }
    
    const average = this.calculateAverage({ distribution: normalizedResult });
    const totalOutcomes = Object.values(normalizedResult).reduce((sum, count) => sum + count, 0);
    
    // 返回与非引用骰子相同格式的条件暴击结果
    return {
      distribution: normalizedResult,
      average,
      totalOutcomes,
      success: true,
      hasDiceReuse: true,
      isConditionalCritical: true,
      normalHitValues: normalHitValues,
      criticalHitValues: criticalHitValues,
      missValues: missValues,
      probabilities: {
        normalHit: normalSuccessProbability,
        criticalHit: criticalSuccessProbability,
        miss: failureProbability
      },
      diceSides,
      criticalSides,
      originalCriticalRate: originalCriticalRate,
      actualCriticalProbability: actualCriticalProbability * 100,
      criticalProbability: actualCriticalProbability * 100,
      nestedConditions: []  // 骰子引用暂不支持嵌套条件
    };
  }

  // 处理包含条件表达式的骰子引用暴击计算
  handleConditionalCriticalWithDiceReuse(normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
    // 对于包含条件表达式的复杂情况，需要特殊处理
    // 这里简化处理，将结果按权重合并
    const combinedDistribution = {};
    
    const normalDist = this.extractDistribution(normalResult);
    const criticalDist = this.extractDistribution(criticalResult);
    
    const normalTotal = Object.values(normalDist).reduce((sum, count) => sum + count, 0);
    const criticalTotal = Object.values(criticalDist).reduce((sum, count) => sum + count, 0);
    
    // 添加普通情况的权重
    for (const [value, count] of Object.entries(normalDist)) {
      const val = parseFloat(value);
      const relativeProbability = normalTotal > 0 ? count / normalTotal : 0;
      const weightedCount = relativeProbability * normalProbability;
      combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
    }
    
    // 添加暴击情况的权重
    for (const [value, count] of Object.entries(criticalDist)) {
      const val = parseFloat(value);
      const relativeProbability = criticalTotal > 0 ? count / criticalTotal : 0;
      const weightedCount = relativeProbability * criticalProbability;
      combinedDistribution[val] = (combinedDistribution[val] || 0) + weightedCount;
    }
    
    // 标准化结果
    const totalWeight = Object.values(combinedDistribution).reduce((sum, weight) => sum + weight, 0);
    const normalizedResult = {};
    const originalTotalCount = Math.max(normalTotal, criticalTotal);
    const scaleFactor = originalTotalCount;
    
    for (const [value, weight] of Object.entries(combinedDistribution)) {
      const normalizedCount = Math.round(weight * scaleFactor / totalWeight);
      if (normalizedCount > 0) {
        normalizedResult[value] = normalizedCount;
      }
    }
    
    const average = this.calculateAverage({ distribution: normalizedResult });
    const totalOutcomes = Object.values(normalizedResult).reduce((sum, count) => sum + count, 0);
    
    // 对于带骰子引用的情况，返回标准的暴击结果格式
    // 保持与非引用骰子情况的一致性
    return {
      distribution: normalizedResult,
      average,
      totalOutcomes,
      success: true,
      hasDiceReuse: true,
      isCritical: true, // 改为标准暴击标记
      diceSides,
      criticalSides,
      originalCriticalRate: originalCriticalRate,
      actualCriticalProbability: criticalProbability * 100,
      criticalProbability: criticalProbability * 100,
      normalDistribution: normalDist,
      criticalDistribution: criticalDist,
      normalProbability,
      criticalProbability
    };
  }
  
  // 快速计算引用骰值分布
  calculateDiceReuseFast(diceDistributions, ast, result) {
    const diceIds = Array.from(diceDistributions.keys());
    
    if (diceIds.length === 0) {
      // 没有引用骰值，正常计算
      const normalResult = this.evaluate(ast);
      Object.assign(result, normalResult);
      return;
    }
    
    // 递归计算所有骰子值组合的分布
    this.enumerateCombinationsFast(diceDistributions, diceIds, 0, new Map(), 1, ast, result);
  }
  
  // 优化的组合枚举，只处理不同的值组合，不重复处理相同组合
  enumerateCombinationsFast(diceDistributions, diceIds, index, currentValues, currentWeight, ast, result) {
    if (index >= diceIds.length) {
      // 所有骰子都有值了，检查是否符合当前计算模式（暴击/非暴击）
      if (this.isCalculatingCritical !== undefined && this.currentDiceRegistry) {
        // 检查当前组合是否符合暴击条件，传入AST以支持复杂的暴击判定
        const shouldInclude = this.shouldIncludeCombinationForCritical(currentValues, ast);
        if (!shouldInclude) {
          return; // 跳过不符合条件的组合
        }
      }
      
      // 计算表达式结果
      this.currentDiceValues = currentValues;
      const expressionResult = this.evaluateWithFixedDice(ast);
      delete this.currentDiceValues;
      
      // 将结果乘以当前组合的权重并累加
      if (typeof expressionResult === 'object' && expressionResult.distribution) {
        // 处理特殊结果类型（如条件表达式）
        for (const [value, count] of Object.entries(expressionResult.distribution)) {
          const val = parseFloat(value);
          result[val] = (result[val] || 0) + count * currentWeight;
        }
      } else {
        // 处理普通分布
        for (const [value, count] of Object.entries(expressionResult)) {
          const val = parseFloat(value);
          result[val] = (result[val] || 0) + count * currentWeight;
        }
      }
      return;
    }
    
    // 处理当前骰子的所有可能值
    const diceId = diceIds[index];
    const diceDistribution = diceDistributions.get(diceId);
    
    for (const [value, count] of Object.entries(diceDistribution)) {
      const val = parseInt(value);
      const newValues = new Map(currentValues);
      newValues.set(diceId, val);
      const newWeight = currentWeight * count;
      
      // 递归处理下一个骰子
      this.enumerateCombinationsFast(diceDistributions, diceIds, index + 1, newValues, newWeight, ast, result);
    }
  }

  // 检查当前骰子值组合是否应该包含在当前计算模式中
  // 修复后的版本：正确处理keep、reroll等操作对暴击判定的影响
  shouldIncludeCombinationForCritical(currentValues, ast = null) {
    if (!this.currentDiceRegistry || !this.criticalOptions) {
      return true; // 没有暴击设置时包含所有组合
    }
    
    // 获取实际参与暴击判定的骰子值
    const criticalDiceValues = this.getEffectiveCriticalDiceValues(currentValues, ast);
    
    if (criticalDiceValues.length === 0) {
      return true; // 没有暴击检定骰时包含所有组合
    }
    
    // 检查所有有效的暴击检定骰是否符合当前计算模式
    let allCriticalDiceMatch = true;
    
    for (const { diceId, effectiveValue } of criticalDiceValues) {
      const diceDef = this.currentDiceRegistry.get(diceId);
      if (diceDef && diceDef.isCriticalDice) {
        const diceSides = diceDef.sides;
        const criticalRate = this.criticalOptions.criticalRate || 5;
        const criticalSides = Math.max(1, Math.round(diceSides * criticalRate / 100));
        const criticalThreshold = diceSides - criticalSides + 1;
        
        const isCriticalValue = effectiveValue >= criticalThreshold;
        
        if (this.isCalculatingCritical && !isCriticalValue) {
          allCriticalDiceMatch = false;
          break;
        } else if (!this.isCalculatingCritical && isCriticalValue) {
          allCriticalDiceMatch = false;
          break;
        }
      }
    }
    
    return allCriticalDiceMatch;
  }

  // 获取实际参与暴击判定的骰子值（考虑keep、reroll等操作的影响）
  getEffectiveCriticalDiceValues(currentValues, ast) {
    const criticalDiceValues = [];
    
    // 递归分析AST，找出实际参与暴击判定的骰子
    const analyzeCriticalDice = (node, values) => {
      if (!node) return [];
      
      switch (node.type) {
        case 'dice':
          if (node.isCriticalDice && node.id !== undefined && values.has(node.id)) {
            // 对于多骰子（如2D20），需要为每个骰子创建独立的判定
            const diceCount = node.count || 1;
            if (diceCount > 1) {
              const results = [];
              for (let i = 0; i < diceCount; i++) {
                const individualDiceId = `${node.id}_${i}`;
                if (values.has(individualDiceId)) {
                  results.push({ diceId: individualDiceId, effectiveValue: values.get(individualDiceId) });
                }
              }
              return results;
            } else {
              return [{ diceId: node.id, effectiveValue: values.get(node.id) }];
            }
          }
          break;
          
        case 'dice_ref':
          if (node.isCriticalDice && values.has(node.id)) {
            return [{ diceId: node.id, effectiveValue: values.get(node.id) }];
          }
          break;
          
        case 'keep':
          // Keep操作的特殊处理：暴击判定基于所有原始骰子，而不是被保留的骰子
          const expressions = node.expressions || [node.expression];
          let allDiceValues = [];
          
          for (const expr of expressions) {
            const exprDice = analyzeCriticalDice(expr, values);
            allDiceValues.push(...exprDice);
          }
          
          // 对于keep操作，暴击判定应该考虑所有原始骰子
          // 而不是只考虑被保留的骰子，因为暴击是基于原始投掷结果
          return allDiceValues;
          
        case 'reroll':
          // Reroll操作：使用重投后的值进行暴击判定
          if (node.dice && node.dice.isCriticalDice && node.dice.id !== undefined && values.has(node.dice.id)) {
            const originalValue = values.get(node.dice.id);
            // 对于引用骰子系统，我们直接使用当前值（已经是重投后的结果）
            return [{ diceId: node.dice.id, effectiveValue: originalValue }];
          }
          break;
          
        case 'binary_op':
        case 'comparison':
          const leftResults = analyzeCriticalDice(node.left, values);
          const rightResults = analyzeCriticalDice(node.right, values);
          return [...leftResults, ...rightResults];
          
        case 'conditional':
          // 条件表达式：检查所有分支
          const conditionResults = analyzeCriticalDice(node.condition, values);
          const trueResults = analyzeCriticalDice(node.trueValue, values);
          const falseResults = analyzeCriticalDice(node.falseValue, values);
          return [...conditionResults, ...trueResults, ...falseResults];
          
        case 'exploding':
        case 'exploding_sum':
          // 爆炸骰：检查基础表达式
          return analyzeCriticalDice(node.baseExpression || node.diceNode, values);
          
        case 'critical_double':
        case 'critical_only':
          return analyzeCriticalDice(node.expression, values);
          
        case 'critical_switch':
          const normalResults = analyzeCriticalDice(node.normalExpression, values);
          const criticalResults = analyzeCriticalDice(node.criticalExpression, values);
          return [...normalResults, ...criticalResults];
      }
      
      return [];
    };
    
    if (ast) {
      return analyzeCriticalDice(ast, currentValues);
    }
    
    // 如果没有AST，使用原来的简单逻辑作为后备
    for (const [diceId, diceValue] of currentValues.entries()) {
      const diceDef = this.currentDiceRegistry.get(diceId);
      if (diceDef && diceDef.isCriticalDice) {
        criticalDiceValues.push({ diceId, effectiveValue: diceValue });
      }
    }
    
    return criticalDiceValues;
  }
  
  // 在固定骰子值的情况下评估表达式
  evaluateWithFixedDice(node) {
    switch (node.type) {
      case 'number':
        return { [node.value]: 1 };
        
      case 'dice':
        // 如果有ID且设置了固定值，使用固定值
        if (node.id !== undefined && this.currentDiceValues && this.currentDiceValues.has(node.id)) {
          const value = this.currentDiceValues.get(node.id);
          return { [value]: 1 };
        } else {
          // 没有复用的骰子，正常计算
          const diceResult = this.calculateBasicDice(node.count, node.sides);
          if (node.isCriticalDice) {
            diceResult.isCriticalDice = true;
          }
          return diceResult;
        }
        
      case 'dice_ref':
        // 骰子引用，必须使用固定值
        if (this.currentDiceValues && this.currentDiceValues.has(node.id)) {
          const value = this.currentDiceValues.get(node.id);
          // 对于骰子引用，直接返回值，不进行暴击过滤
          // 暴击过滤应该在骰子复用系统的上层处理，这里只负责返回引用的值
          return { [value]: 1 };
        } else {
          throw new Error(`引用的骰子 d_${node.id} 没有固定值`);
        }
        
      case 'binary_op':
        return this.calculateBinaryOpWithFixedDice(node.left, node.right, node.operator);
        
      case 'comparison':
        return this.calculateComparisonWithFixedDice(node.left, node.right, node.operator);
        
      case 'conditional':
        return this.calculateConditionalWithFixedDice(node.condition, node.trueValue, node.falseValue);
        
      case 'keep':
        const expressions = node.expressions || [node.expression];
        return this.calculateKeepWithFixedDice(expressions, node.count, node.keepType);
        
      case 'reroll':
        return this.calculateReroll(node.dice, node.minValue, node.maxValue, node.maxRerolls);
        
      case 'exploding':
        return this.calculateExploding(node);
        
      case 'exploding_sum':
        return this.calculateExplodingSum(node);
        
      case 'critical_double':
        return this.calculateCriticalDoubleWithFixedDice(node.expression);
        
      case 'critical_switch':
        return this.calculateCriticalSwitchWithFixedDice(node.normalExpression, node.criticalExpression);
        
      case 'critical_only':
        return this.calculateCriticalOnlyWithFixedDice(node.expression);
        
      default:
        throw new Error(`未知节点类型: ${node.type}`);
    }
  }
  
  // 在固定骰子值下计算二元运算
  calculateBinaryOpWithFixedDice(left, right, operator) {
    const leftResult = this.evaluateWithFixedDice(left);
    const rightResult = this.evaluateWithFixedDice(right);
    
    return this.calculateNormalBinaryOp(leftResult, rightResult, operator);
  }
  
  // 在固定骰子值下计算比较
  calculateComparisonWithFixedDice(left, right, operator) {
    const leftResult = this.evaluateWithFixedDice(left);
    const rightResult = this.evaluateWithFixedDice(right);
    
    // 对于固定值，比较应该返回确定的结果
    const leftValue = parseFloat(Object.keys(leftResult)[0]);
    const rightValue = parseFloat(Object.keys(rightResult)[0]);
    
    let success = false;
    switch (operator) {
      case '>':
        success = leftValue > rightValue;
        break;
      case '<':
        success = leftValue < rightValue;
        break;
      case '=':
      case '==':
        success = leftValue === rightValue;
        break;
      case '>=':
        success = leftValue >= rightValue;
        break;
      case '<=':
        success = leftValue <= rightValue;
        break;
    }
    
    return {
      type: 'probability',
      successProbability: success ? 1 : 0,
      failureProbability: success ? 0 : 1,
      successCount: success ? 1 : 0,
      totalCount: 1,
      distribution: {
        1: success ? 1 : 0,
        0: success ? 0 : 1
      }
    };
  }
  
  // 在固定骰子值下计算条件表达式
  calculateConditionalWithFixedDice(conditionNode, trueValueNode, falseValueNode) {
    const conditionResult = this.evaluateWithFixedDice(conditionNode);
    
    if (conditionResult.type !== 'probability') {
      throw new Error('条件表达式的条件部分必须是比较操作');
    }
    
    if (conditionResult.successProbability > 0) {
      // 条件为真
      return this.evaluateWithFixedDice(trueValueNode);
    } else {
      // 条件为假
      return this.evaluateWithFixedDice(falseValueNode);
    }
  }
  
  // 在固定骰子值下计算Keep操作
  calculateKeepWithFixedDice(expressions, keepCount, keepType) {
    // 如果只有一个表达式，检查是否为传统格式
    if (expressions.length === 1) {
      const expr = expressions[0];
      // 对于传统的单一骰子表达式（如4d6），按原逻辑处理
      if (expr.type === 'dice') {
        return this.calculateKeepSingleDice(expr, keepCount, keepType);
      }
      // 对于复合表达式（如带重骰的），需要特殊处理
      return this.calculateKeepComplexWithFixedDice(expr, keepCount, keepType);
    }
    
    // 多个表达式的情况（如kl(d_1;d_2)）
    return this.calculateKeepMultipleWithFixedDice(expressions, keepCount, keepType);
  }

  // 计算复合表达式的Keep操作（支持重骰等）- 固定骰子值版本
  calculateKeepComplexWithFixedDice(expression, keepCount, keepType) {
    // 首先计算复合表达式的所有可能结果
    const expressionResult = this.evaluateWithFixedDice(expression);
    
    // 对于keep操作，我们需要模拟每种可能的结果情况
    const result = {};
    
    for (const [value, count] of Object.entries(expressionResult)) {
      const val = parseInt(value);
      
      // 对于复合表达式，我们假设每个结果都是从一个"虚拟骰子"中得出的
      // 因此keep操作直接返回该值
      if (keepCount >= 1) {
        result[val] = (result[val] || 0) + count;
      }
    }
    
    return result;
  }

  // 计算多个不同表达式的Keep操作 - 固定骰子值版本
  calculateKeepMultipleWithFixedDice(expressions, keepCount, keepType) {
    // 计算每个表达式的结果分布 - 使用固定骰子值版本
    const distributions = expressions.map(expr => this.evaluateWithFixedDice(expr));
    
    const result = {};
    
    // 生成所有可能的组合
    function generateMultipleExpressionCombinations(distributions) {
      if (distributions.length === 1) {
        const dist = distributions[0];
        // 过滤掉非数字键，避免NaN
        return Object.entries(dist)
          .filter(([value, count]) => !isNaN(parseInt(value)))
          .map(([value, count]) => ({
            values: [parseInt(value)],
            count
          }));
      }
      
      const firstDist = distributions[0];
      const restCombinations = generateMultipleExpressionCombinations(distributions.slice(1));
      const combinations = [];
      
      // 过滤掉非数字键，避免NaN
      const filteredEntries = Object.entries(firstDist)
        .filter(([value, count]) => !isNaN(parseInt(value)));
      
      for (const [value, count] of filteredEntries) {
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
  
  // 在固定骰子值下计算暴击翻倍
  calculateCriticalDoubleWithFixedDice(expression) {
    const result = this.evaluateWithFixedDice(expression);
    
    if (this.isCalculatingCritical) {
      const doubledResult = {};
      for (const [value, count] of Object.entries(result)) {
        const val = parseFloat(value);
        doubledResult[val * 2] = count;
      }
      return doubledResult;
    } else {
      return result;
    }
  }
  
  // 在固定骰子值下计算暴击切换
  calculateCriticalSwitchWithFixedDice(normalExpression, criticalExpression) {
    if (this.isCalculatingCritical) {
      return this.evaluateWithFixedDice(criticalExpression);
    } else {
      return this.evaluateWithFixedDice(normalExpression);
    }
  }
  
  // 在固定骰子值下计算暴击专用
  calculateCriticalOnlyWithFixedDice(expression) {
    if (this.isCalculatingCritical) {
      return this.evaluateWithFixedDice(expression);
    } else {
      return { 0: 1 };
    }
  }
}

export default DiceCalculator;
