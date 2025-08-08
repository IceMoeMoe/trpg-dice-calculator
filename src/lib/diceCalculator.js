// 掷骰计算器核心逻辑
import Lexer from './engine/lexer.js';
import Parser from './engine/parser.js';
import { convolveDistributions as convDist, calculateAverage as calcAvg } from './engine/math/distribution.js';
import { generateSingleDiceRerollOutcomes as genRerollOne } from './engine/math/generators.js';
import { calculateRerollOperator } from './engine/operators/reroll.js';
import { calculateExplodingOperator, calculateExplodingSumOperator } from './engine/operators/exploding.js';
import { calculateConditionalOperator } from './engine/operators/conditional.js';
import { calculateCriticalDoubleOperator, calculateCriticalSwitchOperator, calculateCriticalOnlyOperator } from './engine/operators/critical.js';
import { calculateMinFunctionOperator, calculateMaxFunctionOperator, calculateMinEachFunctionOperator, calculateMaxEachFunctionOperator, calculateMinEachForBasicDiceOperator, calculateMaxEachForBasicDiceOperator } from './engine/operators/minmax_each.js';
import { calculateKeepWithRerollOperator } from './engine/operators/keep_with_reroll.js';
import { calculateWithDiceReuseOperator, diceReuseInternals, calculateDiceReuseFast as reuseCalcFast, shouldIncludeCombinationForCritical as reuseShouldInclude, getEffectiveCriticalDiceValues as reuseGetEff } from './engine/operators/logic/dice_reuse.js';
import { calculateWithDiceReuseAndCriticalOperator, calculateActualCriticalProbabilityWithDiceReuse as calcActualCritWithReuse, correctKeepCriticalProbability as correctKeepCritProb, findKeepNodeInAST as findKeepNode, handleConditionalCriticalWithDiceReuseForConditional as handleCondCritForConditional, handleConditionalCriticalWithDiceReuse as handleCondCritWithReuse } from './engine/operators/logic/critical_with_reuse.js';
import { evaluateWithFixedDice as evalFixed, calculateBinaryOpWithFixedDice as binOpFixed, calculateComparisonWithFixedDice as cmpFixed, calculateConditionalWithFixedDice as condFixed, calculateKeepWithFixedDice as keepFixed, calculateKeepComplexWithFixedDice as keepComplexFixed, calculateKeepMultipleWithFixedDice as keepMultipleFixed, calculateCriticalDoubleWithFixedDice as critDoubleFixed, calculateCriticalSwitchWithFixedDice as critSwitchFixed, calculateCriticalOnlyWithFixedDice as critOnlyFixed } from './engine/evaluator/fixed.js';
import { nodeToString as astNodeToString, containsCriticalDice as astContainsCriticalDice, containsConditionalExpression as astContainsConditional } from './engine/ast/utils.js';
import { calculateBasicDice as mathCalculateBasicDice } from './engine/math/dice.js';
import { extractDistribution as extractDistNormal, calculateComparison as cmpNormal, calculateBinaryOp as binOpNormal, calculateProbabilityOperation as probOpNormal, calculateNormalBinaryOp as normBinOp } from './engine/evaluator/normal.js';
import { calculateConditionalWithCriticalOverlap as calcCondCritOverlap } from './engine/operators/logic/critical_overlap.js';
import { findCriticalConditionInAST as flowFindCriticalCond, substituteNodeInAST as flowSubstituteNode, createDistributionNode as flowCreateDistNode, evaluateExpressionWithSubstitution as flowEvalWithSub, calculateStandardCritical as flowStandardCritical, handleConditionalCritical as flowHandleConditional, calculateComplexConditionalCritical as flowCalcComplex } from './engine/operators/logic/critical_flow.js';
import { getRawDiceDistribution as critGetRawDist, getDiceInfoFromCondition as critGetDiceInfo, calculateConstantContribution as critConstContrib, canProduceResult as critCanProduce, evaluateConditionWithCritical as critEvalCondition, findCriticalDiceInNode as critFindDiceInNode, getCriticalDiceSidesFromAST as critGetSidesFromAST, convertCriticalRateToSides as critConvertRateToSides, isSimpleD20Condition as critIsSimpleCond, extractThresholdFromCondition as critExtractThreshold } from './engine/operators/logic/critical_utils.js';
import { calculateKeepOperator as keepEntry, calculateKeepComplexOperator as keepComplexEntry, calculateKeepMultipleOperator as keepMultipleEntry } from './engine/operators/keep_entry.js';
import { calculateActualCriticalProbability as evalCritActual, calculateWithCritical as evalCritWith } from './engine/evaluator/critical.js';

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
  calculateBasicDice(count, sides) { return mathCalculateBasicDice(count, sides); }

  // AST/分析辅助委托
  nodeToString(node) { return astNodeToString(node); }
  containsCriticalDice(node) { return astContainsCriticalDice(node); }
  containsConditionalExpression(node) { return astContainsConditional(node); }

  // 计算Keep操作 (取最高/最低) - 委托到 keep_entry 模块
  calculateKeep(expressions, keepCount, keepType) { return keepEntry(this, expressions, keepCount, keepType); }
  calculateKeepComplex(expression, keepCount, keepType) { return keepComplexEntry(this, expression, keepCount, keepType); }
  calculateKeepMultiple(expressions, keepCount, keepType) { return keepMultipleEntry(this, expressions, keepCount, keepType); }

  // 计算带重掷的 Keep 操作（委托到算子模块）
  calculateKeepWithReroll(rerollExpr, keepCount, keepType) {
    return calculateKeepWithRerollOperator(rerollExpr, keepCount, keepType);
  }

  // 保留对外兼容：提供生成单骰重掷分布的访问（内部直接使用生成器模块）
  generateSingleDiceRerollOutcomes(sides, minReroll, maxReroll, maxRerollCount) { return genRerollOne(sides, minReroll, maxReroll, maxRerollCount); }

  // 计算重骰操作
  calculateReroll(diceNode, minValue, maxValue, maxRerolls) {
  return calculateRerollOperator(diceNode, minValue, maxValue, maxRerolls);
  }

  // 计算爆炸骰操作 (成功计数型)
  calculateExploding(node) {
  const { diceNode, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions } = node;
  return calculateExplodingOperator(diceNode, minSuccess, maxSuccess, minExplode, maxExplode, maxExplosions);
  }

  // 计算总和型爆炸骰操作
  calculateExplodingSum(node) {
  const { diceNode, minExplode, maxExplode, maxExplosions } = node;
  return calculateExplodingSumOperator(diceNode, minExplode, maxExplode, maxExplosions);
  }

  // （已移除 extractRawDiceValues/isValidRemainingValue）

  // 获取原始骰子值的分布（不含加值）
  getRawDiceDistribution(node) {
  return critGetRawDist(this, node);
  }

  // 评估条件表达式，区分暴击和非暴击情况
  evaluateConditionWithCritical(conditionNode, actualCriticalProbability) {
  return critEvalCondition(this, conditionNode, actualCriticalProbability);
  }

  // 在节点中找到暴击检定骰信息
  findCriticalDiceInNode(node) {
  return critFindDiceInNode(this, node);
  }

  // 从条件中提取暴击检定骰信息
  getDiceInfoFromCondition(conditionNode) {
  return critGetDiceInfo(this, conditionNode);
  }

  // 检查给定的原始骰子值是否能产生特定的最终结果
  canProduceResult(node, rawDiceValue, finalResult) {
  return critCanProduce(this, node, rawDiceValue, finalResult);
  }

  // 计算表达式的常数贡献（不包含暴击检定骰的部分）
  calculateConstantContribution(node) {
  return critConstContrib(this, node);
  }

  // 检查是否是简单的骰子条件（骰子 > threshold 形式）
  isSimpleD20Condition(conditionNode) {
  return critIsSimpleCond(conditionNode);
  }

  // 从条件中提取阈值
  extractThresholdFromCondition(conditionNode) {
  return critExtractThreshold(conditionNode);
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

  // 条件表达式计算（委托模块）
  calculateConditional(conditionNode, trueValueNode, falseValueNode) {
    return calculateConditionalOperator(this, conditionNode, trueValueNode, falseValueNode);
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

  // 条件与暴击重叠的处理（委托逻辑模块）
  calculateConditionalWithCriticalOverlap(conditionNode, trueValueNode, falseValueNode, baseConditionResult) {
    return calcCondCritOverlap(this, conditionNode, trueValueNode, falseValueNode, baseConditionResult);
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
  return evalCritActual(this, ast, originalCriticalRate);
  }

  // 计算带暴击的结果
  calculateWithCritical(ast, originalCriticalRate, diceSides, criticalSides) {
  return evalCritWith(this, ast, originalCriticalRate, diceSides, criticalSides);
  }

  // 处理复杂的条件暴击表达式（如 (D20>10?#1#:0)+d8）
  calculateComplexConditionalCritical(ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) { return flowCalcComplex(this, ast, normalProbability, criticalProbability, originalCriticalRate); }

  // 在AST中找到包含暴击检定骰的条件表达式
  findCriticalConditionInAST(node) {
  return flowFindCriticalCond(this, node);
  }

  // 计算表达式，将条件部分替换为指定的结果
  evaluateExpressionWithSubstitution(ast, conditionInfo, substitutionResult) {
  return flowEvalWithSub(this, ast, conditionInfo, substitutionResult);
  }

  // 在AST中替换指定节点
  substituteNodeInAST(ast, targetNode, substitutionResult) {
  return flowSubstituteNode(this, ast, targetNode, substitutionResult);
  }

  // 创建表示分布结果的节点
  createDistributionNode(distributionResult) {
  return flowCreateDistNode(this, distributionResult);
  }

  // 标准暴击计算（作为回退方案）
  calculateStandardCritical(ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
  return flowStandardCritical(this, ast, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate);
  }

  // 处理条件表达式的暴击
  handleConditionalCritical(normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate) {
  return flowHandleConditional(this, normalResult, criticalResult, normalProbability, criticalProbability, diceSides, criticalSides, originalCriticalRate);
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
  return critGetSidesFromAST(ast);
  }

  // 将暴击率转换为对应的骰面数量
  convertCriticalRateToSides(criticalRate, diceSides) {
  return critConvertRateToSides(criticalRate, diceSides);
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
  // 将骰子复用内部方法委托给逻辑模块的实现
  calculateDiceReuseFast(diceDistributions, ast, result) { return reuseCalcFast(this, diceDistributions, ast, result); }
  enumerateCombinationsFast() { return diceReuseInternals.enumerateCombinationsFast; }
  shouldIncludeCombinationForCritical(currentValues, ast) { return reuseShouldInclude(this, currentValues, ast); }
  getEffectiveCriticalDiceValues(currentValues, ast) { return reuseGetEff(this, currentValues, ast); }
  
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
