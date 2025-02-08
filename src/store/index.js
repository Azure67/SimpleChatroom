import {defineStore} from "pinia";
import {ref} from "vue";
import axios from "axios";

const IP = import.meta.env.VITE_IP;
const PORT=import.meta.env.VITE_PORT;

export const useUserStore = defineStore('user', () => {
    const username = ref('')
    const msgList=ref([])
    const islogin=ref(false)
    const userAvatar=ref({})

    const loadAllAvatars = async (userList) => {
        for (const name of userList) {
            await loadUserAvatar(name);
        }
    }

    const loadUserAvatar = async (name) => {
        if (!userAvatar.value[name]) {
            try {
                const response = await axios.post(`http://${IP}:${PORT}/getUserAvatar`, {
                    username: name
                });
                if (response.data.code === "0") {
                    userAvatar.value[name] = response.data.avatar;
                }
            } catch (err) {
                console.error(`获取用户 ${name} 头像失败:`, err);
                userAvatar.value[name] = getDefaultAvatar();
            }
        }
    }

    const getDefaultAvatar = () => {
        return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAF8AXwDAREAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAgEBgcJAQMFAv/EAEYQAAEDAwIEAwQGCAMGBwEAAAEAAgMEBQYHEQgSITFBUWETInGBFDJCYpGhFSNScoKSscEkM6JDU2NzstEWFzSDk8Lhs//EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEB/9oADAMBAAIRAxEAPwDZ2gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd0BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA+CC3sm1BwbDYjLlWW2m17fYqKpjXn4M35j8ggxRkPGjopZHOjoay53mRu42oqMhpP70haEGPLvx/0gc5uP6azuH2X1txDT82sYf+pBa1bx56iTE/QsRsNMPDmM0h/6gg813HNq8TuLdjzB5ClkP/3QdkPHVqxGQZ7Nj0o/5Ejf6PQe5buPrKoyP0rp/aqhvj7CrkiJ/EOQXnZOPfB6ktZf8JvVvJ6F9PNFUtH48h/JBk3GeKLRDKCyODNqeglf0EdxY6m6/vP9380GTqG4W+506au219PVwPG7ZYJWyMcPRzSQgqEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEFJdbRar5RPt15ttNXUsn14aiJsjD/C4EIMHZvwYaRZQ6SqsMFVjVW/r/gpC+Dfz9k/cD4NIQYKy3gZ1Os5fNjF3tN+gG/KznNNP/K/du/wcgxLkWiurGKlxven97ijZ3ljpHTR/HnZuPzQWbNDLA8xzxPieO7XtLSPkUHx127ICAgIK+2WC+3qUQWey3Cvkcdg2mpnyk/ygoMkY1wua35M5hhwmot8T/8AaXF7aYD4h3vfkgzJh3ARUFzKjPc3iaO7qa1RFx+BlkA/JpQZ/wATh90l079nNYMRppK1m3+Nrd6ifceIL9w0/ugIMjDp0AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEDcjqEHn3HH7DeGlt2slBWg9/pFMyT/qggtis0S0huBLqvTfH3k9yKFjT/AKQEHnP4cdDnnc6aWf5McP6OQdkHDzolTnmj00se4/agLv6koPct+lum1pIdbcDsFO4di23xb/jsguSnp6ekjEVJBHCwfZjYGj8Ag7EBAQEBAQEBAQEBAQEBAQEBAQEBAQEHw6WJh2fI1p8idkH2gICAgICAgICAgICAgICAgICAgIOsygv8AZM6nbqR9lBROZzMfC5p9tzg799xv3RSD2jZHMjkADzsDyd9vyQfbg2km5XEexn6H0d5/D/8AEFRTRPhaYyByg+6fREdyAgICAgICAgICAgICAgICAgICAgIOsygv9kzqdupH2UFGHwwlzKmNzn8x6gE7hB6CAgICAgICAgICAgICAgICAgICCikqpfpDoQQGhwG47osfD5X04liiOwDunmN+qD7qRyQxTNJ5hsN9/AhEfdVAxkG7eYBg2AB2CLj7p4Io4xsNyR1J6lEd6AgICAgICAgICAgICAgICAgICAgIKKSql+kOhBAaHAbjuix8PlfTiWKI7AO6eY36oKpsMb42OewOPKOpRH//2Q==";
    }

    const getAvatar = (name) => {
        return userAvatar.value[name] || getDefaultAvatar();
    }

    const setname = (name) => {
        username.value = name
    }
    
    const setMsgList=(msg)=>{
        msgList.value = msg
    }
    
    const setlogin = (login) => {
        islogin.value = login
    }
    
    const setAvatar = (avatar) => {
        userAvatar.value[username.value] = avatar;
    }

    const refreshAvatar = async (name) => {
        try {
            const response = await axios.post(`http://${IP}:${PORT}/getUserAvatar`, {
                username: name
            });
            if (response.data.code === "0") {
                userAvatar.value[name] = response.data.avatar;
            }
        } catch (err) {
            console.error(`刷新用户 ${name} 头像失败:`, err);
        }
    }

    return{
        setname, 
        username,
        setlogin,
        islogin,
        msgList,
        setMsgList,
        getAvatar,
        setAvatar,
        loadAllAvatars,
        loadUserAvatar,
        refreshAvatar
    }
}, {
    persist: {
        enabled: true,
        strategies: [
            {
                key: 'user-store',
                storage: localStorage,
                paths: ['username', 'islogin', 'msgList', 'userAvatar']
            }
        ]
    }
})