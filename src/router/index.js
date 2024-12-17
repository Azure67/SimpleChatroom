import { createRouter, createWebHistory } from 'vue-router';
import Login from '@/components/Login.vue';
import ChatRoom from '@/components/ChatRoom.vue';
import {useUserStore} from "@/store/index.js";

const routes = [
    {
        path: '/',
        name: 'Login',
        component: Login,
    },
    {
        path: '/chat',
        name: 'ChatRoom',
        component: ChatRoom,
        beforeEnter:(to,from,next)=>{
            const userStore = useUserStore()
            if (userStore.islogin){
                next()
            }else {
                ElMessage({
                    message: '请先登录',
                    type: 'error',
                })
                next('/')
            }
        }
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;