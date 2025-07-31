import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DiceChart = ({ distribution, totalOutcomes, isConditional, trueValues, falseValues, condition, isCritical, normalDistribution, criticalDistribution, normalProbability, criticalProbability, isConditionalCritical, normalHitValues, criticalHitValues, missValues, probabilities }) => {
  // 如果是条件暴击表达式，处理分离的数据
  if (isConditionalCritical && normalHitValues && criticalHitValues && missValues && probabilities) {
    // 获取所有可能的结果值
    const allValues = new Set([
      ...Object.keys(normalHitValues).map(v => parseFloat(v)),
      ...Object.keys(criticalHitValues).map(v => parseFloat(v)),
      ...Object.keys(missValues).map(v => parseFloat(v))
    ]);
    
    // 只对非零值创建连续范围，零值单独处理
    const nonZeroValues = Array.from(allValues).filter(v => v !== 0);
    const zeroExists = allValues.has(0);
    
    let continuousValues = [];
    
    if (nonZeroValues.length > 0) {
      const minValue = Math.min(...nonZeroValues);
      const maxValue = Math.max(...nonZeroValues);
      for (let i = minValue; i <= maxValue; i++) {
        continuousValues.push(i);
      }
    }
    
    // 如果存在零值，将其添加到开头
    if (zeroExists) {
      continuousValues = [0, ...continuousValues];
    }
    
    // 计算正确的概率分布
    const normalHitTotalCount = Object.values(normalHitValues).reduce((sum, count) => sum + count, 0);
    const criticalHitTotalCount = Object.values(criticalHitValues).reduce((sum, count) => sum + count, 0);
    const missTotalCount = Object.values(missValues).reduce((sum, count) => sum + count, 0);
    
    const chartData = continuousValues
      .map(value => {
        const normalHitValueCount = normalHitValues[value] || 0;
        const criticalHitValueCount = criticalHitValues[value] || 0;
        const missValueCount = missValues[value] || 0;
        
        const normalHitProb = (normalHitValueCount / normalHitTotalCount) * probabilities.normalHit;
        const criticalHitProb = (criticalHitValueCount / criticalHitTotalCount) * probabilities.criticalHit;
        const missProb = (missValueCount / missTotalCount) * probabilities.miss;
        const totalProb = normalHitProb + criticalHitProb + missProb;
        
        return {
          value: value,
          count: totalProb * 100, // 缩放到百分比显示
          normalHitCount: normalHitProb * 100,
          criticalHitCount: criticalHitProb * 100,
          missCount: missProb * 100,
          normalHitProbability: (normalHitProb * 100).toFixed(2),
          criticalHitProbability: (criticalHitProb * 100).toFixed(2),
          missProbability: (missProb * 100).toFixed(2),
          totalProbability: (totalProb * 100).toFixed(2)
        };
      });

    // 条件暴击表达式的自定义Tooltip
    const ConditionalCriticalTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        const totalProbability = parseFloat(data.totalProbability);
        
        return (
          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
            <p className="font-semibold">{`结果: ${label}`}</p>
            <p className="text-green-600 font-semibold">{`总概率: ${totalProbability.toFixed(2)}%`}</p>
            {parseFloat(data.normalHitProbability) > 0 && (
              <p className="text-blue-600">{`普通命中: ${data.normalHitProbability}%`}</p>
            )}
            {parseFloat(data.criticalHitProbability) > 0 && (
              <p className="text-red-600">{`暴击命中: ${data.criticalHitProbability}%`}</p>
            )}
            {parseFloat(data.missProbability) > 0 && (
              <p className="text-gray-600">{`失败: ${data.missProbability}%`}</p>
            )}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="value" 
              type="category"
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: '概率 (%)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip content={<ConditionalCriticalTooltip />} />
            <Legend />
            <Bar 
              dataKey="normalHitCount" 
              stackId="a"
              fill="#3b82f6" 
              name="普通命中"
              radius={[0, 0, 0, 0]}
              stroke="#1e40af"
              strokeWidth={1}
            />
            <Bar 
              dataKey="criticalHitCount" 
              stackId="a"
              fill="#ef4444" 
              name="暴击命中"
              radius={[0, 0, 0, 0]}
              stroke="#dc2626"
              strokeWidth={1}
            />
            <Bar 
              dataKey="missCount" 
              stackId="a"
              fill="#6b7280" 
              name="失败"
              radius={[2, 2, 0, 0]}
              stroke="#4b5563"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  // 如果是暴击表达式，处理分离的数据
  if (isCritical && normalDistribution && criticalDistribution) {
    // 获取所有可能的结果值
    const allValues = new Set([
      ...Object.keys(normalDistribution).map(v => parseFloat(v)),
      ...Object.keys(criticalDistribution).map(v => parseFloat(v))
    ]);
    
    // 只对非零值创建连续范围，零值单独处理
    const nonZeroValues = Array.from(allValues).filter(v => v !== 0);
    const zeroExists = allValues.has(0);
    
    let continuousValues = [];
    
    if (nonZeroValues.length > 0) {
      const minValue = Math.min(...nonZeroValues);
      const maxValue = Math.max(...nonZeroValues);
      for (let i = minValue; i <= maxValue; i++) {
        continuousValues.push(i);
      }
    }
    
    // 如果存在零值，将其添加到开头
    if (zeroExists) {
      continuousValues = [0, ...continuousValues];
    }
    
    // 计算总的普通和暴击出现次数
    const normalTotalCount = Object.values(normalDistribution).reduce((sum, count) => sum + count, 0);
    const criticalTotalCount = Object.values(criticalDistribution).reduce((sum, count) => sum + count, 0);
    
    // 计算正确的总概率分布
    const totalPossible = normalTotalCount + criticalTotalCount;
    const chartData = continuousValues
      .map(value => {
        const normalValueCount = normalDistribution[value] || 0;
        const criticalValueCount = criticalDistribution[value] || 0;
        const totalValueCount = (normalValueCount * normalProbability) + (criticalValueCount * criticalProbability);
        
        return {
          value: value,
          count: totalValueCount,
          normalCount: normalValueCount * normalProbability,
          criticalCount: criticalValueCount * criticalProbability,
          normalProbability: ((normalValueCount / normalTotalCount) * normalProbability * 100).toFixed(2),
          criticalProbabilityValue: ((criticalValueCount / criticalTotalCount) * criticalProbability * 100).toFixed(2),
          totalProbability: ((totalValueCount / (normalTotalCount * normalProbability + criticalTotalCount * criticalProbability)) * 100).toFixed(2)
        };
      });

    // 暴击表达式的自定义Tooltip
    const CriticalTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const normalData = payload.find(p => p.dataKey === 'normalCount');
        const criticalData = payload.find(p => p.dataKey === 'criticalCount');
        
        return (
          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
            <p className="font-semibold">{`结果: ${label}`}</p>
            {normalData && normalData.value > 0 && (
              <>
                <p className="text-blue-600">{`普通概率: ${normalData.value.toFixed(2)}%`}</p>
              </>
            )}
            {criticalData && criticalData.value > 0 && (
              <>
                <p className="text-red-600">{`暴击概率: ${criticalData.value.toFixed(2)}%`}</p>
              </>
            )}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="value" 
              type="category"
              interval={0}
            />
            <YAxis 
              label={{ value: '概率 (%)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip content={<CriticalTooltip />} />
            <Legend />
            <Bar 
              dataKey="normalCount" 
              fill="#3b82f6" 
              name="普通情况"
              radius={[2, 2, 0, 0]}
              stroke="#1e40af"
              strokeWidth={1}
            />
            <Bar 
              dataKey="criticalCount" 
              fill="#ef4444" 
              name="暴击情况"
              radius={[2, 2, 0, 0]}
              stroke="#dc2626"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  // 如果是条件表达式，处理分离的数据
  if (isConditional && trueValues && falseValues && condition) {
    // 获取所有可能的结果值
    const allValues = new Set([
      ...Object.keys(trueValues).map(v => parseInt(v)),
      ...Object.keys(falseValues).map(v => parseInt(v))
    ]);
    
    // 只对非零值创建连续范围，零值单独处理
    const nonZeroValues = Array.from(allValues).filter(v => v !== 0);
    const zeroExists = allValues.has(0);
    
    let continuousValues = [];
    
    if (nonZeroValues.length > 0) {
      const minValue = Math.min(...nonZeroValues);
      const maxValue = Math.max(...nonZeroValues);
      for (let i = minValue; i <= maxValue; i++) {
        continuousValues.push(i);
      }
    }
    
    // 如果存在零值，将其添加到开头
    if (zeroExists) {
      continuousValues = [0, ...continuousValues];
    }
    
    // 计算正确的概率分布
    const trueTotalCount = Object.values(trueValues).reduce((sum, count) => sum + count, 0);
    const falseTotalCount = Object.values(falseValues).reduce((sum, count) => sum + count, 0);
    
    const chartData = continuousValues
      .map(value => {
        const trueValueCount = trueValues[value] || 0;
        const falseValueCount = falseValues[value] || 0;
        const totalValueCount = (trueValueCount * condition.successProbability) + (falseValueCount * condition.failureProbability);
        
        return {
          value: value,
          count: totalValueCount,
          trueCount: trueValueCount * condition.successProbability,
          falseCount: falseValueCount * condition.failureProbability,
          trueProbability: ((trueValueCount / trueTotalCount) * condition.successProbability * 100).toFixed(2),
          falseProbability: ((falseValueCount / falseTotalCount) * condition.failureProbability * 100).toFixed(2),
          totalProbability: ((totalValueCount / (trueTotalCount * condition.successProbability + falseTotalCount * condition.failureProbability)) * 100).toFixed(2)
        };
      });

    // 条件表达式的自定义Tooltip
    const ConditionalTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        
        return (
          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
            <p className="font-semibold">{`结果: ${label}`}</p>
            <p className="text-green-600 font-semibold">{`概率: ${data.totalProbability}%`}</p>
            {parseFloat(data.trueProbability) > 0 && (
              <p className="text-blue-600">{`条件为真: ${data.trueProbability}%`}</p>
            )}
            {parseFloat(data.falseProbability) > 0 && (
              <p className="text-blue-300">{`条件为假: ${data.falseProbability}%`}</p>
            )}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="value" 
              type="category"
              interval={0}
            />
            <YAxis 
              label={{ value: '概率 (%)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip content={<ConditionalTooltip />} />
            <Legend />
            <Bar 
              dataKey="totalCount" 
              fill="#8b5cf6" 
              name="条件表达式结果"
              radius={[2, 2, 0, 0]}
              stroke="#7c3aed"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 原有的普通分布图表逻辑
  const chartData = Object.entries(distribution)
    .map(([value, count]) => {
      const probability = (count / totalOutcomes) * 100;
      return {
        value: parseInt(value),
        count: count,
        probability: probability.toFixed(2),
        displayCount: count // 保持原始计数用于显示
      };
    })
    .sort((a, b) => a.value - b.value);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold">{`结果: ${label}`}</p>
          <p className="text-blue-600">{`次数: ${data.displayCount}`}</p>
          <p className="text-green-600">{`概率: ${((data.displayCount / totalOutcomes) * 100).toFixed(2)}%`}</p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="value" 
              type="category"
              interval={0}
            />
            <YAxis 
              label={{ value: '次数', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              fill="#3b82f6" 
              radius={[2, 2, 0, 0]}
              stroke="#1e40af"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default DiceChart;
