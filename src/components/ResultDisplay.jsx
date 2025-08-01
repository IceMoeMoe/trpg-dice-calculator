import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { TrendingUp, Target, AlertCircle, Zap } from 'lucide-react';
import DiceChart from './DiceChart';

const ResultDisplay = ({ result, formula }) => {
  if (!result) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-gray-500">输入公式并点击计算以查看结果</p>
        </CardContent>
      </Card>
    );
  }

  if (!result.success) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            计算错误
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{result.error}</p>
          <p className="text-sm text-gray-600 mt-2">
            请检查公式语法是否正确
          </p>
        </CardContent>
      </Card>
    );
  }

  const { distribution, average, totalOutcomes } = result;
  
  // 计算一些统计信息
  const values = Object.keys(distribution).map(parseFloat).sort((a, b) => a - b);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // 找到最可能的结果（支持多个相同概率的结果）
  const maxCount = Math.max(...Object.values(distribution));
  const mostLikelyValues = Object.entries(distribution)
    .filter(([value, count]) => count === maxCount)
    .map(([value, count]) => ({ 
      value: parseFloat(value), 
      displayValue: parseFloat(value) % 1 === 0 ? parseFloat(value).toString() : parseFloat(value).toFixed(2),
      count 
    }))
    .sort((a, b) => a.value - b.value); // 按值排序

  // 找到第二高概率的结果
  const sortedCounts = [...new Set(Object.values(distribution))].sort((a, b) => b - a);
  const secondMaxCount = sortedCounts.length > 1 ? sortedCounts[1] : 0;
  
  let secondMostLikelyValues = [];
  let shouldShowSecondMostLikely = false;
  
  if (secondMaxCount > 0) {
    // 计算最高概率和第二高概率
    const maxProbability = (maxCount / totalOutcomes) * 100;
    const secondMaxProbability = (secondMaxCount / totalOutcomes) * 100;
    
    // 如果最高概率显著高于第二高概率（增长超过100%），则显示第二高概率结果
    const probabilityIncrease = ((maxProbability - secondMaxProbability) / secondMaxProbability) * 100;
    shouldShowSecondMostLikely = probabilityIncrease >= 100;
    
    if (shouldShowSecondMostLikely) {
      secondMostLikelyValues = Object.entries(distribution)
        .filter(([value, count]) => count === secondMaxCount)
        .map(([value, count]) => ({ 
          value: parseFloat(value), 
          displayValue: parseFloat(value) % 1 === 0 ? parseFloat(value).toString() : parseFloat(value).toFixed(2),
          count 
        }))
        .sort((a, b) => a.value - b.value);
    }
  }

  return (
    <div className="space-y-4">
      {/* 统计信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">平均值</p>
                <p className="text-lg font-semibold">{average.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              <div className="w-full">
                <p className="text-sm text-gray-600">最可能结果</p>
                <div className="text-lg font-semibold">
                  {mostLikelyValues.length === 1 ? (
                    <span>{mostLikelyValues[0].displayValue}</span>
                  ) : (
                    <span>{mostLikelyValues.map(v => v.displayValue).join(', ')}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {((maxCount / totalOutcomes) * 100).toFixed(1)}%
                  {mostLikelyValues.length > 1 && ` (共${mostLikelyValues.length}个)`}
                </p>
                
                {/* 如果最可能结果的概率显著高于第二可能结果，显示第二可能结果 */}
                {shouldShowSecondMostLikely && secondMostLikelyValues.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">第二可能结果</p>
                    <div className="text-base font-medium text-gray-700">
                      {secondMostLikelyValues.length === 1 ? (
                        <span>{secondMostLikelyValues[0].displayValue}</span>
                      ) : (
                        <span>{secondMostLikelyValues.map(v => v.displayValue).join(', ')}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {((secondMostLikelyValues[0].count / totalOutcomes) * 100).toFixed(1)}%
                      {secondMostLikelyValues.length > 1 && ` (共${secondMostLikelyValues.length}个)`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">范围</p>
              <p className="text-lg font-semibold">
                {minValue % 1 === 0 ? minValue.toString() : minValue.toFixed(2)} - {maxValue % 1 === 0 ? maxValue.toString() : maxValue.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">总可能性</p>
              <p className="text-lg font-semibold">{totalOutcomes.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要结果卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>掷骰结果分布</span>
            <Badge variant="outline" className="font-mono">
              {formula}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DiceChart 
            distribution={distribution} 
            totalOutcomes={totalOutcomes}
            isConditional={result.isConditional}
            trueValues={result.trueValues}
            falseValues={result.falseValues}
            condition={result.condition}
            isCritical={result.isCritical}
            normalDistribution={result.normalDistribution || result.normalResult}
            criticalDistribution={result.criticalDistribution || result.criticalResult}
            normalProbability={result.normalProbability}
            criticalProbability={result.criticalProbability}
            isConditionalCritical={result.isConditionalCritical}
            normalHitValues={result.normalHitValues}
            criticalHitValues={result.criticalHitValues}
            missValues={result.missValues}
            probabilities={result.probabilities}
          />
        </CardContent>
      </Card>

      {/* 暴击信息卡片 - 只在暴击模式时显示 */}
      {(result.isCritical || (result.hasDiceReuse && result.criticalProbability)) && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Zap className="w-5 h-5" />
              暴击系统信息
              {result.hasDiceReuse && (
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  骰子引用
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">暴击率</p>
                <p className="text-2xl font-bold text-orange-600">
                  {result.criticalRate}%
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">普通概率</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(result.normalProbability * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">暴击概率</p>
                <p className="text-2xl font-bold text-red-600">
                  {(result.criticalProbability * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                • <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
                蓝色表示普通情况的结果分布
              </p>
              <p>
                • <span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>
                红色表示暴击情况的结果分布
              </p>
              <p>
                • <span className="inline-block w-3 h-3 bg-purple-500 rounded mr-2"></span>
                紫色表示合并后的最终结果分布
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 条件暴击信息卡片 - 只在条件暴击判断时显示 */}
      {result.isConditionalCritical && result.probabilities && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <Target className="w-5 h-5" />
              <Zap className="w-5 h-5" />
              条件暴击信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">普通命中</p>
                <p className="text-2xl font-bold text-blue-600">
                  {((result.probabilities.normalHit || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">暴击命中</p>
                <p className="text-2xl font-bold text-red-600">
                  {((result.probabilities.criticalHit || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">失败</p>
                <p className="text-2xl font-bold text-gray-600">
                  {((result.probabilities.miss || 0) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
            
            {/* 如果有嵌套条件，显示详细的条件层次结构 */}
            {result.nestedConditions && result.nestedConditions.length > 0 ? (
              <div className="space-y-4 mt-6">
                <div className="text-sm text-gray-600 mb-3">
                  <p className="font-medium">条件层次结构：</p>
                </div>
                {result.nestedConditions.map((cond, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border-l-4 ${
                      cond.level === 0 
                        ? 'border-purple-500 bg-purple-50' 
                        : cond.level === 1 
                          ? 'border-blue-500 bg-blue-50 ml-4' 
                          : 'border-green-500 bg-green-50 ml-8'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-mono text-sm text-gray-800 mb-2">
                          {cond.level > 0 && (
                            <span className="text-gray-500">
                              {'└ '.repeat(cond.level)}
                            </span>
                          )}
                          {cond.condition}
                        </p>
                        {cond.isCriticalCondition && cond.level === 0 ? (
                          // 暴击条件的特殊显示
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-600">普通命中</p>
                              <p className="text-lg font-bold text-blue-600">
                                {(cond.normalHitProbability * 100).toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-600">暴击命中</p>
                              <p className="text-lg font-bold text-red-600">
                                {(cond.criticalHitProbability * 100).toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-600">失败</p>
                              <p className="text-lg font-bold text-gray-600">
                                {(cond.failureProbability * 100).toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        ) : (
                          // 普通条件显示
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-600">条件为真</p>
                              <p className={`text-lg font-bold ${
                                cond.level === 0 
                                  ? 'text-purple-600' 
                                  : cond.level === 1 
                                    ? 'text-blue-600' 
                                    : 'text-green-600'
                              }`}>
                                {(cond.successProbability * 100).toFixed(2)}%
                              </p>
                              {cond.conditionalProbability && (
                                <p className="text-xs text-gray-500">
                                  绝对概率: {(cond.conditionalProbability * 100).toFixed(2)}%
                                </p>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-600">条件为假</p>
                              <p className="text-lg font-bold text-gray-600">
                                {(cond.failureProbability * 100).toFixed(2)}%
                              </p>
                              {cond.conditionalProbability && (
                                <p className="text-xs text-gray-500">
                                  绝对概率: {((1 - cond.successProbability) * cond.parentProbability * 100).toFixed(2)}%
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {cond.level > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            <p>
                              在{
                                cond.path === 'normal_hit' ? '普通命中' : 
                                cond.path === 'critical_hit' ? '暴击命中' :
                                cond.path === 'miss' ? '失败' :
                                cond.path === 'true' ? '上级条件为真' : '上级条件为假'
                              }的情况下触发
                              (上级概率: {(cond.parentProbability * 100).toFixed(2)}%)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 text-sm text-gray-600">
                  <p className="font-medium mb-2">说明：</p>
                  <p>
                    • <span className="inline-block w-3 h-3 bg-purple-500 rounded mr-2"></span>
                    紫色：主条件（第一层）
                  </p>
                  <p>
                    • <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
                    蓝色：嵌套条件（第二层）
                  </p>
                  <p>
                    • <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>
                    绿色：深层嵌套条件（第三层及以上）
                  </p>
                  <p className="mt-2 text-xs">
                    * 绝对概率 = 条件概率 × 所有上级条件的概率
                  </p>
                </div>
              </div>
            ) : (
              // 原有的简单显示
              <div className="text-sm text-gray-600">
                <p>
                  • <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
                  蓝色表示普通命中的结果分布
                </p>
                <p>
                  • <span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>
                  红色表示暴击命中的结果分布
                </p>
                <p>
                  • <span className="inline-block w-3 h-3 bg-gray-500 rounded mr-2"></span>
                  灰色表示失败的结果分布
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 条件信息卡片 - 只在条件判断时显示 */}
      {result.isConditional && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <Target className="w-5 h-5" />
              条件判断信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 如果有嵌套条件，显示详细的条件层次结构 */}
            {result.nestedConditions && result.nestedConditions.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-3">
                  <p className="font-medium">条件层次结构：</p>
                </div>
                {result.nestedConditions.map((cond, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border-l-4 ${
                      cond.level === 0 
                        ? 'border-purple-500 bg-purple-50' 
                        : cond.level === 1 
                          ? 'border-blue-500 bg-blue-50 ml-4' 
                          : 'border-green-500 bg-green-50 ml-8'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-mono text-sm text-gray-800 mb-2">
                          {cond.level > 0 && (
                            <span className="text-gray-500">
                              {'└ '.repeat(cond.level)}
                            </span>
                          )}
                          {cond.condition}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center">
                            <p className="text-xs text-gray-600">条件为真</p>
                            <p className={`text-lg font-bold ${
                              cond.level === 0 
                                ? 'text-purple-600' 
                                : cond.level === 1 
                                  ? 'text-blue-600' 
                                  : 'text-green-600'
                            }`}>
                              {(cond.successProbability * 100).toFixed(2)}%
                            </p>
                            {cond.conditionalProbability && (
                              <p className="text-xs text-gray-500">
                                绝对概率: {(cond.conditionalProbability * 100).toFixed(2)}%
                              </p>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">条件为假</p>
                            <p className="text-lg font-bold text-gray-600">
                              {(cond.failureProbability * 100).toFixed(2)}%
                            </p>
                            {cond.conditionalProbability && (
                              <p className="text-xs text-gray-500">
                                绝对概率: {((1 - cond.successProbability) * cond.parentProbability * 100).toFixed(2)}%
                              </p>
                            )}
                          </div>
                        </div>
                        {cond.level > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            <p>
                              在{cond.path === 'true' ? '上级条件为真' : '上级条件为假'}的情况下触发
                              (上级概率: {(cond.parentProbability * 100).toFixed(2)}%)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 text-sm text-gray-600">
                  <p className="font-medium mb-2">说明：</p>
                  <p>
                    • <span className="inline-block w-3 h-3 bg-purple-500 rounded mr-2"></span>
                    紫色：主条件（第一层）
                  </p>
                  <p>
                    • <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
                    蓝色：嵌套条件（第二层）
                  </p>
                  <p>
                    • <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>
                    绿色：深层嵌套条件（第三层及以上）
                  </p>
                  <p className="mt-2 text-xs">
                    * 绝对概率 = 条件概率 × 所有上级条件的概率
                  </p>
                </div>
              </div>
            ) : (
              // 原有的简单条件显示
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">条件为真概率</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(result.condition.successProbability * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">条件为假概率</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {(result.condition.failureProbability * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    • <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
                    深蓝色表示条件为真时的结果分布
                  </p>
                  <p>
                    • <span className="inline-block w-3 h-3 bg-blue-500 opacity-50 rounded mr-2"></span>
                    浅蓝色表示条件为假时的结果分布
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 详细概率表格 */}
      <Card>
        <CardHeader>
          <CardTitle>详细概率分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b">
                <tr>
                  <th className="text-left p-2">结果</th>
                  <th className="text-right p-2">次数</th>
                  <th className="text-right p-2">概率</th>
                  <th className="text-left p-2">概率条</th>
                </tr>
              </thead>
              <tbody>
                {values.map(value => {
                  const count = distribution[value];
                  const probability = (count / totalOutcomes) * 100;
                  const barWidth = (probability / Math.max(...Object.values(distribution).map(c => (c / totalOutcomes) * 100))) * 100;
                  const displayValue = value % 1 === 0 ? value.toString() : value.toFixed(2);
                  
                  return (
                    <tr key={value} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono">{displayValue}</td>
                      <td className="p-2 text-right">{count.toLocaleString()}</td>
                      <td className="p-2 text-right">{probability.toFixed(2)}%</td>
                      <td className="p-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultDisplay;

