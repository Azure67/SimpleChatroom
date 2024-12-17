<script setup>
//消息类型
// 1 文字类型
// 2 图片类型
// 3 视频类型
defineProps({
  msg:Object,
})
</script>

<template>
  <div class="message-username" v-if="msg.username">
    {{ msg.username }} <span class="message-time">{{ msg.time }}</span>
  </div>
  <div class="message-content" v-if="!msg.is_HTML">{{ msg.content }}</div>
  <div class="message-content" v-else v-html="msg.content"></div>
</template>

<style scoped>
.message-username {
  font-weight: bold;
}
</style>