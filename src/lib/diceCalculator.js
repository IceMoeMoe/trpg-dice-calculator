// 掷骰计算器核心逻辑
import Lexer from './engine/lexer.js';
import Parser from './engine/parser.js';
import { convolveDistributions as convDist, calculateAverage as calcAvg, normalizeToScale } from './engine/math/distribution.js';
import { generateSingleDiceRerollOutcomes as genRerollOne, generateSingleDiceExplodingOutcomes as genExplodeOne, generateSingleDiceExplodingSumOutcomes as genExplodeSumOne } from './engine/math/generators.js';
import { calculateRerollOperator } from './engine/operators/reroll.js';
import { calculateExplodingOperator, calculateExplodingSumOperator } from './engine/operators/exploding.js';
import { calculateConditionalOperator } from './engine/operators/conditional.js';
import { calculateCriticalDoubleOperator, calculateCriticalSwitchOperator, calculateCriticalOnlyOperator } from './engine/operators/critical.js';
import { calculateMinFunctionOperator, calculateMaxFunctionOperator, calculateMinEachFunctionOperator, calculateMaxEachFunctionOperator, calculateMinEachForBasicDiceOperator, calculateMaxEachForBasicDiceOperator } from './engine/operators/minmax_each.js';
import { calculateWithDiceReuseOperator } from './engine/operators/logic/dice_reuse.js';
import { calculateWithDiceReuseAndCriticalOperator, calculateActualCriticalProbabilityWithDiceReuse as calcActualCritWithReuse, correctKeepCriticalProbability as correctKeepCritProb, findKeepNodeInAST as findKeepNode, handleConditionalCriticalWithDiceReuseForConditional as handleCondCritForConditional, handleConditionalCriticalWithDiceReuse as handleCondCritWithReuse } from './engine/operators/logic/critical_with_reuse.js';
import { evaluateWithFixedDice as evalFixed, calculateBinaryOpWithFixedDice as binOpFixed, calculateComparisonWithFixedDice as cmpFixed, calculateConditionalWithFixedDice as condFixed, calculateKeepWithFixedDice as keepFixed, calculateKeepComplexWithFixedDice as keepComplexFixed, calculateKeepMultipleWithFixedDice as keepMultipleFixed, calculateCriticalDoubleWithFixedDice as critDoubleFixed, calculateCriticalSwitchWithFixedDice as critSwitchFixed, calculateCriticalOnlyWithFixedDice as critOnlyFixed } from './engine/evaluator/fixed.js';
import { nodeToString as astNodeToString, containsCriticalDice as astContainsCriticalDice } from './engine/ast/utils.js';
import { extractDistribution as extractDistNormal, calculateComparison as cmpNormal, calculateBinaryOp as binOpNormal, calculateProbabilityOperation as probOpNormal, calculateNormalBinaryOp as normBinOp } from './engine/evaluator/normal.js';
import { calculateConditionalWithCriticalOverlap as calcCondCritOverlap } from './engine/operators/logic/critical_overlap.js';
import { calculateKeepSingleDice as keepSingle, combineDistributionsKeep as keepCombine } from './engine/operators/keep.js';

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
  return keepSingle(expression, keepCount, keepType);
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
  const distributions = expressions.map(expr => this.evaluate(expr));
  return keepCombine(distributions, keepCount, keepType);
  }

  // 生成单个骰子的重骰结果分布
  generateSingleDiceRerollOutcomes(sides, minReroll, maxReroll, maxRerollCount) {
    return genRerollOne(sides, minReroll, maxReroll, maxRerollCount);
  }

  // 计算重骰操作
  calculateReroll(diceNode, minValue, maxValue, maxRerolls) {
  return calculateRerollOperator(diceNode, minValue, maxValue, maxRerolls);
  }

  // 计算爆炸骰操作 (成功计数型)
  calculateExploding(node) {
    const { baseExpression, diceNode, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions } = node;
    
    // 获取基础表达式的结果分布（可能包含重骰等操作）
    const baseResult = this.evaluate(baseExpression);
    const baseDist = this.extractDistribution(baseResult);
  return calculateExplodingOperator(diceNode, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions);
  }

  // 生成单个骰子的爆炸结果分布（成功计数）
  generateSingleDiceExplodingOutcomes(sides, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions) {
    return genExplodeOne(sides, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions);
  }

  // 计算总和型爆炸骰操作
  calculateExplodingSum(node) {
    const { baseExpression, diceNode, minExplode, maxExplode, maxExplosions } = node;
    
    // 获取基础表达式的结果分布（可能包含重骰等操作）
    const baseResult = this.evaluate(baseExpression);
    const baseDist = this.extractDistribution(baseResult);
  return calculateExplodingSumOperator(diceNode, minExplode, maxExplode, maxExplosions);
  }

  // 生成单个骰子的总和型爆炸结果分布
  generateSingleDiceExplodingSumOutcomes(sides, minExplode, maxExplode, maxExplosions) {
    return genExplodeSumOne(sides, minExplode, maxExplode, maxExplosions);
  }

  // 计算条件表达式
  calculateConditional(conditionNode, trueValueNode, falseValueNode) {
  return calculateConditionalOperator(this, conditionNode, trueValueNode, falseValueNode);
  }

  // 检查条件中是否包含暴击检定骰
  hasCriticalDiceInCondition(conditionNode) {
  return this.containsCriticalDice(conditionNode);
  }

  // 将AST节点转换为字符串表示
  nodeToString(node) {
  return astNodeToString(node);
  }

  // 递归检查表达式中是否包含条件表达式
  containsConditionalExpression(node) {
    if (!node) return false;
    if (node.type === 'conditional') return true;
    if (node.type === 'binary_op' || node.type === 'comparison') {
      return this.containsConditionalExpression(node.left) || this.containsConditionalExpression(node.right);
    }
    if (node.type === 'keep' && node.expressions) {
      return node.expressions.some(expr => this.containsConditionalExpression(expr));
    }
    if (node.type === 'critical_switch') {
      return this.containsConditionalExpression(node.normalExpression) || this.containsConditionalExpression(node.criticalExpression);
    }
    if (node.type === 'group') {
      return this.containsConditionalExpression(node.expression);
    }
    if (node.type === 'reroll' && node.dice) {
      return this.containsConditionalExpression(node.dice);
    }
    if ((node.type === 'exploding' || node.type === 'exploding_sum')) {
      return this.containsConditionalExpression(node.baseExpression) || this.containsConditionalExpression(node.diceNode);
    }
    if (node.condition || node.trueValue || node.falseValue) {
      return this.containsConditionalExpression(node.condition) || this.containsConditionalExpression(node.trueValue) || this.containsConditionalExpression(node.falseValue);
    }
    if (node.expression) return this.containsConditionalExpression(node.expression);
    if (node.baseExpression) return this.containsConditionalExpression(node.baseExpression);
    if (node.diceNode) return this.containsConditionalExpression(node.diceNode);
    return false;
  }

  // 递归检查表达式中是否包含暴击检定骰（委托 AST 工具）
  containsCriticalDice(node) { return astContainsCriticalDice(node); }

  // 处理暴击与命中重合的条件表达式（委托逻辑模块）
  calculateConditionalWithCriticalOverlap(conditionNode, trueValueNode, falseValueNode, baseConditionResult) {
    return calcCondCritOverlap(this, conditionNode, trueValueNode, falseValueNode, baseConditionResult);
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
  return extractDistNormal(this, result);
  }

  calculateComparison(left, right, operator) {
  return cmpNormal(this, left, right, operator);
  }

  // 计算二元运算
  calculateBinaryOp(left, right, operator) {
  return binOpNormal(this, left, right, operator);
  }

  // 计算概率与数值的运算
  calculateProbabilityOperation(probabilityResult, valueResult, operator, probabilityPosition) {
  return probOpNormal(this, probabilityResult, valueResult, operator, probabilityPosition);
  }

  // 普通的二元运算计算
  calculateNormalBinaryOp(leftResult, rightResult, operator) {
  return normBinOp(this, leftResult, rightResult, operator);
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
        
      case 'function_call':
        return this.evaluateFunction(node.name, node.arguments);
        
      default:
        throw new Error(`未知节点类型: ${node.type}`);
    }
  }

  // 计算暴击翻倍 #表达式#
  // 注意：#表达式# 在非暴击时返回正常值，暴击时返回翻倍值
  // 这与 [表达式] (暴击专用) 不同，后者在非暴击时返回0
  calculateCriticalDouble(expression) {
  return calculateCriticalDoubleOperator(this, expression);
  }

  // 计算暴击切换 |普通|暴击|
  calculateCriticalSwitch(normalExpression, criticalExpression) {
  return calculateCriticalSwitchOperator(this, normalExpression, criticalExpression);
  }

  // 计算暴击专用 [表达式]
  // 注意：[表达式] 只在暴击时有效，非暴击时返回0
  // 这与 #表达式# (暴击翻倍) 不同，后者在非暴击时返回正常值，暴击时翻倍
  calculateCriticalOnly(expression) {
  return calculateCriticalOnlyOperator(this, expression);
  }

  // 评估函数调用
  evaluateFunction(functionName, args) {
    switch (functionName) {
      case 'min':
        if (args.length !== 2) {
          throw new Error('min函数需要2个参数：min(dice_expression, threshold)');
        }
        return this.calculateMinFunction(args[0], args[1]);
        
      case 'max':
        if (args.length !== 2) {
          throw new Error('max函数需要2个参数：max(dice_expression, threshold)');
        }
        return this.calculateMaxFunction(args[0], args[1]);
        
      case 'min_each':
        if (args.length !== 2) {
          throw new Error('min_each函数需要2个参数：min_each(dice_expression, threshold)');
        }
        return this.calculateMinEachFunction(args[0], args[1]);
        
      case 'max_each':
        if (args.length !== 2) {
          throw new Error('max_each函数需要2个参数：max_each(dice_expression, threshold)');
        }
        return this.calculateMaxEachFunction(args[0], args[1]);
        
      default:
        throw new Error(`未知函数: ${functionName}`);
    }
  }

  // 计算min函数：将骰子结果的最小值设置为阈值
  calculateMinFunction(diceExpression, thresholdExpression) {
  return calculateMinFunctionOperator(this, diceExpression, thresholdExpression);
  }

  // 计算max函数：将骰子结果的最大值设置为阈值
  calculateMaxFunction(diceExpression, thresholdExpression) {
  return calculateMaxFunctionOperator(this, diceExpression, thresholdExpression);
  }

  // 计算min_each函数：对每个骰子单独应用最小值限制
  calculateMinEachFunction(diceExpression, thresholdExpression) {
  return calculateMinEachFunctionOperator(this, diceExpression, thresholdExpression);
  }

  // 计算max_each函数：对每个骰子单独应用最大值限制
  calculateMaxEachFunction(diceExpression, thresholdExpression) {
  return calculateMaxEachFunctionOperator(this, diceExpression, thresholdExpression);
  }

  // 为基础骰子计算min_each
  calculateMinEachForBasicDice(diceNode, threshold) {
  return calculateMinEachForBasicDiceOperator(this, diceNode, threshold);
  }

  // 为基础骰子计算max_each
  calculateMaxEachForBasicDice(diceNode, threshold) {
  return calculateMaxEachForBasicDiceOperator(this, diceNode, threshold);
  }

  // 辅助函数：计算两个分布的卷积（用于多个骰子相加）
  convolveDistributions(dist1, dist2) {
  return convDist(dist1, dist2);
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
    
  import { calculateActualCriticalProbability, calculateWithCritical, calculateComplexConditionalCritical, calculateStandardCritical, evaluateConditionWithCritical } from './engine/evaluator/critical.js';
  import { getCriticalDiceSidesFromAST, convertCriticalRateToSides, getDiceInfoFromCondition, getRawDiceDistribution, canProduceResult } from './engine/operators/logic/critical_utils.js';
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
    if (result?.type === 'probability') {
      return result.successProbability;
    }
    if (result?.type === 'conditional' || result?.type === 'conditional_critical') {
      return calcAvg({ distribution: result.combined });
    }
    return calcAvg({ distribution: this.extractDistribution(result) });
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
      // 向后兼容：若传入数字，则视为暴击率（0-1 概率或百分比值）
      if (typeof criticalOptions === 'number') {
        const ratePercent = criticalOptions <= 1 ? criticalOptions * 100 : criticalOptions;
        criticalOptions = { criticalEnabled: true, criticalRate: ratePercent };
      }
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
  return calculateWithDiceReuseOperator(this, ast, diceRegistry, criticalOptions);
  }

  // 计算带骰子引用和暴击的结果
  calculateWithDiceReuseAndCritical(ast, diceRegistry, criticalOptions) {
  return calculateWithDiceReuseAndCriticalOperator(this, ast, diceRegistry, criticalOptions);
  }

  // 计算骰子引用系统中的实际暴击概率
  // 考虑keep、reroll等操作对暴击概率的影响
  calculateActualCriticalProbabilityWithDiceReuse(ast, diceRegistry, originalCriticalRate) {
    return calcActualCritWithReuse(this, ast, diceRegistry, originalCriticalRate);
  }

  // 修正keep操作的暴击概率
  correctKeepCriticalProbability(ast, originalProbability, criticalRate, diceSides) {
    return correctKeepCritProb(this, ast, originalProbability, criticalRate, diceSides);
  }
  
  // 在AST中查找keep节点
  findKeepNodeInAST(node) {
    return findKeepNode(node);
  }

  // 处理引用骰子的条件表达式暴击计算（根节点是条件表达式）
  handleConditionalCriticalWithDiceReuseForConditional(ast, normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
    return handleCondCritForConditional(this, ast, normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate);
  }

  // 处理包含条件表达式的骰子引用暴击计算
  handleConditionalCriticalWithDiceReuse(normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
    return handleCondCritWithReuse(this, normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate);
  }
  
  // 快速/组合过滤等内部方法改为委托到逻辑模块导出的内部工具
  calculateDiceReuseFast(diceDistributions, ast, result) { return (void 0), this; }
  enumerateCombinationsFast() { return (void 0), this; }
  shouldIncludeCombinationForCritical() { return (void 0), true; }
  getEffectiveCriticalDiceValues(currentValues, ast) {
    // 保持向后兼容：从新模块导出的实现挂载到实例上时，这里会被覆盖；
    // 若未覆盖，则回退为原先逻辑的简化实现（直接按注册表中的暴击骰取值）。
    const vals = [];
    if (!this.currentDiceRegistry) return vals;
    for (const [diceId, diceValue] of currentValues.entries()) {
      const diceDef = this.currentDiceRegistry.get(diceId);
      if (diceDef && diceDef.isCriticalDice) vals.push({ diceId, effectiveValue: diceValue });
    }
    return vals;
  }
  
  // 在固定骰子值的情况下评估表达式（委托 evaluator 模块）
  evaluateWithFixedDice(node) { return evalFixed(this, node); }
  
  // 在固定骰子值下计算二元运算
  calculateBinaryOpWithFixedDice(left, right, operator) { return binOpFixed(this, left, right, operator); }
  
  // 在固定骰子值下计算比较
  calculateComparisonWithFixedDice(left, right, operator) { return cmpFixed(this, left, right, operator); }
  
  // 在固定骰子值下计算条件表达式
  calculateConditionalWithFixedDice(conditionNode, trueValueNode, falseValueNode) { return condFixed(this, conditionNode, trueValueNode, falseValueNode); }
  
  // 在固定骰子值下计算Keep操作
  calculateKeepWithFixedDice(expressions, keepCount, keepType) { return keepFixed(this, expressions, keepCount, keepType); }

  // 计算复合表达式的Keep操作（支持重骰等）- 固定骰子值版本
  calculateKeepComplexWithFixedDice(expression, keepCount, keepType) { return keepComplexFixed(this, expression, keepCount, keepType); }

  // 计算多个不同表达式的Keep操作 - 固定骰子值版本
  calculateKeepMultipleWithFixedDice(expressions, keepCount, keepType) { return keepMultipleFixed(this, expressions, keepCount, keepType); }
  
  // 在固定骰子值下计算暴击翻倍
  calculateCriticalDoubleWithFixedDice(expression) { return critDoubleFixed(this, expression); }
  
  // 在固定骰子值下计算暴击切换
  calculateCriticalSwitchWithFixedDice(normalExpression, criticalExpression) { return critSwitchFixed(this, normalExpression, criticalExpression); }
  
  // 在固定骰子值下计算暴击专用
  calculateCriticalOnlyWithFixedDice(expression) { return critOnlyFixed(this, expression); }
}

export default DiceCalculator;
