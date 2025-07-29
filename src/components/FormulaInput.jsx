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
      onCalculate(formula.trim(), {
        criticalEnabled,
        criticalRate: criticalEnabled ? criticalRate : 0
      });
    }
  };

  const handleCriticalRateChange = (e) => {
    const value = parseInt(e.target.value);
    if (value >= 0 && value <= 100) {
      setCriticalRate(value);
    }
  };

  // 验证暴击率是否合理
  const validateCriticalRate = (formula, criticalRate) => {
    if (!criticalEnabled || criticalRate === 0) return { valid: true };
    
    // 检查公式中是否包含骰子
    const diceMatch = formula.match(/(\d*)d(\d+)/g);
    if (!diceMatch) return { valid: true, warning: '公式中没有找到骰子' };
    
    // 获取所有骰子面数
    const diceSides = diceMatch.map(dice => {
      const match = dice.match(/(\d*)d(\d+)/);
      return parseInt(match[2]);
    });
    
    // 检查最常见的骰子面数
    const commonDice = diceSides.find(sides => [4, 6, 8, 10, 12, 20].includes(sides));
    if (commonDice) {
      const stepSize = 100 / commonDice; // 每个面对应的百分比
      const remainder = criticalRate % stepSize;
      
      if (remainder !== 0) {
        const suggestedRate = Math.round(criticalRate / stepSize) * stepSize;
        return {
          valid: false,
          error: `${commonDice}面骰的暴击率应为${stepSize.toFixed(1)}%的倍数，建议使用${suggestedRate}%`
        };
      }
    }
    
    return { valid: true };
  };

  const criticalValidation = validateCriticalRate(formula, criticalRate);

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
                    value={criticalRate}
                    onChange={handleCriticalRateChange}
                    className="w-16 h-8 text-center"
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
                "输入掷骰公式，例如: 2d6, kh(2d20), d20>2d10"
              }
              className="flex-1 h-12 text-base"
              disabled={isCalculating}
            />
            <Button 
              type="submit" 
              disabled={!formula.trim() || isCalculating || (criticalEnabled && !criticalValidation.valid)}
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
              
              {/* 暴击率验证提示 */}
              {!criticalValidation.valid && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-xs text-red-800">
                    <strong>暴击率设置问题：</strong> {criticalValidation.error}
                  </div>
                </div>
              )}
              
              {criticalValidation.valid && criticalValidation.warning && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-xs text-yellow-800">
                    <strong>提示：</strong> {criticalValidation.warning}
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

