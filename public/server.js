import express from "express";
import mysql from 'mysql'
import cors from 'cors'
import http from 'http'
import {Server} from 'socket.io'
import axios from "axios";
import multer from 'multer';
import path from 'path';
import {writeFile,readFile,existsSync,appendFile} from 'fs'
import timeout from 'connect-timeout'
import dotenv from 'dotenv'

dotenv.config()

const IP="192.168.149.56"
const app = express()
app.use(timeout('20m'))
const server = http.createServer(app);
const port = 3000
const io = new Server(server,{
    cors:true,
    maxHttpBufferSize:5 * 1024 * 1024 * 1024
})
app.use(express.static('E:\\simpleChatroomFile'))
const sparkAiHistories={}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'E:/simpleChatroomFile');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload=multer({storage:storage})
function sleep(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
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
app.use(cors())
app.use(express.json())
server.listen(port, () => {
    console.log(`Example app listening on http://localhost:${port}`)
})
io.of('/groupChat').on('connection',(socket)=>{
    const sockets = io.of('/groupChat').sockets
    socket.on('newUserJoin',async(data)=>{
        console.log(data.username)
        socket.username=data.username
        socket.broadcast.emit('userjoin',{name:data.username})
        // sleep(200)
        var userlist = getAllOnlineGroupMembers()
        var dbUserList = await getAllDBUser()
        console.log(userlist)
        if (!dbUserList.includes(data.username)){
            socket.emit('onlineUserNotExists')
            socket.disconnect()
        }
        io.of('/groupChat').emit('allUser', { userList: userlist });
        sockets.forEach((value)=>{
            if (!value.username){
                value.emit('undefineClient')
            }
        })
    })
    socket.on('sendMsg',async (data)=>{
        console.log(data)
        socket.broadcast.emit('getMsg',data)
        if (data.msg_type===4){
            const model_type =data.content.split(' ')[0]
            console.log(model_type)
            console.log(data.content.slice(model_type.length+1))
            const response = await axios.post(`http://${IP}:3000/getAiMsg`,{
                username:data.username,
                model_type:model_type,
                Msg:data.content.slice(model_type.length+1)
            })
            const aiMsg=response.data.message
            io.of('/groupChat').emit('getMsg', {
                id:Date.now(),
                username:model_type.slice(1),
                content:aiMsg,
                time:formatTime(new Date()),
                is_HTML:false,
                msg_type:5
            });
        }
    })

    socket.on('uploadChunk', (data, callback) => {
        const {fileMsg, chunk, chunkIndex, totalChunks} = data;
        const filePath = `E:\\simpleChatroomFile\\${fileMsg.fileSaveName}`;
        appendFile(filePath, Buffer.from(chunk), (err) => {
            if (err) {
                console.error('写入分片失败:', err);
                callback({success: false});
            } else {
                callback({success: true});
                if (chunkIndex === totalChunks - 1) {
                    socket.broadcast.emit('getMsg', {
                        id: fileMsg.id,
                        username: fileMsg.username,
                        time: fileMsg.time,
                        fileSaveName: fileMsg.fileSaveName,
                        fileShowName: fileMsg.fileShowName,
                        fileSize: fileMsg.fileSize,
                        is_HTML: false,
                        msg_type: fileMsg.msg_type
                    });
                }
            }
        });
    });
    socket.on('checkUserInDatabase', async (data) => {
        try {
            const sqlquery = `SELECT * FROM user WHERE name = '${data.username}'`;
            const results = await usequery(sqlquery);
            if (results.length === 0) {
                socket.emit('checkUserInDatabase', {
                    exists: 0,
                    message: '未找到用户'
                });
            }
        } catch (error) {
            console.error('Database query error:', error);
            socket.emit('checkUserInDatabase', {
                exists: 1,
                message: '数据库错误'
            });
        }
    });
    socket.on('downloadFile',(filepath,fileShowName)=>{
        console.log(`下载文件${filepath}`)
        readFile(`E:\\simpleChatroomFile\\${filepath}`,(err,data)=>{
            if (err) {
                console.error(err);
                return;
            }
            socket.emit('downloadFile',data,fileShowName)
        })
    })
    socket.on('disconnect',()=>{
        console.log(`${socket.username}客户端断开连接`)
        socket.broadcast.emit('levelChatroom',{
            name:socket.username
        })
        console.log(getAllOnlineGroupMembers());
        io.of('/groupChat').emit('allUser', { userList: getAllOnlineGroupMembers() });
    })
})

const getAllOnlineGroupMembers = () => {
    // console.log(io.of('/groupChat').sockets)
    // console.log(io.of('/groupChat').adapter.sids)
    const sockets = io.of('/groupChat').sockets
    const userList = []
    sockets.forEach((value)=>{
        userList.push(value.username)
    })
    return userList
};
const getAllDBUser = async () => {
    try {
        const results = await usequery('SELECT name FROM user');
        return results.map(user => user.name);
    } catch (error) {
        console.error('获取用户列表失败:', error);
        return [];
    }
}
const getSparkAiHeaders = (API_PASSWORD)=>{
    return  {
        'Authorization': `Bearer ${API_PASSWORD}`,
        'Content-Type': 'application/json',
    };
}
const getconn=()=>{
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '123456',
        database: 'chatroom'
    });
}
const usequery=async (query)=>{
    return new Promise((resolve, reject) => {
        const conn = getconn();
        conn.query(query,(error, results, fields) => {
            if (error) {
                console.error('Error executing query:', error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}
const getSparkaiMsg = async (username,message)=>{
    if (message.startsWith("设定角色")){
        sparkAiHistories[username]=[]
        sparkAiHistories[username].push({
            role: 'system', content: `${message}`
        })
        return "设定角色成功，并以清除历史记录"
    }
    if (username in sparkAiHistories){
        sparkAiHistories[username].push({
            role:"user",
            content:message
        })
        console.log(sparkAiHistories[username])
    }else {
        sparkAiHistories[username]=[]
        sparkAiHistories[username].push({
            role: 'system', content: '你是猫娘,回答问题时要经常加上喵~的字样，同时语气也是猫娘的语气，同时如果需要，叫用户主人'
        },)
        sparkAiHistories[username].push({
            role:"user",
            content:message
        })
    }
    const headers = getSparkAiHeaders(process.env.SPARK_API_KEY)
    // await axios.post("https://spark-api-open.xf-yun.com/v1/chat/completions",{
    //     model: 'generalv3.5',
    //     user: username,
    //     messages:sparkAiHistories[username]
    // },{headers}).then((response) => {
    //     console.log('Response:', response.data.choices[0].message.content);
    //     sparkAiHistories[username].push({
    //         role:"assistant",
    //         content:response.data.choices[0].message.content
    //     })
    //     return response.data.choices[0].message.content
    // })
    //     .catch(error => {
    //         console.error('Error:', error.response ? error.response.data : error.message);
    //         return "error"
    //     });
    try {
        const response = await axios.post("https://spark-api-open.xf-yun.com/v1/chat/completions",{
            model: 'generalv3.5',
            user: username,
            messages:sparkAiHistories[username]
        },{headers})
        const aiMsg=response.data.choices[0].message.content
        sparkAiHistories[username].push({
            role:"assistant",
            content:aiMsg
        })
        return aiMsg
    }catch (err){
        console.error('Error:', error.response ? error.response.data : error.message);
        return "error";
    }
}
// 查看在线用户
app.post('/getOnlineUser',async (req,res)=>{
    const onlineUsers = getAllOnlineGroupMembers()
    // console.log(onlineUsers)
    res.status(200).send(JSON.stringify(onlineUsers))
})
// 检测用户是否存在接口
// /checkUserExists
// 用存在返回1，不存在返回0
// 传入用户名 username
app.post('/checkUserExists', async (req, res) => {
    try {
        const username = req.body.username;
        if (!username) {
            return res.status(400).send('Username and password are required');
        }
        const qdata = await usequery(`select * from user where name = '${username}'`)
        if (qdata.length===0){
            res.status(200).send(JSON.stringify({
                code:200,
                msg:0
            }))
        }else {
            res.status(200).send(JSON.stringify({
                code:200,
                msg:1
            }))
        }
    }catch (e){
        console.log(e)
    }
})
// 用户注册接口
// /createUser
// 传入用户名和密码
// 注册成功返回0，失败返回1
// username password
app.post('/createUser', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        if (!username || !password) {
            return res.status(400).send('Username and password are required');
        }
        const qdata = await usequery(`INSERT into user(name,password) VALUES('${username}','${password}')`)
        if (qdata.affectedRows > 0){
            res.status(200).send(JSON.stringify({
                code:200,
                msg:0
            }))
        }else {
            res.status(200).send(JSON.stringify({
                code:200,
                msg:1
            }))
        }
    }catch (e){
        console.log(e)
    }
})
// 用户登录接口
// /userLogin
// 登录成返回0，失败返回1,用户已登录返回2
// 传入用户名和密码
// username password
app.post('/userLogin',async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    const onlineUsers = getAllOnlineGroupMembers()
    let isLogin = false
    onlineUsers.forEach((value)=>{
        if (value===username){
            isLogin=true
        }
    })
    if (isLogin){
        return res.status(200).send(JSON.stringify({
            code:200,
            msg:2
        }))
    }
    const qdata = await usequery(`select EXISTS(select * FROM user where name = '${username}' and password = '${password}') as isExist`)
    if (qdata[0].isExist == 0) {
        return res.status(200).send(JSON.stringify({
            code:200,
            msg:1
        }))
    }else {
        return res.status(200).send(JSON.stringify({
            code:200,
            msg:0
        }))
    }
})
// 与ai通信接口
// /getAiMsg
// 返回 code 成功时0
//  message ai说的话
// 传入
// 用户名 username
// 大模型 model_type   1 星火大模型   2.通义千问   3 kimi
// 发送的信息 Msg
app.post('/getAiMsg',async (req,res)=>{
    const username = req.body.username
    const model_type = req.body.model_type || "1"
    const message = req.body.Msg
    let aiMsg = ""
    if (!username || !message) {
        return res.status(400).send('Username or message are required');
    }
    if (model_type==="@星火大模型"){
        aiMsg = await getSparkaiMsg(username,message)
    }else {
        aiMsg="其他ai暂未接入"
    }
    return res.status(200).send(JSON.stringify({
        code:"0",
        message:aiMsg
    }))
})
//上传文件接口(废弃，改用socket传输)
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.status(200).send('File uploaded successfully.');
}, (error, req, res, next) => { // 错误处理中间件
    console.error(error);
    res.status(500).send('Server error during file upload.');
});
//检查上传是否完成接口
//传入文件存贮名 fileSaveName
// 返回1代表不存在，返回0代表存在
app.post('/chickFile',async(req,res)=>{
    const filepath = req.body.fileSaveName
    if (existsSync(filepath)) {
        return res.status(200).send(JSON.stringify({
            code:0
        }))
    }else {
        return res.status(200).send(JSON.stringify({
            code:1
        }))
    }
} )