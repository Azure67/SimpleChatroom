<template>
  <div class="user-settings-container">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <h3>个人信息设置</h3>
        </div>
      </template>
      
      <!-- 头像设置 -->
      <div class="avatar-section">
        <h4>头像设置</h4>
        <div class="avatar-container">
          <el-avatar :size="100" :src="currentAvatar"></el-avatar>
          <el-upload
            class="avatar-uploader"
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleAvatarChange">
            <el-button type="primary">选择新头像</el-button>
          </el-upload>
        </div>
        <el-button 
          type="success" 
          :disabled="!newAvatar" 
          @click="submitAvatar"
          :loading="avatarLoading">
          保存头像
        </el-button>
      </div>
      
      <!-- 用户名设置 -->
      <div class="username-section">
        <h4>用户名设置</h4>
        <el-input 
          v-model="newUsername" 
          placeholder="输入新用户名"
          :prefix-icon="User">
        </el-input>
        <el-button 
          type="success" 
          :disabled="!newUsername || newUsername === currentUsername" 
          @click="submitUsername"
          :loading="usernameLoading">
          保存用户名
        </el-button>
      </div>
      
      <!-- AI提示词设置 -->
      <div class="ai-prompt-section">
        <h4>AI提示词设置</h4>
        <div class="model-selector">
          <el-select v-model="selectedModel" placeholder="选择AI模型">
            <el-option label="DeepSeek Chat" value="v3"></el-option>
            <el-option label="DeepSeek Reasoner" value="r1"></el-option>
          </el-select>
        </div>
        <el-input
          v-model="systemPrompt"
          type="textarea"
          :rows="5"
          placeholder="请输入您希望AI遵循的系统提示词...">
        </el-input>
        <div class="prompt-footer">
          <el-button 
            type="primary" 
            @click="submitSystemPrompt"
            :loading="promptLoading"
            :disabled="!systemPrompt || !selectedModel">
            保存提示词
          </el-button>
          <el-button @click="resetSystemPrompt">重置默认</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { User } from '@element-plus/icons-vue';
import { useUserStore } from '@/store/index.js';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const userStore = useUserStore();
const currentUsername = ref('');
const newUsername = ref('');
const currentAvatar = ref('');
const newAvatar = ref(null);
const systemPrompt = ref('');
const selectedModel = ref('v3');

const avatarLoading = ref(false);
const usernameLoading = ref(false);
const promptLoading = ref(false);

const IP = import.meta.env.VITE_IP;
const PORT = import.meta.env.VITE_PORT;

onMounted(async () => {
  currentUsername.value = userStore.username;
  currentAvatar.value = userStore.getAvatar(currentUsername.value);
  
  // 获取当前用户的系统提示词
  try {
    const response = await axios.get(`http://${IP}:${PORT}/getUserSystemPrompt`, {
      params: {
        username: currentUsername.value,
        model: selectedModel.value
      }
    });
    if (response.data.success) {
      systemPrompt.value = response.data.prompt || '';
    }
  } catch (error) {
    console.error('获取系统提示词失败', error);
  }
});

// 当选择的模型变更时，获取对应的提示词
watch(selectedModel, async (newModel) => {
  try {
    const response = await axios.get(`http://${IP}:${PORT}/getUserSystemPrompt`, {
      params: {
        username: currentUsername.value,
        model: newModel
      }
    });
    if (response.data.success) {
      systemPrompt.value = response.data.prompt || '';
    }
  } catch (error) {
    console.error('获取系统提示词失败', error);
  }
});

// 处理头像变更
const handleAvatarChange = (file) => {
  const isImage = file.raw.type.startsWith('image/');
  if (!isImage) {
    ElMessage.error('请上传图片格式文件!');
    return;
  }
  
  if (file.size / 1024 / 1024 > 2) {
    ElMessage.error('图片大小不能超过2MB!');
    return;
  }
  
  // 预览头像
  newAvatar.value = file.raw;
  const reader = new FileReader();
  reader.readAsDataURL(file.raw);
  reader.onload = () => {
    currentAvatar.value = reader.result;
  };
};

// 提交头像
const submitAvatar = async () => {
  if (!newAvatar.value) return;
  
  avatarLoading.value = true;
  const formData = new FormData();
  formData.append('avatar', newAvatar.value);
  formData.append('username', currentUsername.value);
  
  try {
    const response = await axios.post(`http://${IP}:${PORT}/setUserAvatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.data.success) {
      ElMessage.success('头像更新成功!');
      await userStore.loadUserAvatar(currentUsername.value);
    } else {
      ElMessage.error(response.data.message || '头像更新失败');
    }
  } catch (error) {
    ElMessage.error('上传失败: ' + error.message);
  } finally {
    avatarLoading.value = false;
  }
};

// 提交用户名
const submitUsername = async () => {
  if (!newUsername.value || newUsername.value === currentUsername.value) return;
  
  usernameLoading.value = true;
  try {
    const response = await axios.post(`http://${IP}:${PORT}/setUserName`, {
      oldUsername: currentUsername.value,
      newUsername: newUsername.value
    });
    
    if (response.data.success) {
      ElMessage.success('用户名更新成功!');
      userStore.username = newUsername.value;
      currentUsername.value = newUsername.value;
    } else {
      ElMessage.error(response.data.message || '用户名更新失败');
    }
  } catch (error) {
    ElMessage.error('更新失败: ' + error.message);
  } finally {
    usernameLoading.value = false;
  }
};

// 提交系统提示词
const submitSystemPrompt = async () => {
  if (!systemPrompt.value || !selectedModel.value) return;
  
  promptLoading.value = true;
  try {
    const response = await axios.post(`http://${IP}:${PORT}/setSystemPrompt`, {
      username: currentUsername.value,
      model: selectedModel.value,
      prompt: systemPrompt.value
    });
    
    if (response.data.success) {
      ElMessage.success('AI提示词设置成功!');
    } else {
      ElMessage.error(response.data.message || 'AI提示词设置失败');
    }
  } catch (error) {
    ElMessage.error('设置失败: ' + error.message);
  } finally {
    promptLoading.value = false;
  }
};

// 重置系统提示词
const resetSystemPrompt = async () => {
  promptLoading.value = true;
  try {
    const response = await axios.post(`http://${IP}:${PORT}/resetSystemPrompt`, {
      username: currentUsername.value,
      model: selectedModel.value
    });
    
    if (response.data.success) {
      systemPrompt.value = response.data.defaultPrompt || '';
      ElMessage.success('AI提示词已重置为默认值!');
    } else {
      ElMessage.error(response.data.message || '重置失败');
    }
  } catch (error) {
    ElMessage.error('重置失败: ' + error.message);
  } finally {
    promptLoading.value = false;
  }
};
</script>

<style scoped>
.user-settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.avatar-section,
.username-section,
.ai-prompt-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.avatar-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 15px;
}

.avatar-uploader {
  display: flex;
  flex-direction: column;
}

h4 {
  margin-bottom: 15px;
  font-weight: 500;
  color: #303133;
}

.el-input {
  margin-bottom: 15px;
}

.model-selector {
  margin-bottom: 15px;
}

.prompt-footer {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  margin-top: 10px;
}
</style> 