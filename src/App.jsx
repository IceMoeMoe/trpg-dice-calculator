import { useState } from 'react'
import DiceCalculator from './lib/diceCalculator'
import FormulaInput from './components/FormulaInput'
import ResultDisplay from './components/ResultDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Dices, Calculator, Github } from 'lucide-react'
import './App.css'

function App() {
  const [result, setResult] = useState(null)
  const [currentFormula, setCurrentFormula] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  
  const calculator = new DiceCalculator()

  const handleCalculate = async (formula, criticalOptions = {}) => {
    setIsCalculating(true)
    setCurrentFormula(formula)
    
    // 添加一个小延迟来显示加载状态
    setTimeout(() => {
      const calculationResult = calculator.calculate(formula, criticalOptions)
      setResult(calculationResult)
      setIsCalculating(false)
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部 */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center relative">
            {/* GitHub 链接 */}
            <a 
              href="https://github.com/IceMoeMoe/trpg-dice-calculator" 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              title="查看 GitHub 仓库"
            >
              <Github className="w-6 h-6" />
            </a>
            <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold text-gray-800">
              <Dices className="w-8 h-8 text-blue-600" />
              TRPG掷骰计算器
              <Calculator className="w-8 h-8 text-indigo-600" />
            </CardTitle>
            <p className="text-gray-600 mt-2">
              支持复杂掷骰公式的精确计算，包括取最高/最低值、比较判别、条件表达式、复合运算等
            </p>
          </CardHeader>
        </Card>

        {/* 输入区域 */}
        <FormulaInput 
          onCalculate={handleCalculate} 
          isCalculating={isCalculating}
        />

        {/* 结果显示区域 */}
        <ResultDisplay 
          result={result} 
          formula={currentFormula}
        />

        {/* 示例和说明区域 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 示例公式 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Dices className="w-5 h-5 text-blue-600" />
                示例公式
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">基本掷骰</span>
                  <code className="text-blue-600 font-mono">2d6</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">单骰</span>
                  <code className="text-blue-600 font-mono">d20</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">取最高值</span>
                  <code className="text-blue-600 font-mono">kh(2d20)</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">取3个最高</span>
                  <code className="text-blue-600 font-mono">kh3(4d6)</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">比较判别</span>
                  <code className="text-blue-600 font-mono">d20&gt;15</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">复合计算</span>
                  <code className="text-blue-600 font-mono">2d6+3</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">复杂表达式</span>
                  <code className="text-blue-600 font-mono">2*(2d6)+kh(2d12)+4</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">火球术豁免计算</span>
                  <code className="text-blue-600 font-mono">(d20+6&gt;=17) ? (8d6/2) : 8d6</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">攻击命中计算</span>
                  <code className="text-blue-600 font-mono">(d20+8&gt;=15) ? 2d6+3 : 0</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">分段豁免</span>
                  <code className="text-blue-600 font-mono">kh(d20;d20)=20?0:kh(d_1;d_2)&gt;16?6d6/2:6d6</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded text-sm">
                  <span className="font-medium text-orange-700">暴击翻倍伤害</span>
                  <code className="text-orange-600 font-mono">#2d6+3#</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded text-sm">
                  <span className="font-medium text-orange-700">暴击切换骰子</span>
                  <code className="text-orange-600 font-mono">|1d8|1d10|+3</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded text-sm">
                  <span className="font-medium text-orange-700">暴击额外伤害</span>
                  <code className="text-orange-600 font-mono">2d6+[2d6]</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded text-sm">
                  <span className="font-medium text-orange-700">复合暴击攻击</span>
                  <code className="text-orange-600 font-mono">D20&gt;11?#|1d8|1d10|#+3:0</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded text-sm">
                  <span className="font-medium text-orange-700">暴击攻击比较</span>
                  <code className="text-orange-600 font-mono">(D20&gt;10?#1d8+[1d12]+5#:0)&gt;(D20&gt;10?#|1d8|1d10|+5#:0)</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded text-sm">
                  <span className="font-medium text-green-700">爆炸骰成功计数</span>
                  <code className="text-green-600 font-mono">5d10s8~10x9~10l10</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded text-sm">
                  <span className="font-medium text-green-700">简单爆炸骰</span>
                  <code className="text-green-600 font-mono">3d10e10l5</code>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded text-sm">
                  <span className="font-medium text-green-700">范围爆炸骰</span>
                  <code className="text-green-600 font-mono">2d10e9~10l3</code>
                </div>
                
              </div>
            </CardContent>
          </Card>

          {/* 语法说明 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="w-5 h-5 text-indigo-600" />
                语法说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">NdM</code>
                  <span>N个M面骰子，如 <code className="text-blue-600">2d6</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">D</code>
                  <span>大写D标识该骰用作暴击检定，如 <code className="text-blue-600">D20</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">kh(NdM)</code>
                  <span>取最高值，如 <code className="text-blue-600">kh(2d20),kh(1d8;1d10),kh(4d6r1~2e1)</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">kl(NdM)</code>
                  <span>取最低值，如 <code className="text-blue-600">kl(2d20)</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">khK(NdM)</code>
                  <span>取K个最高值，如 <code className="text-blue-600">kh3(4d6)</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">A &gt; B</code>
                  <span>比较判别，支持 &gt;, &lt;, &gt;=, &lt;=, =</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">条件 ? 真值 : 假值</code>
                  <span>条件表达式，用于豁免计算</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">表达式rX~YeZ</code>
                  <span>条件重骰表达式，用于在数值区间重骰，如<code className="text-blue-600">d4r1~2e1</code>，其中e后面的1为重骰限制次数</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">+, -, *, /</code>
                  <span>基本运算符和括号</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">d_n</code>
                  <span>引用从左到右第n组骰的骰值(例：8d6被视为一组)</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono whitespace-nowrap">表达式rX~YeZ</code>
                  <span>重骰掷骰中结果为X~Y的值，限制次数为Z，如 <code className="text-orange-600">4d6r1~2e1</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-orange-100 px-2 py-1 rounded text-orange-800 font-mono whitespace-nowrap">#表达式#</code>
                  <span>暴击时结果翻倍，如 <code className="text-orange-600">#2d6#</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-orange-100 px-2 py-1 rounded text-orange-800 font-mono whitespace-nowrap">|普通|暴击|</code>
                  <span>暴击时切换表达式，如 <code className="text-orange-600">|1d8|1d10|</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-orange-100 px-2 py-1 rounded text-orange-800 font-mono whitespace-nowrap">[表达式]</code>
                  <span>仅暴击时生效，如 <code className="text-orange-600">[1d6+3]</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-green-100 px-2 py-1 rounded text-green-800 font-mono whitespace-nowrap">NdMsX~YxZ~WlT</code>
                  <span>爆炸骰成功计数，如 <code className="text-green-600">5d10s8~10x9~10l10</code>。s=成功范围(8~10)，x=爆炸范围(9~10)，l=爆炸限制(10次)，返回成功次数</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-green-100 px-2 py-1 rounded text-green-800 font-mono whitespace-nowrap">NdMeX~YlZ</code>
                  <span>总和型爆炸骰，如 <code className="text-green-600">3d10e9~10l5</code>。e=爆炸范围(9~10)，l=爆炸限制(5次)，返回总和</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 页脚 */}
        <Card className="bg-white/60 backdrop-blur-sm border-0">
          <CardContent className="text-center py-4">
            <p className="text-sm text-gray-600">
              使用打表遍历算法确保计算结果的精确性 | 支持任意面数骰子
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
