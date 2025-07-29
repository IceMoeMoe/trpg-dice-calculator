import { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Calculator, Dices, Zap } from 'lucide-react';

const FormulaInput = ({ onCalculate, isCalculating }) => {
  const [formula, setFormula] = useState('');
  const [criticalEnabled, setCriticalEnabled] = useState(false);
  const [criticalRate, setCriticalRate] = useState(5);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (formula.trim()) {
      // 在计算时自动调整暴击率
      let finalCriticalRate = criticalRate;
      if (criticalEnabled && criticalRate > 0) {
        const criticalDiceSides = getCriticalDiceFromFormula(formula);
        finalCriticalRate = adjustCriticalRateForDice(criticalRate, criticalDiceSides);
      }
      
      onCalculate(formula.trim(), {
        criticalEnabled,
        criticalRate: criticalEnabled ? finalCriticalRate : 0
      });
    }
  };

  // 获取条件表达式中的暴击判定骰子
  const getCriticalDiceFromFormula = (formula) => {
    // 首先尝试匹配条件表达式模式: 条件?真值:假值
    const conditionalMatch = formula.match(/^([^?]+)\?([^:]+):(.+)$/);
    if (conditionalMatch) {
      const conditionPart = conditionalMatch[1].trim();
      // 在条件部分查找骰子
      const diceMatch = conditionPart.match(/(\d*)d(\d+)/);
      if (diceMatch) {
        return parseInt(diceMatch[2]);
      }
    }
    
    // 如果没有条件表达式，查找简单的比较表达式中的骰子
    // 例如: d20>15, 2d6>=8 等
    const comparisonMatch = formula.match(/(\d*)d(\d+)\s*[><=!]+/);
    if (comparisonMatch) {
      return parseInt(comparisonMatch[2]);
    }
    
    // 如果都没有找到，则查找第一个出现的骰子
    const firstDiceMatch = formula.match(/(\d*)d(\d+)/);
    if (firstDiceMatch) {
      return parseInt(firstDiceMatch[2]);
    }
    
    // 默认返回d20（最常见的TRPG系统）
    return 20;
  };

  // 根据暴击判定骰子自动修正暴击率
  const adjustCriticalRateForDice = (inputRate, criticalDiceSides) => {
    // 计算每面的概率百分比
    const probabilityPerSide = 100 / criticalDiceSides;
    
    // 将输入的暴击率转换为最接近的整数倍面数
    const targetSides = Math.round(inputRate / probabilityPerSide);
    const adjustedRate = targetSides * probabilityPerSide;
    
    // 确保调整后的暴击率在合理范围内
    if (adjustedRate > 100) return 100;
    if (adjustedRate < 0) return 0;
    
    return adjustedRate;
  };

  const handleCriticalRateChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setCriticalRate(value);
    }
  };

  // 为暴击率提供友好建议
  const getCriticalRateSuggestion = (formula, criticalRate) => {
    if (!criticalEnabled || criticalRate === 0) return { suggestion: null };
    
    // 获取暴击判定骰子
    const criticalDiceSides = getCriticalDiceFromFormula(formula);
    const probabilityPerSide = 100 / criticalDiceSides;
    
    // 检查当前暴击率是否为骰子面数的整数倍
    const isExactMultiple = Math.abs(criticalRate % probabilityPerSide) < 0.01;
    const sidesForCritical = Math.round(criticalRate / probabilityPerSide);
    
    if (isExactMultiple && sidesForCritical > 0) {
      if (criticalDiceSides === 20 && criticalRate === 5) {
        return { suggestion: 'info', message: 'D20系统的标准暴击率，相当于出20时暴击' };
      } else if (criticalDiceSides === 20 && criticalRate === 10) {
        return { suggestion: 'info', message: '扩展暴击范围，相当于出19-20时暴击' };
      } else if (sidesForCritical === 1) {
        return { suggestion: 'info', message: `D${criticalDiceSides}系统，相当于出${criticalDiceSides}时暴击` };
      } else {
        const criticalRange = criticalDiceSides - sidesForCritical + 1;
        return { suggestion: 'info', message: `D${criticalDiceSides}系统，相当于出${criticalRange}-${criticalDiceSides}时暴击` };
      }
    }
    
    // 检查是否为常见的TRPG暴击率（适用于任何骰子）
    const commonRates = [5, 10, 15, 20, 25];
    if (commonRates.includes(criticalRate)) {
      return { suggestion: null }; // 常见暴击率，不需要建议
    }
    
    // 对于小面数骰子，如果设置了很高的暴击率，给出提示
    if (criticalDiceSides <= 6 && criticalRate > 50) {
      return { 
        suggestion: 'warning', 
        message: `${criticalRate}%的暴击率对于d${criticalDiceSides}来说过高，建议设置为${probabilityPerSide.toFixed(1)}%的整数倍` 
      };
    }
    
    // 如果不是整数倍，提供调整建议
    if (!isExactMultiple) {
      const nearestLower = Math.floor(criticalRate / probabilityPerSide) * probabilityPerSide;
      const nearestHigher = Math.ceil(criticalRate / probabilityPerSide) * probabilityPerSide;
      const suggestions = [nearestLower, nearestHigher].filter(rate => rate >= 0 && rate <= 100);
      
      if (suggestions.length > 0) {
        return {
          suggestion: 'info',
          message: `建议调整为${suggestions.map(s => s.toFixed(1)).join('%或')}%以对应D${criticalDiceSides}的整数面数`
        };
      }
    }
    
    return { suggestion: null };
  };

  const criticalSuggestion = getCriticalRateSuggestion(formula, criticalRate);

  return (
    <Card className="w-full bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dices className="w-5 h-5 text-blue-600" />
          掷骰公式输入
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 暴击设置区域 */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <Label htmlFor="critical-toggle" className="text-sm font-medium text-orange-800">
                启用暴击系统
              </Label>
            </div>
            <div className="flex items-center gap-4">
              {criticalEnabled && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="critical-rate" className="text-sm text-orange-700">
                    暴击率:
                  </Label>
                  <Input
                    id="critical-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={criticalRate}
                    onChange={handleCriticalRateChange}
                    className="w-20 h-8 text-center"
                    disabled={isCalculating}
                  />
                  <span className="text-sm text-orange-700">%</span>
                </div>
              )}
              <Switch
                id="critical-toggle"
                checked={criticalEnabled}
                onCheckedChange={setCriticalEnabled}
                disabled={isCalculating}
              />
            </div>
          </div>
          
          {/* 公式输入区域 */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder={criticalEnabled ? 
                "输入掷骰公式，支持暴击: #2d6#, |1d8|1d10|, [1d6+3]" : 
                "输入掷骰公式，例如: 2d6, kh(2d20), kl(1d8;1d10), kl(4d6r1~2e1)"
              }
              className="flex-1 h-12 text-base"
              disabled={isCalculating}
            />
            <Button 
              type="submit" 
              disabled={!formula.trim() || isCalculating}
              className="flex items-center gap-2 h-12 px-6"
              size="lg"
            >
              <Calculator className="w-4 h-4" />
              {isCalculating ? '计算中...' : '计算'}
            </Button>
          </form>
          
          {/* 暴击语法提示 */}
          {criticalEnabled && (
            <div className="space-y-2">
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-xs text-orange-800 space-y-1">
                  <div><strong>暴击语法：</strong></div>
                  <div><code className="bg-orange-100 px-1 rounded">#表达式#</code> - 暴击时结果翻倍</div>
                  <div><code className="bg-orange-100 px-1 rounded">|普通|暴击|</code> - 暴击时切换表达式</div>
                  <div><code className="bg-orange-100 px-1 rounded">[表达式]</code> - 仅暴击时生效</div>
                </div>
              </div>
              
              {/* 暴击率建议提示 */}
              {criticalSuggestion.suggestion === 'info' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-800">
                    <strong>提示：</strong> {criticalSuggestion.message}
                  </div>
                </div>
              )}
              
              {criticalSuggestion.suggestion === 'warning' && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-xs text-yellow-800">
                    <strong>建议：</strong> {criticalSuggestion.message}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FormulaInput;

