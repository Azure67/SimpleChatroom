<script setup>
import {ref, watch} from 'vue'
import VMdPreview from '@kangc/v-md-editor/lib/preview'
import '@kangc/v-md-editor/lib/style/preview.css'
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js'
import '@kangc/v-md-editor/lib/theme/style/github.css'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import hljs from 'highlight.js'
import markdownItKatex from 'markdown-it-katex'

VMdPreview.use(githubTheme, {
  Hljs: hljs,
  extend(md) {
    md.use(markdownItKatex)
  }
})

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
const videoUrl = ref('')
const isDownloading = ref(false)

watch(() => props.msg.progress, (newVal) => {
  if(props.msg.msg_type === 6 && newVal === 100) {
    videoUrl.value = `http://${IP}:${PORT}/${props.msg.fileSaveName}`
  }
})

if(props.msg.msg_type === 6 && (!props.msg.progress || props.msg.progress === 100)) {
  videoUrl.value = `http://${IP}:${PORT}/${props.msg.fileSaveName}`
}

const downloadFile = () =>{
  if(isDownloading.value) {
    return
  }
  isDownloading.value = true
  
  emit('downloadFile', props.msg.fileSaveName, props.msg.fileShowName)

  setTimeout(() => {
    isDownloading.value = false 
  }, 10000)
}
</script>

<template>
  <div class="message-username" v-if="props.msg.username">
    {{ props.msg.username }} <span class="message-time">{{ props.msg.time }}</span>
  </div>
  <div class="message-content" v-if="props.msg.is_HTML" v-html="props.msg.content"></div>
  <div class="message-content" v-else-if="props.msg.msg_type===1">{{ props.msg.content }}</div>
  <div class="message-content" v-else-if="props.msg.msg_type===2">
    <el-image
        :src="props.msg.content"
        lazy
        class="thumbnail"
        :preview-teleported="true"
        :initial-index="0"
        fit="cover"
        :preview-src-list="[props.msg.content]"
    ></el-image>
  </div>
  <div class="message-content" v-else-if="props.msg.msg_type===3" @click="downloadFile">
    <div class="file" :class="{'downloading': isDownloading}">
      <div class="file-icon"></div>
      <div class="file-info">
        <span class="file-name">{{props.msg.fileShowName}}</span>
        <span class="file-size">{{ `${props.msg.fileSize}B` }}</span>
        <span v-if="isDownloading" class="downloading-text">下载中...</span>
      </div>
    </div>
  </div>
  <div class="message-content markdown-content" v-else-if="props.msg.msg_type===5">
    <v-md-preview :text="props.msg.content"></v-md-preview>
  </div>
  <div class="message-content" v-else-if="props.msg.msg_type===6">
    <video v-if="videoUrl" :src="videoUrl" controls></video>
    <div v-else class="uploading-tip">视频上传中...</div>
  </div>
  <div class="message-content" v-else >{{ props.msg.content }}</div>
</template>

<style scoped>
.message-username {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  font-size: 14px;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
  font-weight: normal;
}

.message-content {
  background-color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 16px;
  max-width: 80%;
  word-break: break-word;
  line-height: 1.5;
  transition: all 0.3s ease;
}

.message-content:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.markdown-content :deep(.v-md-editor) {
  background: transparent;
  border: none;
  padding: 0;
}

.markdown-content :deep(.v-md-editor__preview-wrapper) {
  padding: 0;
}

.markdown-content :deep(.katex) {
  font-size: 1.1em;
}

.file {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.file:hover {
  background: #ecf5ff;
}

.file.downloading {
  cursor: not-allowed;
  opacity: 0.7;
}

.downloading-text {
  color: #409EFF;
  font-size: 13px;
  margin-left: 8px;
}

.file-icon {
  width: 48px;
  height: 48px;
  background-color: #ff9800;
  border-radius: 6px;
  position: relative;
}

.file-icon::after {
  content: '';
  position: absolute;
  top: 12px;
  left: 12px;
  width: 24px;
  height: 24px;
  background-color: rgba(255,255,255,0.8);
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z'/%3E%3C/svg%3E") no-repeat center;
}

.file-info {
  margin-left: 16px;
  flex: 1;
}

.file-name {
  display: block;
  font-weight: 500;
  font-size: 16px;
  color: #303133;
  margin-bottom: 4px;
}

.file-size {
  color: #909399;
  font-size: 13px;
}

.thumbnail {
  max-width: 300px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.thumbnail:hover {
  transform: scale(1.02);
}

video {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.uploading-tip {
  color: #909399;
  text-align: center;
  padding: 20px;
}
</style>