import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { TrendingUp, Target, AlertCircle } from 'lucide-react';
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
  
  // 找到最可能的结果
  const mostLikelyValue = Object.entries(distribution)
    .reduce((max, [value, count]) => 
      count > max.count ? { value: parseInt(value), count } : max, 
      { value: 0, count: 0 }
    );

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
              <div>
                <p className="text-sm text-gray-600">最可能结果</p>
                <p className="text-lg font-semibold">{mostLikelyValue.value}</p>
                <p className="text-xs text-gray-500">
                  {((mostLikelyValue.count / totalOutcomes) * 100).toFixed(1)}%
                </p>
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
          />
        </CardContent>
      </Card>

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

