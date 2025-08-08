// 暴击相关通用工具，从 diceCalculator.js 抽离

export function getRawDiceDistribution(calc, node) {
  if (!node) return {};
  if (node.type === 'dice' && node.isCriticalDice) {
    return calc.calculateBasicDice(node.count, node.sides);
  }
  if (node.type === 'dice_ref' && node.isCriticalDice) {
    return calc.calculateBasicDice(node.count, node.sides);
  }
  if (node.type === 'reroll' && node.dice && node.dice.isCriticalDice) {
    return calc.calculateBasicDice(node.dice.count, node.dice.sides);
  }
  if (node.type === 'exploding' && node.diceNode && node.diceNode.isCriticalDice) {
    return calc.calculateBasicDice(node.diceNode.count, node.diceNode.sides);
  }
  if (node.type === 'exploding_sum' && node.diceNode && node.diceNode.isCriticalDice) {
    return calc.calculateBasicDice(node.diceNode.count, node.diceNode.sides);
  }
  if (node.type === 'binary_op') {
    const leftRaw = getRawDiceDistribution(calc, node.left);
    const rightRaw = getRawDiceDistribution(calc, node.right);
    if (Object.keys(leftRaw).length > 0) return leftRaw;
    if (Object.keys(rightRaw).length > 0) return rightRaw;
  }
  if (node.type === 'keep' && node.expressions) {
    for (const expr of node.expressions) {
      if (expr.type === 'dice' && expr.isCriticalDice) {
        return calc.calculateBasicDice(1, expr.sides);
      }
      const rawDist = getRawDiceDistribution(calc, expr);
      if (Object.keys(rawDist).length > 0) return rawDist;
    }
  }
  return {};
}

export function getDiceInfoFromCondition(calc, conditionNode) {
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

export function calculateConstantContribution(calc, node) {
  if (!node) return 0;
  if (node.type === 'number') return node.value;
  if (node.type === 'dice' && !node.isCriticalDice) {
    const average = ((node.sides || 20) + 1) / 2;
    return (node.count || 1) * average;
  }
  if ((node.type === 'dice' || node.type === 'dice_ref') && node.isCriticalDice) return 0;
  if (node.type === 'dice_ref' && !node.isCriticalDice) {
    const average = ((node.sides || 20) + 1) / 2;
    return (node.count || 1) * average;
  }
  if (node.type === 'binary_op') {
    const leftContrib = calc.containsCriticalDice(node.left) ? 0 : calculateConstantContribution(calc, node.left);
    const rightContrib = calc.containsCriticalDice(node.right) ? 0 : calculateConstantContribution(calc, node.right);
    switch (node.operator) {
      case '+': return leftContrib + rightContrib;
      case '-': return leftContrib - rightContrib;
      case '*': return leftContrib * rightContrib;
      case '/': return rightContrib !== 0 ? leftContrib / rightContrib : 0;
    }
  }
  return 0;
}

export function canProduceResult(calc, node, rawDiceValue, finalResult) {
  if (!node) return false;
  if ((node.type === 'dice' || node.type === 'dice_ref') && node.isCriticalDice) {
    return rawDiceValue === finalResult;
  }
  if (node.type === 'reroll' && node.dice && node.dice.isCriticalDice) {
    const { minValue, maxValue } = node;
    if (rawDiceValue >= minValue && rawDiceValue <= maxValue) {
      return finalResult >= 1 && finalResult <= node.dice.sides;
    } else {
      return rawDiceValue === finalResult;
    }
  }
  if (node.type === 'exploding' && node.diceNode && node.diceNode.isCriticalDice) {
    return finalResult >= 0;
  }
  if (node.type === 'exploding_sum' && node.diceNode && node.diceNode.isCriticalDice) {
    return finalResult >= rawDiceValue;
  }
  if (node.type === 'binary_op') {
    const left = node.left;
    const right = node.right;
    if (calc.containsCriticalDice(left)) {
      if ((left.type === 'dice' || left.type === 'dice_ref') && left.isCriticalDice) {
        const rightContribution = calculateConstantContribution(calc, right);
        switch (node.operator) {
          case '+': return rawDiceValue + rightContribution === finalResult;
          case '-': return rawDiceValue - rightContribution === finalResult;
          case '*': return rawDiceValue * rightContribution === finalResult;
          case '/': return rightContribution !== 0 && rawDiceValue / rightContribution === finalResult;
        }
      } else {
        const rightContribution = calculateConstantContribution(calc, right);
        let expectedLeftResult;
        switch (node.operator) {
          case '+': expectedLeftResult = finalResult - rightContribution; break;
          case '-': expectedLeftResult = finalResult + rightContribution; break;
          case '*': expectedLeftResult = rightContribution !== 0 ? finalResult / rightContribution : 0; break;
          case '/': expectedLeftResult = finalResult * rightContribution; break;
          default: return false;
        }
        return canProduceResult(calc, left, rawDiceValue, expectedLeftResult);
      }
    } else if (calc.containsCriticalDice(right)) {
      if ((right.type === 'dice' || right.type === 'dice_ref') && right.isCriticalDice) {
        const leftContribution = calculateConstantContribution(calc, left);
        switch (node.operator) {
          case '+': return leftContribution + rawDiceValue === finalResult;
          case '-': return leftContribution - rawDiceValue === finalResult;
          case '*': return leftContribution * rawDiceValue === finalResult;
          case '/': return rawDiceValue !== 0 && leftContribution / rawDiceValue === finalResult;
        }
      } else {
        const leftContribution = calculateConstantContribution(calc, left);
        let expectedRightResult;
        switch (node.operator) {
          case '+': expectedRightResult = finalResult - leftContribution; break;
          case '-': expectedRightResult = leftContribution - finalResult; break;
          case '*': expectedRightResult = leftContribution !== 0 ? finalResult / leftContribution : 0; break;
          case '/': expectedRightResult = finalResult !== 0 ? leftContribution / finalResult : 0; break;
          default: return false;
        }
        return canProduceResult(calc, right, rawDiceValue, expectedRightResult);
      }
    }
  }
  if (node.type === 'keep' && node.expressions) {
    for (const expr of node.expressions) {
      if (calc.containsCriticalDice(expr)) {
        if (expr.type === 'dice' && expr.isCriticalDice) {
          const diceSides = expr.sides || 20;
          const keepType = node.keepType || 'highest';
          if (keepType === 'highest') {
            if (finalResult >= rawDiceValue && finalResult <= diceSides) return true;
          } else if (keepType === 'lowest') {
            if (finalResult <= rawDiceValue && finalResult >= 1) return true;
          }
        } else {
          return canProduceResult(calc, expr, rawDiceValue, finalResult);
        }
      }
    }
  }
  return false;
}

export function evaluateConditionWithCritical(calc, conditionNode, actualCriticalProbability) {
  if (conditionNode.type !== 'comparison') {
    return { normalSuccessProbability: 0, criticalSuccessProbability: 0, failureProbability: 1 };
  }
  const leftResult = calc.evaluate(conditionNode.left);
  const rightResult = calc.evaluate(conditionNode.right);
  const leftDistribution = calc.extractDistribution(leftResult);
  const rightDistribution = calc.extractDistribution(rightResult);
  const diceInfo = getDiceInfoFromCondition(calc, conditionNode);
  const diceSides = diceInfo.sides;
  const leftHasCriticalDice = calc.containsCriticalDice(conditionNode.left);
  const rightHasCriticalDice = calc.containsCriticalDice(conditionNode.right);
  let rawDiceDistribution = {};
  if (leftHasCriticalDice) rawDiceDistribution = getRawDiceDistribution(calc, conditionNode.left);
  else if (rightHasCriticalDice) rawDiceDistribution = getRawDiceDistribution(calc, conditionNode.right);
  let totalSuccessCount = 0;
  let totalCriticalSuccessCount = 0;
  let totalFailureCount = 0;
  const criticalSides = Math.max(1, Math.round(diceSides * actualCriticalProbability));
  const criticalThreshold = diceSides - criticalSides + 1;
  const rightIsSingle = Object.keys(rightDistribution).length === 1 && Object.keys(rightDistribution)[0] !== undefined;
  const leftIsSingle = Object.keys(leftDistribution).length === 1 && Object.keys(leftDistribution)[0] !== undefined;
  if (rightIsSingle) {
    const rightValue = parseInt(Object.keys(rightDistribution)[0]);
    for (const [leftValue, leftCount] of Object.entries(leftDistribution)) {
      const leftVal = parseInt(leftValue);
      let success = false;
      switch (conditionNode.operator) {
        case '>': success = leftVal > rightValue; break;
        case '<': success = leftVal < rightValue; break;
        case '=':
        case '==': success = leftVal === rightValue; break;
        case '>=': success = leftVal >= rightValue; break;
        case '<=': success = leftVal <= rightValue; break;
      }
      if (success) {
        let isCritical = false;
        if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
          for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
            const rawVal = parseInt(rawDiceValue);
            if (rawVal >= criticalThreshold) {
              if (canProduceResult(calc, conditionNode.left, rawVal, leftVal)) { isCritical = true; break; }
            }
          }
        } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
          for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
            const rawVal = parseInt(rawDiceValue);
            if (rawVal >= criticalThreshold) {
              if (canProduceResult(calc, conditionNode.right, rawVal, rightValue)) { isCritical = true; break; }
            }
          }
        }
        if (isCritical) totalCriticalSuccessCount += leftCount; else totalSuccessCount += leftCount;
      } else {
        totalFailureCount += leftCount;
      }
    }
  } else if (leftIsSingle) {
    const leftValue = parseInt(Object.keys(leftDistribution)[0]);
    for (const [rightValue, rightCount] of Object.entries(rightDistribution)) {
      const rightVal = parseInt(rightValue);
      let success = false;
      switch (conditionNode.operator) {
        case '>': success = leftValue > rightVal; break;
        case '<': success = leftValue < rightVal; break;
        case '=':
        case '==': success = leftValue === rightVal; break;
        case '>=': success = leftValue >= rightVal; break;
        case '<=': success = leftValue <= rightVal; break;
      }
      if (success) {
        let isCritical = false;
        if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
          for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
            const rawVal = parseInt(rawDiceValue);
            if (rawVal >= criticalThreshold) {
              if (canProduceResult(calc, conditionNode.left, rawVal, leftValue)) { isCritical = true; break; }
            }
          }
        } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
          for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
            const rawVal = parseInt(rawDiceValue);
            if (rawVal >= criticalThreshold) {
              if (canProduceResult(calc, conditionNode.right, rawVal, rightVal)) { isCritical = true; break; }
            }
          }
        }
        if (isCritical) totalCriticalSuccessCount += rightCount; else totalSuccessCount += rightCount;
      } else {
        totalFailureCount += rightCount;
      }
    }
  } else {
    for (const [leftVal, leftCount] of Object.entries(leftDistribution)) {
      for (const [rightVal, rightCount] of Object.entries(rightDistribution)) {
        const combinedCount = leftCount * rightCount;
        const leftValue = parseFloat(leftVal);
        const rightValue = parseFloat(rightVal);
        let success = false;
        switch (conditionNode.operator) {
          case '>': success = leftValue > rightValue; break;
          case '<': success = leftValue < rightValue; break;
          case '=':
          case '==': success = leftValue === rightValue; break;
          case '>=': success = leftValue >= rightValue; break;
          case '<=': success = leftValue <= rightValue; break;
        }
        if (success) {
          let isCritical = false;
          if (leftHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
            for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
              const rawVal = parseInt(rawDiceValue);
              if (rawVal >= criticalThreshold) {
                if (canProduceResult(calc, conditionNode.left, rawVal, leftValue)) { isCritical = true; break; }
              }
            }
          } else if (rightHasCriticalDice && Object.keys(rawDiceDistribution).length > 0) {
            for (const [rawDiceValue] of Object.entries(rawDiceDistribution)) {
              const rawVal = parseInt(rawDiceValue);
              if (rawVal >= criticalThreshold) {
                if (canProduceResult(calc, conditionNode.right, rawVal, rightValue)) { isCritical = true; break; }
              }
            }
          }
          if (isCritical) totalCriticalSuccessCount += combinedCount; else totalSuccessCount += combinedCount;
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
// 暴击相关通用工具（从 DiceCalculator 抽离）

export function findCriticalDiceInNode(calc, node) {
  if (!node) return null;
  if (node.type === 'dice' && node.isCriticalDice) {
    return { sides: node.sides || 20, count: node.count || 1 };
  }
  if (node.type === 'dice_ref' && node.isCriticalDice) {
    return { sides: node.sides || 20, count: node.count || 1 };
  }
  if (node.type === 'binary_op') {
    const left = findCriticalDiceInNode(calc, node.left);
    if (left) return left;
    const right = findCriticalDiceInNode(calc, node.right);
    if (right) return right;
  }
  if (node.type === 'keep' && node.expressions) {
    for (const expr of node.expressions) {
      const res = findCriticalDiceInNode(calc, expr);
      if (res) return res;
    }
  }
  return null;
}

// Note: duplicate implementations removed to avoid redeclarations.

export function getCriticalDiceSidesFromAST(calc, ast) {
  const findSides = (node) => {
    if (!node) return null;
    if ((node.type === 'dice' || node.type === 'dice_ref') && node.isCriticalDice) return node.sides || 20;
    if (node.type === 'reroll' && node.dice && node.dice.isCriticalDice) return node.dice.sides || 20;
    if (node.type === 'keep' && node.expressions) {
      for (const expr of node.expressions) {
        const s = findSides(expr); if (s !== null) return s;
      }
    }
    if (node.left) { const s = findSides(node.left); if (s !== null) return s; }
    if (node.right) { const s = findSides(node.right); if (s !== null) return s; }
    if (node.expressions) {
      for (const expr of node.expressions) { const s = findSides(expr); if (s !== null) return s; }
    }
    if (node.expression) return findSides(node.expression);
    if (node.condition) return findSides(node.condition);
    return null;
  };
  return findSides(ast) || 20;
}

export function convertCriticalRateToSides(criticalRate, diceSides) {
  if (criticalRate <= 0) return 0;
  if (criticalRate >= 100) return diceSides;
  const probabilityPerSide = 100 / diceSides;
  const targetSides = Math.round(criticalRate / probabilityPerSide);
  return Math.max(1, Math.min(diceSides, targetSides));
}

export function isSimpleD20Condition(conditionNode) {
  if (conditionNode.type !== 'comparison') return false;
  const left = conditionNode.left; const right = conditionNode.right;
  if (left.type === 'dice' && left.count === 1) return right.type === 'number';
  return false;
}

export function extractThresholdFromCondition(conditionNode) {
  if (conditionNode.right && conditionNode.right.type === 'number') return conditionNode.right.value;
  return 0;
}
