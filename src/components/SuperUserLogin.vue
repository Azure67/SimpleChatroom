<script setup>
import { ref } from 'vue';
import { User, Lock } from '@element-plus/icons-vue';

const username = ref('');
const password = ref('');

const login = () => {
    console.log(username.value, password.value);
}
</script>

<template>
  <div class="login-container">
    <h1>超级用户登录</h1>
    <div class="login-form">
      <el-input 
        v-model="username"
        placeholder="请输入用户名"
        :prefix-icon="User"
      ></el-input>
      <el-input 
        v-model="password"
        type="password"
        placeholder="请输入密码"
        :prefix-icon="Lock"
        show-password
      ></el-input>
      <el-button type="primary" @click="login" class="login-button">登录</el-button>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.login-form {
  width: 350px;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

h1 {
  margin-bottom: 30px;
  color: #303133;
}

.el-input {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  margin-top: 10px;
}
</style>