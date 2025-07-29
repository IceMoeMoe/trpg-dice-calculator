import { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Calculator, Dices } from 'lucide-react';

const FormulaInput = ({ onCalculate, isCalculating }) => {
  const [formula, setFormula] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (formula.trim()) {
      onCalculate(formula.trim());
    }
  };

  return (
    <Card className="w-full bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dices className="w-5 h-5 text-blue-600" />
          掷骰公式输入
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="输入掷骰公式，例如: 2d6, kh(2d20), d20>2d10"
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
      </CardContent>
    </Card>
  );
};

export default FormulaInput;

