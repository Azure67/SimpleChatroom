<script setup>
import { ref } from 'vue';
import { User, Lock } from '@element-plus/icons-vue';
import axios from "axios";
import {useRouter} from "vue-router";

const router = useRouter()
const username = ref('');
const password = ref('');
const IP = import.meta.env.VITE_IP
const PORT = import.meta.env.VITE_PORT
const login = async () => {
   await axios.post(`http://${IP}:${PORT}/superuserLogin`,{username:username.value,password:password.value}).then((res)=>{
      if (res.data.code===0){
        ElMessage.success(res.data.message)
        router.push('/adminDashboard')
      }else {
        ElMessage.error(res.data.message)
      }
   })
}
</script>

<template>
  <div class="login-container">
    <h1>管理员登录</h1>
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
        show-passwordMicrosoft.QuickAction.WiFi
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