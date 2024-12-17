import {defineStore} from "pinia";
import {ref} from "vue";

export const useUserStore = defineStore('user', () => {
    const username = ref('')
    const islogin=ref(false)
    const setname = (name) => {
        username.value = name
    }
    const setlogin = (login) => {
        islogin.value = login
    }
    return{setname, username,setlogin,islogin}
},{persist:true})