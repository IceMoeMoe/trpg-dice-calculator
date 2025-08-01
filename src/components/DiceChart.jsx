import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DiceChart = ({ distribution, totalOutcomes, isConditional, trueValues, falseValues, condition, isCritical, normalDistribution, criticalDistribution, normalProbability, criticalProbability, isConditionalCritical, normalHitValues, criticalHitValues, missValues, probabilities }) => {
  // 如果是条件暴击表达式，处理分离的数据
  if (isConditionalCritical && normalHitValues && criticalHitValues && missValues && probabilities) {
    // 合并小数到整数 - 对所有三种值分别处理
    const mergedNormalHitValues = {};
    const mergedCriticalHitValues = {};
    const mergedMissValues = {};
    
    Object.entries(normalHitValues).forEach(([value, count]) => {
      const flooredValue = Math.floor(parseFloat(value));
      if (mergedNormalHitValues[flooredValue]) {
        mergedNormalHitValues[flooredValue] += count;
      } else {
        mergedNormalHitValues[flooredValue] = count;
      }
    });
    
    Object.entries(criticalHitValues).forEach(([value, count]) => {
      const flooredValue = Math.floor(parseFloat(value));
      if (mergedCriticalHitValues[flooredValue]) {
        mergedCriticalHitValues[flooredValue] += count;
      } else {
        mergedCriticalHitValues[flooredValue] = count;
      }
    });
    
    Object.entries(missValues).forEach(([value, count]) => {
      const flooredValue = Math.floor(parseFloat(value));
      if (mergedMissValues[flooredValue]) {
        mergedMissValues[flooredValue] += count;
      } else {
        mergedMissValues[flooredValue] = count;
      }
    });
    
    // 获取所有可能的结果值（已经是整数）
    const allValues = new Set([
      ...Object.keys(mergedNormalHitValues).map(v => parseFloat(v)),
      ...Object.keys(mergedCriticalHitValues).map(v => parseFloat(v)),
      ...Object.keys(mergedMissValues).map(v => parseFloat(v))
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
    const normalHitTotalCount = Object.values(mergedNormalHitValues).reduce((sum, count) => sum + count, 0);
    const criticalHitTotalCount = Object.values(mergedCriticalHitValues).reduce((sum, count) => sum + count, 0);
    const missTotalCount = Object.values(mergedMissValues).reduce((sum, count) => sum + count, 0);
    
    const chartData = continuousValues
      .map(value => {
        const normalHitValueCount = mergedNormalHitValues[value] || 0;
        const criticalHitValueCount = mergedCriticalHitValues[value] || 0;
        const missValueCount = mergedMissValues[value] || 0;
        
        const normalHitProb = normalHitTotalCount > 0 ? (normalHitValueCount / normalHitTotalCount) * probabilities.normalHit : 0;
        const criticalHitProb = criticalHitTotalCount > 0 ? (criticalHitValueCount / criticalHitTotalCount) * probabilities.criticalHit : 0;
        const missProb = missTotalCount > 0 ? (missValueCount / missTotalCount) * probabilities.miss : 0;
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
          totalProbability: isNaN(totalProb) ? '0.00' : (totalProb * 100).toFixed(2)
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
            <p className="text-gray-500 text-xs">包含所有向下取整到此值的结果</p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
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
              domain={[0, 'auto']}
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
            {probabilities.miss > 0 && (
              <Bar 
                dataKey="missCount" 
                stackId="a"
                fill="#6b7280" 
                name="失败"
                radius={[2, 2, 0, 0]}
                stroke="#4b5563"
                strokeWidth={1}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  // 如果是暴击表达式，处理分离的数据
  if (isCritical && normalDistribution && criticalDistribution) {
    // 合并小数到整数 - 对 normalDistribution 和 criticalDistribution 分别处理
    const mergedNormalDistribution = {};
    const mergedCriticalDistribution = {};
    
    Object.entries(normalDistribution).forEach(([value, count]) => {
      const flooredValue = Math.floor(parseFloat(value));
      if (mergedNormalDistribution[flooredValue]) {
        mergedNormalDistribution[flooredValue] += count;
      } else {
        mergedNormalDistribution[flooredValue] = count;
      }
    });
    
    Object.entries(criticalDistribution).forEach(([value, count]) => {
      const flooredValue = Math.floor(parseFloat(value));
      if (mergedCriticalDistribution[flooredValue]) {
        mergedCriticalDistribution[flooredValue] += count;
      } else {
        mergedCriticalDistribution[flooredValue] = count;
      }
    });
    
    // 获取所有可能的结果值（已经是整数）
    const allValues = new Set([
      ...Object.keys(mergedNormalDistribution).map(v => parseFloat(v)),
      ...Object.keys(mergedCriticalDistribution).map(v => parseFloat(v))
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
    const normalTotalCount = Object.values(mergedNormalDistribution).reduce((sum, count) => sum + count, 0);
    const criticalTotalCount = Object.values(mergedCriticalDistribution).reduce((sum, count) => sum + count, 0);
    
    // 计算正确的总概率分布
    const totalPossible = normalTotalCount + criticalTotalCount;
    const chartData = continuousValues
      .map(value => {
        const normalValueCount = mergedNormalDistribution[value] || 0;
        const criticalValueCount = mergedCriticalDistribution[value] || 0;
        
        // 计算每个值的概率百分比
        const normalProbabilityPercent = (normalValueCount / normalTotalCount) * normalProbability * 100;
        const criticalProbabilityPercent = (criticalValueCount / criticalTotalCount) * criticalProbability * 100;
        const totalProbabilityPercent = normalProbabilityPercent + criticalProbabilityPercent;
        
        return {
          value: value,
          count: totalProbabilityPercent, // 使用百分比作为显示值
          normalCount: normalProbabilityPercent,
          criticalCount: criticalProbabilityPercent,
          normalProbability: normalProbabilityPercent.toFixed(2),
          criticalProbabilityValue: criticalProbabilityPercent.toFixed(2),
          totalProbability: totalProbabilityPercent.toFixed(2)
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
            <p className="text-gray-500 text-xs">包含所有向下取整到此值的结果</p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
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
              domain={[0, 'auto']}
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
    // 合并小数到整数 - 对 trueValues 和 falseValues 分别处理
    const mergedTrueValues = {};
    const mergedFalseValues = {};
    
    Object.entries(trueValues).forEach(([value, count]) => {
      const flooredValue = Math.floor(parseFloat(value));
      if (mergedTrueValues[flooredValue]) {
        mergedTrueValues[flooredValue] += count;
      } else {
        mergedTrueValues[flooredValue] = count;
      }
    });
    
    Object.entries(falseValues).forEach(([value, count]) => {
      const flooredValue = Math.floor(parseFloat(value));
      if (mergedFalseValues[flooredValue]) {
        mergedFalseValues[flooredValue] += count;
      } else {
        mergedFalseValues[flooredValue] = count;
      }
    });
    
    // 获取所有可能的结果值（已经是整数）
    const allValues = new Set([
      ...Object.keys(mergedTrueValues).map(v => parseInt(v)),
      ...Object.keys(mergedFalseValues).map(v => parseInt(v))
    ]);
    
    // 确保至少包含0和1，避免空数组
    let continuousValues = Array.from(allValues).sort((a, b) => a - b);
    
    // 对于条件表达式，强制包含0和1，确保图表有数据点
    if (continuousValues.length === 0) {
      continuousValues = [0, 1];
    } else if (continuousValues.length === 1) {
      // 如果只有一个值，确保包含0和1
      const singleValue = continuousValues[0];
      if (singleValue === 0) {
        continuousValues = [0, 1];
      } else if (singleValue === 1) {
        continuousValues = [0, 1];
      } else {
        continuousValues = [0, singleValue];
      }
    } else {
      // 对于只有两个值的简单条件表达式，直接使用这两个值
      if (continuousValues.length === 2 && continuousValues.includes(0) && continuousValues.includes(1)) {
        // 已经是0和1，直接使用
      } else {
        // 确保包含最小值到最大值之间的所有整数
        const minValue = Math.min(...continuousValues);
        const maxValue = Math.max(...continuousValues);
        continuousValues = [];
        for (let i = minValue; i <= maxValue; i++) {
          continuousValues.push(i);
        }
      }
    }
    
    // 计算正确的概率分布
    const trueTotalCount = Object.values(mergedTrueValues).reduce((sum, count) => sum + count, 0) || 1;
    const falseTotalCount = Object.values(mergedFalseValues).reduce((sum, count) => sum + count, 0) || 1;
    
    // 确保有数据
    if (trueTotalCount === 0 && falseTotalCount === 0) {
      return (
        <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">条件表达式无有效数据</p>
        </div>
      );
    }
    
    const chartData = continuousValues
      .map(value => {
        const trueValueCount = mergedTrueValues[value] || 0;
        const falseValueCount = mergedFalseValues[value] || 0;
        
        // 计算每个值的概率百分比
        const trueProbabilityPercent = (trueValueCount / trueTotalCount) * condition.successProbability * 100;
        const falseProbabilityPercent = (falseValueCount / falseTotalCount) * condition.failureProbability * 100;
        const totalProbabilityPercent = trueProbabilityPercent + falseProbabilityPercent;
        
        return {
          value: value,
          count: Math.max(totalProbabilityPercent, 0.01), // 确保有显示值，使用百分比
          trueCount: trueProbabilityPercent,
          falseCount: falseProbabilityPercent,
          trueProbability: trueProbabilityPercent.toFixed(2),
          falseProbability: falseProbabilityPercent.toFixed(2),
          totalProbability: totalProbabilityPercent.toFixed(2)
        };
      })
      .filter(item => item.count > 0.01); // 确保显示有意义的数据

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
            <p className="text-gray-500 text-xs">包含所有向下取整到此值的结果</p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
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
              domain={[0, 'auto']}
            />
            <Tooltip content={<ConditionalTooltip />} />
            <Legend />
            <Bar 
              dataKey="count" 
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

  // 原有的普通分布图表逻辑 - 合并小数到整数
  // 首先将小数向下取整并合并计数
  const mergedDistribution = {};
  Object.entries(distribution).forEach(([value, count]) => {
    const numericValue = parseFloat(value);
    const flooredValue = Math.floor(numericValue);
    if (mergedDistribution[flooredValue]) {
      mergedDistribution[flooredValue] += count;
    } else {
      mergedDistribution[flooredValue] = count;
    }
  });

  const chartData = Object.entries(mergedDistribution)
    .map(([value, count]) => {
      const probability = (count / totalOutcomes) * 100;
      const numericValue = parseFloat(value);
      return {
        value: numericValue,
        displayValue: numericValue.toString(), // 现在都是整数，不需要小数显示
        count: count,
        probability: probability.toFixed(2),
        displayCount: count, // 保持原始计数用于显示
        probabilityValue: probability // 用于图表显示
      };
    })
    .sort((a, b) => a.value - b.value);

  // 计算智能的X轴间隔
  const calculateXAxisInterval = (dataLength) => {
    if (dataLength <= 10) return 0; // 显示所有标签
    if (dataLength <= 20) return 1; // 每隔1个显示
    if (dataLength <= 40) return 2; // 每隔2个显示
    if (dataLength <= 60) return 4; // 每隔4个显示
    return Math.floor(dataLength / 12); // 保持大约12个标签
  };

  const xAxisInterval = calculateXAxisInterval(chartData.length);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold">{`结果: ${label}`}</p>
          <p className="text-green-600 font-semibold">{`概率: ${data.probability}%`}</p>
          <p className="text-blue-600">{`次数: ${data.displayCount}`}</p>
          <p className="text-gray-500 text-xs">包含所有向下取整到此值的结果</p>
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
    <div className="w-full h-80"> {/* 增加高度给底部标签更多空间 */}
      <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40, // 增加底部边距给X轴标签更多空间
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="displayValue" 
              type="category"
              interval={xAxisInterval}
              tick={{ fontSize: 11, angle: -45 }} // 倾斜显示，减小字体
              height={60} // 为倾斜标签预留高度
            />
            <YAxis 
              label={{ value: '概率 (%)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="probabilityValue" 
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
