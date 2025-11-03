<script setup>
import {ref, onUnmounted} from "vue";
import {useUserStore} from "@/store/index.js";
import axios from "axios";
import {useRouter} from "vue-router";
import {User,Lock} from "@element-plus/icons-vue";
import Socket from "@/socket.js";
import {Base64} from "js-base64";
import {md5} from "js-md5";

const IP = import.meta.env.VITE_IP
const PORT = import.meta.env.VITE_PORT
const router = useRouter()
const userStore = useUserStore()
const is_reg=ref(true)
const logformRef = ref()
const regformRef = ref()
const loguserform = ref({
  username:'',
  password:''
})
const reguserform = ref({
  username:'',
  password:'',
  repassword:''
})
const loguserform_rules={
  username:[
    {required:true,message:'输入用户名',trigger:'blur'},
  ],
  password:[
    {required:true,message:'密码不能为空',trigger:'blur'}
  ]
}
const reguserform_rules={
  username:[
    {required:true,message:'输入用户名',trigger:'blur'},
  ],
  password:[
    {pattern:/^\S{6,15}$/,message:'密码需为6-15位非空字符',trigger: 'blur'},
    {required:true,message:'密码不能为空',trigger:'blur'}
  ],
  repassword:[
    {pattern:/^\S{6,15}$/,message:'密码需为6-15位非空字符',trigger: 'blur'},
    {required:true,message:'密码不能为空',trigger:'blur'},
    {validator:(rule,value,callback)=>{
        if (value !== reguserform.value.password){
          callback(new Error("两次输入密码不同"))
        }else {
          callback()
        }
      },trigger: 'blur'}

  ]
}
const user_register=async ()=>{
  await regformRef.value.validate()
  const username = reguserform.value.username.trim();
  const password = reguserform.value.password.trim();
  await axios.post(`http://${IP}:${PORT}/checkUserExists`,{
    'username':username
  }).then(res=>{
    if(res.data.msg===0){
        create_user(username,password)

    }else if(res.data.msg===1){
      ElMessage({
        message: '该用户已存在',
        type: 'warning',
      })
    }else {
      ElMessage({
        message: '未知错误',
        type: 'warning',
      })
    }
  })
}
const create_user=async (username,password)=>{
  await axios.post(`http://${IP}:${PORT}/createUser`,{username:username,password:password}).then(res=>{
    if (res.data.msg===0) {
      ElMessage({
        message: '创建用户成功',
        type: 'success',
      })
      is_reg.value=true
    }else {
      ElMessage({
        message: '未知错误',
        type: 'warning',
      })
    }
  }).catch(e=>{
    console.log(e)
  })
}
const user_login=async ()=>{
  await logformRef.value.validate()
  const username = loguserform.value.username.trim()
  const password = loguserform.value.password.trim()
  try {
    const res = await axios.post(`http://${IP}:${PORT}/userLogin`, {
      'username': username,
      'password': password
    });
    
    if (res.data.msg === 0) {
      ElMessage({
        message: '登录成功',
        type: 'success',
      });

      localStorage.setItem('username', username);
      userStore.setname(username);
      userStore.setlogin(true);

      Socket.connect();

      Socket.on('connect', () => {
        router.push('/chat');
      });

      Socket.on('connect_error', (error) => {
        ElMessage.error('连接服务器失败，请重试');
        console.error('Socket connection error:', error);
      });
      
    } else if (res.data.msg === 2) {
      ElMessage({
        message: '该用户已登录',
        type: 'error'
      });
    } else {
      ElMessage({
        message: '登录失败，账号或密码错误',
        type: 'error',
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    ElMessage.error('登录请求失败，请重试');
  }
}
const password_encode = (text)=>{
  var new_text = text + Date.now()
  var base64_text = Base64.encode(new_text)
  base64_text = Array.prototype.slice.call(base64_text).reverse().join("")
  var md5_text=md5(base64_text)
  md5_text=Array.prototype.slice.call(md5_text).reverse().join("")
  return md5_text
}
onUnmounted(() => {
  Socket.off('connect');
  Socket.off('connect_error');
});
</script>

<template>
  <div class="page-container">
    <div class="login-container">
      <h1 class="login-title">Chatroom</h1>
      
      <div class="form-container">
        <transition name="fade" mode="out-in">
          <div class="login" v-if="is_reg" key="login">
            <el-form :model="loguserform" :rules="loguserform_rules" ref="logformRef">
              <el-form-item prop="username">
                <el-input style="width: 300px" placeholder="请输入用户名" v-model="loguserform.username">
                  <template #prefix>
                    <el-icon><User /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item prop="password">
                <el-input style="width: 300px" placeholder="请输入密码" type="password" v-model="loguserform.password" show-password>
                  <template #prefix>
                    <el-icon><Lock /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="is_reg=false" class="form-button">注册账号</el-button>
                <el-button type="success" @click="user_login" @keyup.enter="user_login" class="form-button">登录</el-button>
              </el-form-item>
            </el-form>
          </div>

          <div class="register" v-else key="register">
            <el-form :model="reguserform" :rules="reguserform_rules" ref="regformRef">
              <el-form-item prop="username">
                <el-input style="width: 300px" placeholder="输入用户名" v-model="reguserform.username">
                  <template #prefix>
                    <el-icon><User /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item prop="password">
                <el-input style="width: 300px" placeholder="输入密码" type="password" v-model="reguserform.password">
                  <template #prefix>
                    <el-icon><Lock /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item prop="repassword">
                <el-input style="width: 300px" placeholder="再次输入密码" type="password" v-model="reguserform.repassword">
                  <template #prefix>
                    <el-icon><Lock /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="user_register" class="form-button">注册</el-button>
                <el-button @click="is_reg=true" class="form-button">返回登录</el-button>
              </el-form-item>
            </el-form>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-container {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem 3rem;
  border-radius: 15px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  width: 400px;
}

.login-title {
  font-size: 2.5em;
  color: #333;
  text-align: center;
  margin-bottom: 2rem;
  font-weight: 600;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.form-container {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

.login, .register {
  width: 100%;
  display: flex;
  justify-content: center;
}

.form-button {
  width: 140px;
  margin: 0 5px;
  height: 40px;
  font-size: 1rem;
  border-radius: 20px;
  transition: transform 0.3s ease;
}

.form-button:hover {
  transform: translateY(-2px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.el-input__wrapper) {
  border-radius: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-button) {
  border-radius: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-form) {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
</style>