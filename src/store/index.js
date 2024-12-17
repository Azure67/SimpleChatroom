import {defineStore} from "pinia";
import {ref} from "vue";

export const useUserStore = defineStore('user', () => {
    const username = ref('')
    const msgList=ref([])
    const islogin=ref(false)
    const setname = (name) => {
        username.value = name
    }
    const setMsgList=(msg)=>{
        msgList.value = msg
    }
    const setlogin = (login) => {
        islogin.value = login
    }
    return{setname, username,setlogin,islogin,msgList,setMsgList}
},{persist:true})