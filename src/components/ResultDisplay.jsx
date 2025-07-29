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
  const values = Object.keys(distribution).map(Number).sort((a, b) => a - b);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // 找到最可能的结果（支持多个相同概率的结果）
  const maxCount = Math.max(...Object.values(distribution));
  const mostLikelyValues = Object.entries(distribution)
    .filter(([value, count]) => count === maxCount)
    .map(([value, count]) => ({ value: parseInt(value), count }))
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
        .map(([value, count]) => ({ value: parseInt(value), count }))
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
                    <span>{mostLikelyValues[0].value}</span>
                  ) : (
                    <span>{mostLikelyValues.map(v => v.value).join(', ')}</span>
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
                        <span>{secondMostLikelyValues[0].value}</span>
                      ) : (
                        <span>{secondMostLikelyValues.map(v => v.value).join(', ')}</span>
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
              <p className="text-lg font-semibold">{minValue} - {maxValue}</p>
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
            normalDistribution={result.normalDistribution}
            criticalDistribution={result.criticalDistribution}
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
      {result.isCritical && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Zap className="w-5 h-5" />
              暴击系统信息
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
      {result.isConditionalCritical && (
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
                  {(result.probabilities.normalHit * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">暴击命中</p>
                <p className="text-2xl font-bold text-red-600">
                  {(result.probabilities.criticalHit * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">失败</p>
                <p className="text-2xl font-bold text-gray-600">
                  {(result.probabilities.miss * 100).toFixed(2)}%
                </p>
              </div>
            </div>
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
                  
                  return (
                    <tr key={value} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono">{value}</td>
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

