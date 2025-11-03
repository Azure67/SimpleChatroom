<script setup>
import {ref,onMounted} from 'vue'
import axios from "axios";
import Socket from "@/socket.js";

const IP = import.meta.env.VITE_IP;
const PORT=import.meta.env.VITE_PORT
const regularUserList=ref([])
const activeIndex = ref("1-1")
const regularUserFormData = ref([])

const handleSelect = (index) => {
  activeIndex.value = index
}
const getRegularUserList = async () =>{
  const response = await axios.post(`http://${IP}:${PORT}/getRegularUser`)
  if (response.data.code === 0) {
    regularUserList.value=response.data.userList
    await getRegularUserFormData()
  }else {
    ElMessage.error("获取普通用户列表失败")
  }
}
const getRegularUserFormData = async () =>{
  const response = await axios.post(`http://${IP}:${PORT}/getOnlineUser`)
  const onlineUserSet =new Set(response.data)
  console.log(onlineUserSet)
  regularUserFormData.value = regularUserList.value.map((v,index) =>({
    name:v,
    id:index,
    status:onlineUserSet.has(v)? 'online' : 'offline'
  }))
}
const kickUser = async (username) =>{
  Socket.emit('kickUser',username)
  setTimeout(async () => {
    await getRegularUserFormData()
  }, 500)
}
Socket.on('userjoin',async (data)=>{
  await getRegularUserFormData()
})
Socket.on('levelChatroom',async (data)=>{
  await getRegularUserFormData()
})
onMounted(()=>{
  getRegularUserList()
})
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header>后台管理</el-header>
      <el-container>
        <el-aside width="200px">
          <el-menu
              :router="false"
              :default-active="activeIndex"
              @select="handleSelect"
          >
            <el-sub-menu index="1">
              <template #title>
                <span>用户管理</span>
              </template>
              <el-menu-item index="1-1">普通用户</el-menu-item>
              <el-menu-item index="1-2">管理员</el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>
        <el-main>
          <div v-if="activeIndex==='1-1'">
            <el-table :data="regularUserFormData">
              <el-table-column prop="id" label="id"></el-table-column>
              <el-table-column prop="name" label="用户名"></el-table-column>
              <el-table-column prop="status" label="在线状态">
                <template #default="{ row }">
                <span :style="{ color: row.status === 'online' ? 'green' : 'red' }">
                  {{ row.status === 'online' ? '在线' : '离线' }}
                </span>
                </template>
              </el-table-column>
              <el-table-column label="强制下线">
                <template #default="{ row }">
                  <el-button v-if="row.status === 'online'" type="danger" @click="kickUser(row.name)">踢出</el-button>
                </template>
              </el-table-column>
              <el-table-column label="修改密码"></el-table-column>
            </el-table>
          </div>
          <div v-else-if="activeIndex==='1-2'">
            管理员用户列表
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>
<style scoped>

</style>