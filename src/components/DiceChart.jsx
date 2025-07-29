import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DiceChart = ({ distribution, totalOutcomes, isConditional, trueValues, falseValues, condition }) => {
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
