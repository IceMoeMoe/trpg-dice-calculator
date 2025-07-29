import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DiceChart = ({ distribution, totalOutcomes }) => {
  // 将分布数据转换为图表数据格式
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

