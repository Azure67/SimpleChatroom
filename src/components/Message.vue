<script setup>
import {marked} from 'marked'
import {ref} from 'vue'
//消息类型
// 1 文字类型
// 2 图片类型
// 3 文件类型
// 4 向ai提问
// 5 ai发言
// 6 视频类型
const IP = "192.168.149.56";
const PORT="3000"
const props = defineProps({
  msg:Object,
})
const emit = defineEmits(['downloadFile'])
const showImageViewer = ref(false)
// MarkDown转Html未完成，暂时搁置
const MarkDownToHTML = (content)=>{
  console.log(content)
  return marked(content)
}
const downloadFile = () =>{
  emit('downloadFile',props.msg.fileSaveName,props.msg.fileShowName)
}
</script>

<template>
  <div class="message-username" v-if="props.msg.username">
    {{ props.msg.username }} <span class="message-time">{{ props.msg.time }}</span>
  </div>
  <div class="message-content" v-if="props.msg.msg_type===1">{{ props.msg.content }}</div>
  <div class="message-content" v-else-if="props.msg.msg_type===2">
    <el-image
        :src="props.msg.content"
        lazy
        class="thumbnail"
        :preview-src-list="[props.msg.content]"
        @click="showImageViewer=true"
    ></el-image>
  </div>
  <div class="message-content" v-else-if="props.msg.msg_type===3" @click="downloadFile">
    <div class="file">
      <div class="file-icon"></div>
      <div class="file-info">
        <span class="file-name">{{props.msg.fileShowName}}</span>
        <span class="file-size">{{ `${props.msg.fileSize}B` }}</span>
      </div>
    </div>
  </div>
  <div class="message-content" v-else-if="props.msg.msg_type===5" v-html="props.msg.content"></div>
  <div class="message-content" v-else-if="props.msg.msg_type===6">
    <video :src="`http://${IP}:${PORT}/${props.msg.fileSaveName}`" controls></video>
  </div>
  <div class="message-content" v-else v-html="props.msg.content"></div>
</template>

<style scoped>
.message-username {
  font-weight: bold;
}
.message-time {
  font-size: 12px;
  color: #888;
  margin-left: 5px;
}
.message {
  margin-bottom: 10px;
}
.file-icon {
  width: 40px;
  height: 40px;
  background-color: orange;
  display: inline-block;
  vertical-align: middle;
}
.file-info {
  display: inline-block;
  vertical-align: middle;
  margin-left: 10px;
}

.file-name {
  font-weight: bold;
  font-size: 18px;
}

.file-size {
  color: #666;
  font-size: 14px;
}
.thumbnail {
  width: 300px;
  height: auto;
  object-fit: cover;
}
</style>