<script setup>
import { ref, nextTick, onMounted, onUnmounted,watch } from 'vue';
import { useUserStore } from "@/store/index.js";
import { useRouter } from "vue-router";
import io from 'socket.io-client';
import data from "emoji-mart-vue-fast/data/all.json";
import "emoji-mart-vue-fast/css/emoji-mart.css";
import { Picker, EmojiIndex } from "emoji-mart-vue-fast/src";
import axios from "axios";

const user_button = ref()
const emojiIndex = new EmojiIndex(data)
const showEmojiDialog = ref(false)
const IP = "192.168.149.56";
const is_HTML = ref(false);
const router = useRouter();
const userStore = useUserStore();
const messages = ref(userStore.msgList || []);
const inputMessage = ref('');
const messageContainer = ref(null);
const Socket = io(`http://${IP}:3000/groupChat`);
const audioDOM = ref(null)
const userList=ref([])
const showUserDrawer=ref(false)

const playaudio=()=>{
  audioDOM.value.play();
}
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

const exitChat = () => {
  userStore.setlogin(false);
  userStore.setname('');
  userStore.setMsgList([])
  Socket.close();
  router.push('/');
};

const sendMessage = () => {
  if (inputMessage.value.trim() === '') return;
  const currentTime = new Date();
  const msh_type=null
  messages.value.push({
    id: Date.now(),
    username: userStore.username,
    content: inputMessage.value,
    time: formatTime(currentTime),
    is_HTML:is_HTML.value,
    msh_type:null
  });
  sendMsgToSocket(Date.now(), userStore.username, inputMessage.value, formatTime(currentTime),is_HTML.value,msh_type);
  inputMessage.value = '';

  scrollToBottom();
};

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
  userList.value=data.userList
})
Socket.on("getMsg", (data) => {
  messages.value.push({
    id: data.id,
    username: data.username,
    content: data.content,
    time: data.time,
    is_HTML:data.is_HTML,
    msg_type:data.msg_type
  });
  playaudio()
  scrollToBottom();
});

const scrollToBottom = () => {
  if (messageContainer.value) {
    nextTick(() => {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    });
  }
};

watch(messages,(nv,ov)=>{
  console.log(nv)
  userStore.setMsgList(nv)
},{deep:true})
onMounted(() => {
  const audioDom = ref(null)
  audioDOM.value=audioDom.value

  Socket.emit("newUserJoin", {
    username: userStore.username
  });
});
onUnmounted(() => {
  Socket.close();
});
</script>
<template>
  <audio ref="audioDom" src="../../audio/notification-pluck-on-slower-269285.mp3"></audio>
  <div class="chat-container">
    <span>
      <el-button class="exit-button" @click="exitChat" text>Exit</el-button>
      <div class="chat-title">Chatroom</div>
      <el-button class="user-button" ref="user_button" @click="showUserDrawer=true">{{`当前人数:${userList.length}`}}</el-button>
      <el-drawer v-model="showUserDrawer">
        {{userList}}
      </el-drawer>
    </span>
    <div class="chat-messages" ref="messageContainer">
      <div class="message" v-for="msg in messages" :key="msg.id">
<!--        <div class="message-username" v-if="msg.username">-->
<!--          {{ msg.username }} <span class="message-time">{{ msg.time }}</span>-->
<!--        </div>-->
<!--        <div class="message-content" v-if="!is_HTML">{{ msg.content }}</div>-->
<!--        <div class="message-content" v-else v-html="msg.content"></div>-->
        <Message :msg="msg"></Message>
      </div>
    </div>
    <div class="chat-input-container">
      <el-input
          type="text"
          placeholder="send a message..."
          v-model="inputMessage"
          @keyup.enter="sendMessage"
      />
      <el-button @click="showEmojiDialog=true" style="margin-right: 10px;">emoji</el-button>
      <el-dialog v-model="showEmojiDialog" style="width: 400px">
        <Picker :data="emojiIndex" set="apple" @select="insertemoji"></Picker>
      </el-dialog>
      <el-switch v-model="is_HTML" style="margin-right: 10px;" title="渲染HTML信息"></el-switch>
      <el-button type="primary" @click="sendMessage">Send</el-button>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}

.exit-button {
  position: absolute;
  top: 20px;
  left: 20px;
}
.user-button{
  position: absolute;
  top: 20px;
  right: 20px;
}
.chat-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  padding: 20px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background-color: #f9f9f9;
}

.message {
  margin-bottom: 10px;
}

.message-username {
  font-weight: bold;
}

.chat-input-container {
  display: flex;
  align-items: center;
  padding: 10px;
}

.el-input {
  flex: 1;
  margin-right: 10px;
}
</style>