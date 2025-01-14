<script setup>
import * as echarts from 'echarts'
import {ref, onMounted, onUnmounted} from 'vue'
import Socket from "@/socket.js";
import { Refresh } from '@element-plus/icons-vue'

const echartsDom = ref()
const myChart = ref(null)
const sparkAiHistoriesToken = ref({})
const userMessageNumCount = ref({})

const resizeChart = () => {
  if (myChart.value) {
    myChart.value.resize();
  }
}

const initEcharts = async () => {
  if (!echartsDom.value) return;
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  myChart.value = echarts.init(echartsDom.value);
  
  const option = {
    title: [
      {
        text: 'Token 消耗统计',
        left: 'center',
        top: '5%',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      {
        text: '用户发言统计',
        left: 'center',
        top: '55%',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      }
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        const param = params[0];
        const value = param.value || 0;
        return `${param.name}<br/>${param.seriesName}: ${value.toLocaleString()}`;
      }
    },
    grid: [
      { 
        left: '8%',
        right: '8%',
        top: '15%', 
        bottom: '50%',
        containLabel: true
      },
      { 
        left: '8%',
        right: '8%',
        top: '65%',
        bottom: '5%',
        containLabel: true
      }
    ],
    xAxis: [
      {
        type: 'category',
        data: [],
        gridIndex: 0,
        axisLabel: {
          interval: 0,
          rotate: 45,
          margin: 8,
          width: 80,
          overflow: 'truncate',
          ellipsis: '...',
          lineHeight: 14,
          fontSize: 12,
          formatter: function(value) {
            return value || '';
          }
        }
      },
      {
        type: 'category',
        data: [],
        gridIndex: 1,
        axisLabel: {
          interval: 0,
          rotate: 45,
          margin: 8,
          width: 80,
          overflow: 'truncate',
          ellipsis: '...',
          lineHeight: 14,
          fontSize: 12,
          formatter: function(value) {
            return value || '';
          }
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: 'Token数',
        gridIndex: 0,
        minInterval: 1,
        nameTextStyle: {
          padding: [0, 30, 0, 0],
          fontSize: 12
        },
        axisLabel: {
          fontSize: 12
        }
      },
      {
        type: 'value',
        name: '发言次数',
        gridIndex: 1,
        minInterval: 1,
        nameTextStyle: {
          padding: [0, 30, 0, 0],
          fontSize: 12
        },
        axisLabel: {
          fontSize: 12
        }
      }
    ],
    series: [
      {
        name: 'Token消耗',
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: [],
        itemStyle: {
          color: '#409EFF'
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 12,
          formatter: function(params) {
            return params.value ? params.value.toLocaleString() : '0';
          }
        },
        barMaxWidth: 40
      },
      {
        name: '发言次数',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: [],
        itemStyle: {
          color: '#67C23A'
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 12,
          formatter: function(params) {
            return params.value ? params.value.toLocaleString() : '0';
          }
        },
        barMaxWidth: 40
      }
    ]
  }
  
  myChart.value.setOption(option);
  resizeChart();
}

const updateChart = () => {
  if (!myChart.value) return;
  
  // 过滤掉空值和零值
  const tokenData = {
    users: Object.keys(sparkAiHistoriesToken.value).filter(key => sparkAiHistoriesToken.value[key] > 0),
    values: Object.values(sparkAiHistoriesToken.value).filter(value => value > 0)
  };
  
  const msgData = {
    users: Object.keys(userMessageNumCount.value).filter(key => userMessageNumCount.value[key] > 0),
    values: Object.values(userMessageNumCount.value).filter(value => value > 0)
  };
  
  const updateOption = {
    xAxis: [
      {
        data: tokenData.users
      },
      {
        data: msgData.users
      }
    ],
    series: [
      {
        data: tokenData.values
      },
      {
        data: msgData.values
      }
    ]
  };

  myChart.value.setOption(updateOption);
}

// 监听窗口大小变化
const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeChart();
  }, 100);
}

let resizeTimer = null;
let resizeObserver = null;

Socket.on("allUser", (data) => {
  // 当有新用户加入或用户列表更新时，请求最新的图表数据
  Socket.emit("requestEchartsData");
});

Socket.on("getEchartsData", (data) => {
  sparkAiHistoriesToken.value = data.sparkAiHistoriesToken;
  userMessageNumCount.value = data.userMessageNumCount;
  updateChart();
});

const refreshData = () => {
  Socket.emit("requestEchartsData");
};

onMounted(async () => {
  await initEcharts();
  
  // 监听容器大小变化
  resizeObserver = new ResizeObserver(() => {
    resizeChart();
  });
  
  if (echartsDom.value) {
    resizeObserver.observe(echartsDom.value);
  }
  
  window.addEventListener('resize', handleResize);
  // 组件挂载时也请求一次数据
  Socket.emit("requestEchartsData");
});

onUnmounted(() => {
  if (resizeTimer) clearTimeout(resizeTimer);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener('resize', handleResize);
  myChart.value?.dispose();
});
</script>

<template>
  <div class="chart-wrapper">
    <div class="chart-header">
      <el-button 
        type="primary" 
        size="small" 
        @click="refreshData"
        :icon="Refresh"
        circle
        class="refresh-btn"
      />
    </div>
    <div ref="echartsDom" class="echarts-container"></div>
  </div>
</template>

<style scoped>
.chart-wrapper {
  width: 100%;
  height: 100%;
  min-height: 500px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.chart-header {
  padding: 10px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.refresh-btn {
  transition: transform 0.3s ease;
}

.refresh-btn:hover {
  transform: rotate(180deg);
}

.echarts-container {
  flex: 1;
  min-height: 450px;
  position: relative;
  padding: 10px;
  box-sizing: border-box;
}

@media screen and (max-width: 768px) {
  .echarts-container {
    min-height: 350px;
  }
}

@media screen and (min-width: 1200px) {
  .echarts-container {
    min-height: 550px;
  }
}
</style>