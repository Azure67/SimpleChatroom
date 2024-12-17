<script setup>
import {ref} from "vue";
import {useUserStore} from "@/store/index.js";
import axios from "axios";
import {useRouter} from "vue-router";

const IP = "192.168.149.56"
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
  await axios.post(`http://${IP}:3000/checkUserExists`,{
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
  await axios.post(`http://${IP}:3000/createUser`,{username:username,password:password}).then(res=>{
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
  await axios.post(`http://${IP}:3000/userLogin`,{
    'username':username,
    'password':password
  }).then(res =>{
    if (res.data.msg===0){
      ElMessage({
        message: '登录成功',
        type: 'success',
      })
      userStore.setname(username)
      userStore.setlogin(true)
      router.push('/chat')
    }else {
      ElMessage({
        message: '登录失败，账号或密码错误',
        type: 'error',
      })
    }
  })
}
</script>

<template>
  <div class="login-container">
    <h1 class="login-title">Chatroom</h1>
  </div>
  <div class="login" v-if="is_reg">
    <el-form :model="loguserform" :rules="loguserform_rules"  ref="logformRef">
      <el-form-item prop="username">
        <el-input style="width: 240px" placeholder="请输入用户名" v-model="loguserform.username"></el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input style="width: 240px" placeholder="请输入密码" type="password" v-model="loguserform.password"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="is_reg=false">注册</el-button>
        <el-button type="success" @click="user_login" @keyup.enter="user_login">登录</el-button></el-form-item>
    </el-form>
  </div>
  <div class="register" v-else>
    <el-form :model="reguserform" :rules="reguserform_rules" ref="regformRef">
      <el-form-item prop="username">
        <el-input style="width: 240px" placeholder="输入用户名" v-model="reguserform.username"></el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input style="width: 240px" placeholder="输入密码" type="password" v-model="reguserform.password"></el-input>
      </el-form-item>
      <el-form-item prop="repassword">
        <el-input style="width: 240px" placeholder="再次输入密码" type="password" v-model="reguserform.repassword"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button  type="primary" @click="user_register">注册</el-button>
        <el-button  type="primary" @click="is_reg=true">返回</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 30vh;
}
.login{
  display: flex;
  justify-content: center;
  align-items: center;
}
.register {
  display: flex;
  flex-direction: column; /* Stack children vertically */
  justify-content: center;
  align-items: center; /* Center the form and return link horizontally */
}
.input-container {
  display: flex;
  flex-direction: column; /* This will stack the inputs vertically */
  justify-content: center;
  align-items: center; /* This will center the inputs horizontally */
}

.login-title {
  font-size: 2em;
  text-align: center;
}
.button-container{
  text-align: center;
}
.el-input {
  width: 240px; /* Ensure both inputs have the same width */
  margin-bottom: 10px; /* Add space between inputs */
}
</style>