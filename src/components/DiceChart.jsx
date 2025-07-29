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
    
    const chartData = Array.from(allValues)
      .sort((a, b) => a - b)
      .map(value => ({
        value: value,
        normalHitCount: (normalHitValues[value] || 0) * probabilities.normalHit,
        criticalHitCount: (criticalHitValues[value] || 0) * probabilities.criticalHit,
        missCount: (missValues[value] || 0) * probabilities.miss,
        normalHitProbability: normalHitValues[value] ? ((normalHitValues[value] / normalHitTotalCount) * probabilities.normalHit * 100).toFixed(2) : '0.00',
        criticalHitProbability: criticalHitValues[value] ? ((criticalHitValues[value] / criticalHitTotalCount) * probabilities.criticalHit * 100).toFixed(2) : '0.00',
        missProbability: missValues[value] ? ((missValues[value] / missTotalCount) * probabilities.miss * 100).toFixed(2) : '0.00'
      }));

    // 条件暴击表达式的自定义Tooltip
    const ConditionalCriticalTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const normalHitData = payload.find(p => p.dataKey === 'normalHitCount');
        const criticalHitData = payload.find(p => p.dataKey === 'criticalHitCount');
        const missData = payload.find(p => p.dataKey === 'missCount');
        
        return (
          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
            <p className="font-semibold">{`结果: ${label}`}</p>
            {normalHitData && normalHitData.value > 0 && (
              <>
                <p className="text-blue-600">{`普通命中: ${normalHitData.value.toFixed(2)}`}</p>
                <p className="text-blue-500">{`概率: ${normalHitData.payload.normalHitProbability}%`}</p>
              </>
            )}
            {criticalHitData && criticalHitData.value > 0 && (
              <>
                <p className="text-red-600">{`暴击命中: ${criticalHitData.value.toFixed(2)}`}</p>
                <p className="text-red-500">{`概率: ${criticalHitData.payload.criticalHitProbability}%`}</p>
              </>
            )}
            {missData && missData.value > 0 && (
              <>
                <p className="text-gray-600">{`失败: ${missData.value.toFixed(2)}`}</p>
                <p className="text-gray-500">{`概率: ${missData.payload.missProbability}%`}</p>
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
            <Tooltip content={<ConditionalCriticalTooltip />} />
            <Legend />
            <Bar 
              dataKey="normalHitCount" 
              fill="#3b82f6" 
              name="普通命中"
              radius={[2, 2, 0, 0]}
              stroke="#1e40af"
              strokeWidth={1}
            />
            <Bar 
              dataKey="criticalHitCount" 
              fill="#ef4444" 
              name="暴击命中"
              radius={[2, 2, 0, 0]}
              stroke="#dc2626"
              strokeWidth={1}
            />
            <Bar 
              dataKey="missCount" 
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
    
    const chartData = Array.from(allValues)
      .sort((a, b) => a - b)
      .map(value => ({
        value: value,
        trueCount: (trueValues[value] || 0) * condition.successProbability,
        falseCount: (falseValues[value] || 0) * condition.failureProbability,
        trueProbability: trueValues[value] ? ((trueValues[value] / trueTotalCount) * condition.successProbability * 100).toFixed(2) : '0.00',
        falseProbability: falseValues[value] ? ((falseValues[value] / falseTotalCount) * condition.failureProbability * 100).toFixed(2) : '0.00'
      }));

    // 条件表达式的自定义Tooltip
    const ConditionalTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const trueData = payload.find(p => p.dataKey === 'trueCount');
        const falseData = payload.find(p => p.dataKey === 'falseCount');
        
        return (
          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
            <p className="font-semibold">{`结果: ${label}`}</p>
            {trueData && trueData.value > 0 && (
              <>
                <p className="text-blue-600">{`真值次数: ${trueData.value.toFixed(2)}`}</p>
                <p className="text-blue-500">{`真值概率: ${trueData.payload.trueProbability}%`}</p>
              </>
            )}
            {falseData && falseData.value > 0 && (
              <>
                <p className="text-blue-300">{`假值次数: ${falseData.value.toFixed(2)}`}</p>
                <p className="text-blue-200">{`假值概率: ${falseData.payload.falseProbability}%`}</p>
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
            <Tooltip content={<ConditionalTooltip />} />
            <Legend />
            <Bar 
              dataKey="trueCount" 
              fill="#3b82f6" 
              name="条件为真"
              radius={[2, 2, 0, 0]}
              stroke="#1e40af"
              strokeWidth={1}
            />
            <Bar 
              dataKey="falseCount" 
              fill="#3b82f680" 
              name="条件为假"
              radius={[2, 2, 0, 0]}
              stroke="#1e40af80"
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
