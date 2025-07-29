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
    
    // 计算总的各种情况出现次数
    const normalHitTotalCount = Object.values(normalHitValues).reduce((sum, count) => sum + count, 0);
    const criticalHitTotalCount = Object.values(criticalHitValues).reduce((sum, count) => sum + count, 0);
    const missTotalCount = Object.values(missValues).reduce((sum, count) => sum + count, 0);
    
    // 先计算每个值的实际概率
    const valueData = Array.from(allValues)
      .sort((a, b) => a - b)
      .map(value => {
        const normalHitProb = normalHitValues[value] ? (normalHitValues[value] / normalHitTotalCount) * probabilities.normalHit : 0;
        const criticalHitProb = criticalHitValues[value] ? (criticalHitValues[value] / criticalHitTotalCount) * probabilities.criticalHit : 0;
        const missProb = missValues[value] ? (missValues[value] / missTotalCount) * probabilities.miss : 0;
        const totalProb = normalHitProb + criticalHitProb + missProb;
        
        return {
          value: value,
          normalHitProb: normalHitProb,
          criticalHitProb: criticalHitProb,
          missProb: missProb,
          totalProb: totalProb,
          normalHitPercentage: (normalHitProb * 100).toFixed(2),
          criticalHitPercentage: (criticalHitProb * 100).toFixed(2),
          missPercentage: (missProb * 100).toFixed(2),
          totalPercentage: (totalProb * 100).toFixed(2)
        };
      });

    const chartData = valueData.map(item => ({
      value: item.value,
      // 直接使用概率百分比作为显示值
      totalCount: parseFloat(item.totalPercentage),
      normalHitCount: parseFloat(item.normalHitPercentage),
      criticalHitCount: parseFloat(item.criticalHitPercentage),
      missCount: parseFloat(item.missPercentage),
      normalHitProbability: item.normalHitPercentage,
      criticalHitProbability: item.criticalHitPercentage,
      missProbability: item.missPercentage,
      totalProbability: item.totalPercentage
    }));

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
            />
            <YAxis />
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
    
    // 计算总的普通和暴击出现次数
    const normalTotalCount = Object.values(normalDistribution).reduce((sum, count) => sum + count, 0);
    const criticalTotalCount = Object.values(criticalDistribution).reduce((sum, count) => sum + count, 0);
    
    const chartData = Array.from(allValues)
      .sort((a, b) => a - b)
      .map(value => ({
        value: value,
        normalCount: (normalDistribution[value] || 0) * normalProbability,
        criticalCount: (criticalDistribution[value] || 0) * criticalProbability,
        normalProbability: normalDistribution[value] ? ((normalDistribution[value] / normalTotalCount) * normalProbability * 100).toFixed(2) : '0.00',
        criticalProbabilityValue: criticalDistribution[value] ? ((criticalDistribution[value] / criticalTotalCount) * criticalProbability * 100).toFixed(2) : '0.00'
      }));

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
                <p className="text-blue-600">{`普通次数: ${normalData.value.toFixed(2)}`}</p>
                <p className="text-blue-500">{`普通概率: ${normalData.payload.normalProbability}%`}</p>
              </>
            )}
            {criticalData && criticalData.value > 0 && (
              <>
                <p className="text-red-600">{`暴击次数: ${criticalData.value.toFixed(2)}`}</p>
                <p className="text-red-500">{`暴击概率: ${criticalData.payload.criticalProbabilityValue}%`}</p>
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
            <YAxis />
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
    
    // 计算总的真值和假值出现次数
    const trueTotalCount = Object.values(trueValues).reduce((sum, count) => sum + count, 0);
    const falseTotalCount = Object.values(falseValues).reduce((sum, count) => sum + count, 0);
    
    // 先计算每个值的实际概率
    const valueData = Array.from(allValues)
      .sort((a, b) => a - b)
      .map(value => {
        const trueProbability = trueValues[value] ? (trueValues[value] / trueTotalCount) * condition.successProbability : 0;
        const falseProbability = falseValues[value] ? (falseValues[value] / falseTotalCount) * condition.failureProbability : 0;
        const totalProbability = trueProbability + falseProbability;
        
        return {
          value: value,
          trueProbability: trueProbability,
          falseProbability: falseProbability,
          totalProbability: totalProbability,
          truePercentage: (trueProbability * 100).toFixed(2),
          falsePercentage: (falseProbability * 100).toFixed(2),
          totalPercentage: (totalProbability * 100).toFixed(2)
        };
      });
    
    // 找到最大概率，用作缩放基准
    const maxProbability = Math.max(...valueData.map(d => d.totalProbability));
    
    const chartData = valueData.map(item => ({
      value: item.value,
      // 直接使用概率百分比作为显示值，这样Y轴会显示正确的概率
      totalCount: parseFloat(item.totalPercentage),
      trueCount: parseFloat(item.truePercentage),
      falseCount: parseFloat(item.falsePercentage),
      trueProbability: item.truePercentage,
      falseProbability: item.falsePercentage,
      totalProbability: item.totalPercentage
    }));

    // 条件表达式的自定义Tooltip
    const ConditionalTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        
        return (
          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
            <p className="font-semibold">{`结果: ${label}`}</p>
            <p className="text-green-600 font-semibold">{`概率: ${data.totalProbability}%`}</p>
            {parseFloat(data.trueProbability) > 0 && (
              <p className="text-blue-600">{`来自条件为真: ${data.trueProbability}%`}</p>
            )}
            {parseFloat(data.falseProbability) > 0 && (
              <p className="text-blue-300">{`来自条件为假: ${data.falseProbability}%`}</p>
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
            <YAxis />
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
    .map(([value, count]) => ({
      value: parseInt(value),
      count: count,
      probability: ((count / totalOutcomes) * 100).toFixed(2)
    }))
    .sort((a, b) => a.value - b.value);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold">{`结果: ${label}`}</p>
          <p className="text-blue-600">{`次数: ${payload[0].value}`}</p>
          <p className="text-green-600">{`概率: ${payload[0].payload.probability}%`}</p>
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
          <YAxis />
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
