// Conditional 操作符：条件合并，支持暴击重叠路径委托给 calc 内部实现
import { normalizeToScale } from '../math/distribution.js';

// 通过传入 calc 实例复用其 evaluate / extractDistribution / nodeToString 等能力
export function calculateConditionalOperator(calc, conditionNode, trueValueNode, falseValueNode) {
  const conditionResult = calc.evaluate(conditionNode);
  if (conditionResult.type !== 'probability') {
    throw new Error('条件表达式的条件部分必须是比较操作（如 d20+6 >= 17）');
  }

  // 若开启暴击且条件中含有暴击检定骰，走内部专用路径（保持原行为）
  if (
    calc.criticalOptions &&
    calc.criticalOptions.criticalEnabled &&
    calc.containsCriticalDice(conditionNode)
  ) {
    return calc.calculateConditionalWithCriticalOverlap(
      conditionNode,
      trueValueNode,
      falseValueNode,
      conditionResult
    );
  }

  const trueValueResult = calc.evaluate(trueValueNode);
  const falseValueResult = calc.evaluate(falseValueNode);

  const result = {};

  // 获取真值与假值分布
  const trueDist = calc.extractDistribution(trueValueResult);
  const falseDist = calc.extractDistribution(falseValueResult);

  const trueTotal = Object.values(trueDist).reduce((s, c) => s + c, 0);
  const falseTotal = Object.values(falseDist).reduce((s, c) => s + c, 0);

  // 成功分支按相对概率加权
  for (const [value, count] of Object.entries(trueDist)) {
    const val = parseFloat(value);
    const rel = trueTotal > 0 ? count / trueTotal : 0;
    const weighted = rel * conditionResult.successProbability;
    result[val] = (result[val] || 0) + weighted;
  }

  // 失败分支按相对概率加权
  for (const [value, count] of Object.entries(falseDist)) {
    const val = parseFloat(value);
    const rel = falseTotal > 0 ? count / falseTotal : 0;
    const weighted = rel * conditionResult.failureProbability;
    result[val] = (result[val] || 0) + weighted;
  }

  // 标准化为整数计数（与原实现一致的缩放方案）
  const conditionTotalCount = conditionResult.totalCount;
  const maxBranchCount = Math.max(trueTotal, falseTotal);
  const normalizedResult = normalizeToScale(result, conditionTotalCount * maxBranchCount);

  // 嵌套条件收集（保持与原实现相同）
  const nestedConditions = [];
  const currentCondition = {
    condition: calc.nodeToString(conditionNode),
    successProbability: conditionResult.successProbability,
    failureProbability: conditionResult.failureProbability,
    level: 0,
  };
  nestedConditions.push(currentCondition);

  if (trueValueResult.nestedConditions) {
    trueValueResult.nestedConditions.forEach((cond) => {
      nestedConditions.push({
        ...cond,
        level: cond.level + 1,
        parentProbability: conditionResult.successProbability,
        conditionalProbability: cond.successProbability * conditionResult.successProbability,
        path: 'true',
      });
    });
  }

  if (falseValueResult.nestedConditions) {
    falseValueResult.nestedConditions.forEach((cond) => {
      nestedConditions.push({
        ...cond,
        level: cond.level + 1,
        parentProbability: conditionResult.failureProbability,
        conditionalProbability: cond.successProbability * conditionResult.failureProbability,
        path: 'false',
      });
    });
  }

  return {
    type: 'conditional',
    combined: normalizedResult,
    trueValues: trueDist,
    falseValues: falseDist,
    condition: {
      successProbability: conditionResult.successProbability,
      failureProbability: conditionResult.failureProbability,
    },
    nestedConditions,
  };
}
