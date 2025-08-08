// 词法分析器 - 将输入字符串转换为Token序列（从 diceCalculator.js 抽离，无行为改动）
export class Lexer {
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
      } else if (char === ',') {
        this.tokens.push({ type: 'COMMA', value: ',' });
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
        const maxExplosions = parseInt(explodeSumMatch[3] || '10');
        
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

    // 检查是否是函数名
    if (identifier === 'min' || identifier === 'max' || identifier === 'min_each' || identifier === 'max_each') {
      this.tokens.push({ type: 'FUNCTION', value: identifier });
      return;
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

export default Lexer;
