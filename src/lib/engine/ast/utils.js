// AST 工具：从 DiceCalculator 抽离的纯函数

export function nodeToString(node) {
  if (!node) return '';
  switch (node.type) {
    case 'number':
      return node.value.toString();
    case 'dice':
      return `${node.count || ''}d${node.sides}`;
    case 'binary_op':
      return `${nodeToString(node.left)} ${node.operator} ${nodeToString(node.right)}`;
    case 'comparison':
      return `${nodeToString(node.left)} ${node.operator} ${nodeToString(node.right)}`;
    case 'conditional':
      return `${nodeToString(node.condition)} ? ${nodeToString(node.trueValue)} : ${nodeToString(node.falseValue)}`;
    case 'group':
      return `(${nodeToString(node.expression)})`;
    default:
      return node.value ? node.value.toString() : '';
  }
}

export function containsCriticalDice(node) {
  if (!node) return false;
  if ((node.type === 'dice' || node.type === 'dice_ref') && node.isCriticalDice) return true;
  if (node.type === 'keep' && node.expressions) return node.expressions.some(expr => containsCriticalDice(expr));
  if (node.type === 'conditional') return containsCriticalDice(node.condition) || containsCriticalDice(node.trueValue) || containsCriticalDice(node.falseValue);
  if (node.type === 'comparison') return containsCriticalDice(node.left) || containsCriticalDice(node.right);
  if (node.type === 'critical_double' || node.type === 'critical_only') return containsCriticalDice(node.expression);
  if (node.type === 'critical_switch') return containsCriticalDice(node.normalExpression) || containsCriticalDice(node.criticalExpression);
  if (node.left && containsCriticalDice(node.left)) return true;
  if (node.right && containsCriticalDice(node.right)) return true;
  if (node.expression && containsCriticalDice(node.expression)) return true;
  if (node.baseExpression && containsCriticalDice(node.baseExpression)) return true;
  if (node.diceNode && containsCriticalDice(node.diceNode)) return true;
  return false;
}
