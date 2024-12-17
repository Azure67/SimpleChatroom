<script setup>
defineProps({
  msg:Object
})
</script>

<template>
  <div class="message-username" v-if="msg.username">
    {{ msg.username }} <span class="message-time">{{ msg.time }}</span>
  </div>
  <div class="message-content" v-if="!is_HTML">{{ msg.content }}</div>
  <div class="message-content" v-else v-html="msg.content"></div>
</template>

<style scoped>
.message-username {
  font-weight: bold;
}
</style>