<script setup>
import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue';
import {User, Files, UploadFilled, Picture, DocumentAdd} from "@element-plus/icons-vue"
import {useUserStore} from "@/store/index.js";
import {useRouter} from "vue-router";
import io from 'socket.io-client';
import data from "emoji-mart-vue-fast/data/all.json";
import "emoji-mart-vue-fast/css/emoji-mart.css";
import {EmojiIndex, Picker} from "emoji-mart-vue-fast/src";
import axios from "axios";

const user_button = ref()
const FileUpload = ref()
const PicUpload=ref()
const PictureList=ref([])
const FileList=ref([])
const emojiIndex = new EmojiIndex(data)
const showEmojiDialog = ref(false)
const IP = "192.168.149.56";
const PORT="3000"
const is_HTML = ref(false);
const aiUserList=ref(['星火大模型'])
const router = useRouter();
const userStore = useUserStore();
const messages = ref(userStore.msgList || []);
const inputMessage = ref('');
const messageContainer = ref(null);
const Socket = io(`http://${IP}:${PORT}/groupChat`, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
const userList=ref([])
const showUserDrawer=ref(false)
const userMsgShowList=ref([])
const mention_options=ref([])
const showFileDialog=ref(false)
const showPictureDialogInFileDialog=ref(false)
const showFileDialogInFIleDialog=ref(false)

const CHUNK_SIZE = 1024 * 1024;

const handlePaste = async (e) => {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = item.getAsFile();
      const file = new File([blob], `clipboard_${Date.now()}.png`, { type: 'image/png' });
      if (showPictureDialogInFileDialog.value) {
        const reader = new FileReader();
        reader.onload = (e) => {
          PictureList.value.push({
            raw: file,
            name: file.name,
            uid: Date.now(),
            url: e.target.result
          });
        };
        reader.readAsDataURL(file);
      } else {
        showFileDialog.value = true;
        showPictureDialogInFileDialog.value = true;
        await nextTick();
        const reader = new FileReader();
        reader.onload = (e) => {
          PictureList.value.push({
            raw: file,
            name: file.name,
            uid: Date.now(),
            url: e.target.result
          });
        };
        reader.readAsDataURL(file);
      }
    }
  }
};

const getMention_options=()=>{
  userList.value.forEach((value)=>{
    console.log(value)
    console.log(userStore.username)
    if (value!==userStore.username){
      mention_options.value.push({
        label:value,
        value:value,
      })
    }
  })
  aiUserList.value.forEach((value)=>{
    mention_options.value.push({
      label:value,
      value:value,
    })
  })
  console.log(mention_options.value)
}
const getUserCountData = () => {
  const data = {};
  messages.value.forEach(value => {
    if (value.username){
      if (data.hasOwnProperty(value.username)) {
        data[value.username].count++;
      } else {
        data[value.username] = { count: 1 };
      }
    }
  });
  userMsgShowList.value = Object.keys(data).map(key => {
    return {
      name: key,
      count: data[key].count
    };
  });
};
const insertemoji=(emoji)=>{
  inputMessage.value+=emoji.native
}
const formatTime = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
function sleep(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
const exitChat = () => {
  userStore.setlogin(false);
  userStore.setname('');
  userStore.setMsgList([])
  Socket.close();
  router.push('/');
  ElMessage.success("退出登录成功")
};

const sendMessage = () => {
  if (inputMessage.value.trim() === '') return;
  const currentTime = new Date();
  let msg_type=1
  messages.value.push({
    id: Date.now(),
    username: userStore.username,
    content: inputMessage.value,
    time: formatTime(currentTime),
    is_HTML:is_HTML.value,
    msg_type:msg_type
  });
  aiUserList.value.forEach((value)=>{
    if (inputMessage.value.startsWith(`@${value}`)){
      msg_type=4
    }
  })
  sendMsgToSocket(Date.now(), userStore.username, inputMessage.value, formatTime(currentTime),is_HTML.value,msg_type);
  inputMessage.value = '';
  getUserCountData();
  scrollToBottom();
};
const fileHandleChange=(file, fileList)=>{
  if (file.raw.type.startsWith("image")) {
    ElMessage.error("不能上传图片")
    FileList.value = fileList.filter(f => f.uid !== file.uid)
    return
  }
  FileList.value=fileList
}
const fileHandleRemove=(file)=>{
  FileList.value = FileList.value.filter(f => f.uid !== file.uid)
}
const picHandleChange=(file,fileList)=>{
  console.log(file)
  console.log(fileList)
  if (file.raw.type.startsWith("image")){
    ElMessage.success("上传成功")
    const reader = new FileReader();
    reader.onload = (e) => {
      const existingFile = PictureList.value.find(f => f.uid === file.uid);
      if (existingFile) {
        existingFile.url = e.target.result;
      } else {
        PictureList.value.push({
          ...file,
          url: e.target.result
        });
      }
    };
    reader.readAsDataURL(file.raw);
  }else {
    ElMessage.error("只能上传图片类型")
    PictureList.value = fileList.filter(f => f.uid !== file.uid)
  }
}
const picHandleRemove=(file)=>{
  PictureList.value = PictureList.value.filter(f => f.uid !== file.uid)
}
const submitFile=()=>{
  console.log(FileList.value)
  FileList.value.forEach((file)=>{
    if (!file.raw.type.startsWith("image")){
      sendVideoOrFile(file)
    }else {
      ElMessage.error("包含图片文件！")
    }
  })
  FileUpload.value?.clearFiles()
  showFileDialog.value=false
  showFileDialogInFIleDialog.value=false
}

const sendVideoOrFile = async (file) => {
  console.log(file.raw.name)
  const ftime = Date.now()
  const fileSize = file.raw.size
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
  
  const fileMsg = {
    id: ftime,
    username: userStore.username,
    time: formatTime(new Date()),
    fileSaveName: userStore.username + ftime + file.raw.name,
    fileShowName: file.raw.name,
    fileSize: fileSize,
    is_HTML: false,
    msg_type: file.raw.type.startsWith("video") ? 6 : 3,
    progress: 0
  }
  messages.value.push(fileMsg)

  try {
    for(let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, fileSize)
      const chunk = file.raw.slice(start, end)
      
      const reader = new FileReader()
      const chunkData = await new Promise((resolve, reject) => {
        reader.onload = e => resolve(e.target.result)
        reader.onerror = e => reject(e)
        reader.readAsArrayBuffer(chunk)
      })

      await new Promise((resolve, reject) => {
        Socket.emit('uploadChunk', {
          fileMsg,
          chunk: chunkData,
          chunkIndex: i,
          totalChunks
        }, response => {
          if(response.success) {
            const msgIndex = messages.value.findIndex(m => m.id === ftime)
            if(msgIndex !== -1) {
              messages.value[msgIndex].progress = Math.floor((i + 1) * 100 / totalChunks)
              if(messages.value[msgIndex].progress === 100) {
                // 传输完成后删除进度属性
                delete messages.value[msgIndex].progress
                nextTick(() => {
                  scrollToBottom()
                })
              }
            }
            resolve()
          } else {
            reject(new Error('Upload chunk failed'))
          }
        })
      })

      await sleep(100)
    }

    ElMessage.success("文件发送成功")
  } catch(err) {
    console.error(err)
    ElMessage.error("文件发送失败")
    messages.value = messages.value.filter(m => m.id !== ftime)
  }
}

const submitPic=()=>{
  const files = PictureList.value
  console.log(files);
  files.forEach((file)=>{
    if (file.raw.type.startsWith("image")){
      sendPictures(file)
    }
  })
  PicUpload.value?.clearFiles()
  showFileDialog.value=false
  showPictureDialogInFileDialog.value=false
}
const picToBase64 = (pic) =>{
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsDataURL(pic.raw);
  });
}
const sendPictures =async (file) =>{
  const base64 =await picToBase64(file)
  const message = {
    id:Date.now(),
    username:userStore.username,
    content:base64,
    time:formatTime(new Date()),
    is_HTML:false,
    msg_type:2
  }
  messages.value.push(message)
  sendMsgToSocket(message.id,message.username,message.content,message.time,message.is_HTML,message.msg_type);
  scrollToBottom()
}
const downloadFile = (fileSaveName,fileShowName) =>{
  Socket.emit("downloadFile",fileSaveName,fileShowName)
}
Socket.on('downloadFile', (fileBuffer,fileShowName) => {
  const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileShowName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
});
Socket.on("userjoin", (data) => {
  console.log(`${data.name} joined`);
  messages.value.push({
    id: Date.now(),
    content: `${data.name}加入了聊天室`,
    time: formatTime(new Date()),
  });
  scrollToBottom();
});

Socket.on("levelChatroom", (data) => {
  messages.value.push({
    id: Date.now(),
    content: `${data.name}离开了聊天室`,
    time: formatTime(new Date()),
  });
  scrollToBottom();
});

const sendMsgToSocket = (id, username, content, time,is_HTML,Type) => {
  Socket.emit("sendMsg", {
    id: id,
    username: username,
    content: content,
    time: time,
    is_HTML:is_HTML,
    msg_type:Type
  });
};
Socket.on("allUser",(data)=>{
  console.log(data.userList)
  userList.value.map((value)=>{
    if (!value){
      return value
    }
  })
  userList.value=data.userList
  console.log(userList.value)
  getUserCountData()
  mention_options.value=[]
  getMention_options()
})
Socket.on("getMsg", (data) => {
  messages.value.push(data);
  scrollToBottom();
  getUserCountData()
});
Socket.on('undefineClient',()=>{
  ElMessage.error("账号登录凭证失效,请重新登录");
  userStore.setlogin(false);
  userStore.setname('');
  userStore.setMsgList([]);
  router.push('/');
})
Socket.on('onlineUserNotExists',()=>{
  ElMessage.error("非法进入");
  userStore.setlogin(false);
  userStore.setname('');
  userStore.setMsgList([]);
  router.push('/');
})

Socket.on('reconnect', () => {
  ElMessage.success('重连成功')
})

Socket.on('reconnect_failed', () => {
  ElMessage.error('重连失败,请刷新页面')
})
Socket.on("checkUserInDatabase",(data)=>{
  userStore.setlogin(false);
  userStore.setname('');
  userStore.setMsgList([])
  Socket.close();
  router.push('/');
  if (data.exists===0){
    ElMessage.error("非法手段进入")
  }else {
    ElMessage.error("数据库错误，请联系管理员")
  }
})
const scrollToBottom = () => {
  if (messageContainer.value) {
    nextTick(() => {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    });
  }
};
watch(messages,(nv,ov)=>{
  userStore.setMsgList(nv)
},{deep:true})
onMounted(() => {
  Socket.emit("checkUserInDatabase",{username: userStore.username})
  Socket.emit("newUserJoin", {
    username: userStore.username
  });
  getUserCountData()
  scrollToBottom();
  window.addEventListener('paste', handlePaste);
});
onUnmounted(() => {
  Socket.close();
  window.removeEventListener('paste', handlePaste);
});
</script>
<template>
  <div class="chat-container">
    <header class="chat-header">
      <el-button class="exit-button" @click="exitChat" text>Exit</el-button>
      <div class="chat-title">Chatroom</div>
      <el-button class="user-button" ref="user_button" @click="showUserDrawer=true">
        <el-icon><User /></el-icon>
        {{`当前人数:${userList.length}`}}
      </el-button>
    </header>

    <el-drawer v-model="showUserDrawer" direction="rtl" size="400px">
      <div class="drawer-content">
        <div class="statistics-container">
          <el-statistic title="在线人数" :value="userList.length"></el-statistic>
          <el-statistic title="消息总数" :value="messages.length"></el-statistic>
        </div>
        <el-table :data="userMsgShowList" :default-sort="{prop:'count',order:'descending'}" class="user-table">
          <el-table-column prop="name" label="用户名"></el-table-column>
          <el-table-column prop="count" label="发言次数" sortable></el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <div class="chat-messages" ref="messageContainer">
      <div class="message" v-for="msg in messages" :key="msg.id">
        <Message @downloadFile="downloadFile" :msg="msg"></Message>
        <el-progress 
          v-if="msg.progress !== undefined" 
          :percentage="msg.progress"
          :format="percent => percent === 100 ? '' : `${percent}%`"
          class="upload-progress"
          :stroke-width="8"
          :status="msg.progress === 100 ? 'success' : ''"
        />
      </div>
    </div>

    <div class="chat-input-container">
      <el-mention 
        v-model="inputMessage" 
        :options="mention_options" 
        @keyup.enter="sendMessage" 
        class="chat-input"
        placeholder="输入消息..."
      />
      
      <div class="action-buttons">
        <el-button @click="showFileDialog=true" class="action-btn">
          <el-icon><Files /></el-icon>
        </el-button>
        <el-button @click="showEmojiDialog=true" class="action-btn">emoji</el-button>
        <el-switch v-model="is_HTML" class="html-switch" title="渲染HTML信息"/>
        <el-button type="primary" @click="sendMessage" class="send-btn">发送</el-button>
      </div>
    </div>

    <el-dialog v-model="showFileDialog" class="file-dialog" width="60%">
      <div class="dialog-buttons">
        <div class="dialog-btn-group">
          <el-button class="dialog-btn" @click="showPictureDialogInFileDialog=true">
            <el-icon class="dialog-icon"><Picture /></el-icon>
          </el-button>
          <span class="dialog-text">发送图片</span>
        </div>
        <div class="dialog-btn-group">
          <el-button class="dialog-btn" @click="showFileDialogInFIleDialog=true">
            <el-icon class="dialog-icon"><DocumentAdd /></el-icon>
          </el-button>
          <span class="dialog-text">发送文件/视频</span>
        </div>
      </div>

      <el-dialog v-model="showPictureDialogInFileDialog" append-to-body width="70%" class="upload-dialog">
        <el-upload
          class="upload-area"
          ref="PicUpload"
          drag
          :action="`http://${IP}:${PORT}/upload`"
          :auto-upload="false"
          :on-change="picHandleChange"
          :on-remove="picHandleRemove"
          list-type="picture"
          :file-list="PictureList"
          multiple
        >
          <el-icon class="upload-icon"><upload-filled /></el-icon>
          <div class="upload-text">
            拖拽文件到此处或点击上传
          </div>
        </el-upload>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitPic">上传图片</el-button>
        </div>
      </el-dialog>

      <el-dialog v-model="showFileDialogInFIleDialog" append-to-body width="70%" class="upload-dialog">
        <el-upload
          ref="FileUpload"
          class="upload-area"
          drag
          :action="`http://${IP}:${PORT}/upload`"
          :on-change="fileHandleChange"
          :on-remove="fileHandleRemove"
          :auto-upload="false"
          :file-list="FileList"
          multiple
        >
          <el-icon class="upload-icon"><upload-filled /></el-icon>
          <div class="upload-text">
            <p>拖拽文件到此处或点击上传</p>
            <p class="upload-hint">建议文件大小不超过5GB</p>
          </div>
        </el-upload>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitFile">上传文件/视频</el-button>
        </div>
      </el-dialog>
    </el-dialog>

    <el-dialog v-model="showEmojiDialog" class="emoji-dialog" width="400px">
      <Picker :data="emojiIndex" set="apple" @select="insertemoji"></Picker>
    </el-dialog>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.chat-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #303133;
}

.exit-button,
.user-button {
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  scroll-behavior: smooth;
}

.message {
  margin-bottom: 1rem;
  animation: fadeIn 0.3s ease;
}

.upload-progress {
  margin-top: 0.5rem;
  border-radius: 4px;
}

.chat-input-container {
  display: flex;
  gap: 1rem;
  padding: 1rem 2rem;
  background-color: #fff;
  box-shadow: 0 -2px 12px 0 rgba(0,0,0,0.1);
}

.chat-input {
  flex: 1;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.action-btn {
  padding: 0.5rem;
}

.send-btn {
  min-width: 80px;
}

.drawer-content {
  padding: 1rem;
}

.statistics-container {
  display: flex;
  justify-content: space-around;
  margin-bottom: 2rem;
}

.user-table {
  width: 100%;
}

.file-dialog .dialog-buttons {
  display: flex;
  justify-content: center;
  gap: 4rem;
  margin: 2rem 0;
}

.dialog-btn-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.dialog-btn {
  width: 180px;
  height: 180px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.dialog-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.dialog-icon {
  font-size: 4rem;
  color: #409eff;
}

.dialog-text {
  font-size: 1.4rem;
  color: #606266;
  margin-top: 1rem;
}

.upload-dialog {
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.upload-area {
  flex: 1;
  width: 95%;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  padding: 2rem;
  text-align: center;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-text {
  color: #606266;
}

.upload-hint {
  color: #f56c6c;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.dialog-footer {
  text-align: center;
  margin-top: 1rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.el-upload-list) {
  margin-top: 1rem;
  max-height: 50vh;
  overflow-y: auto;
}

:deep(.el-dialog__body) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>