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
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config({path:path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.env")})
const IP=process.env.IP
const port = process.env.PORT
const app = express()
app.use(timeout('20m'))
const server = http.createServer(app);
const io = new Server(server,{
    cors:true,
    maxHttpBufferSize:5 * 1024 * 1024 * 1024
})
app.use(express.static('E:\\simpleChatroomFile'))
const sparkAiHistories={}
const sparkAiHistoriesToken= {}
const deepseek_chatHistory={}
const deepseek_chatHistoryToken={}
const deepseek_reasonerHistory={}
const deepseek_reasonerHistoryToken={}
const userMessageNumCount= {}
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
const isBase64=(text)=>{
    const base64Regex = /^data:image\/(png|jpg|jpeg|gif|webp);base64,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/;
    return base64Regex.test(text);
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

let proxyProcess = null;
let proxyInfo = null;
let proxyTimer = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 代理
const launchProxy = async () => {
    try {
        if (proxyInfo) {
            if (proxyTimer) {
                clearTimeout(proxyTimer);
            }
            proxyTimer = setTimeout(() => {
                if (proxyProcess) {
                    console.log('代理超时关闭');
                    proxyProcess.kill();
                    proxyProcess = null;
                    proxyInfo = null;
                }
            }, 2 * 60 * 60 * 1000);
            
            console.log('使用现有代理:', proxyInfo);
            return {
                ...proxyInfo,
                autoCloseTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString()
            };
        }
        
        const proxyPath = path.join(__dirname, '代理.py');
        if (!existsSync(proxyPath)) {
            throw new Error(`代理脚本不存在: ${proxyPath}`);
        }

        console.log('启动代理脚本:', proxyPath);
        const randomPort = Math.floor(Math.random() * (65535 - 1024) + 1024);
        
        return new Promise((resolve, reject) => {
            try {
                const pythonVersion = spawn('python', ['--version']);
                pythonVersion.on('error', (err) => {
                    console.error('Python未安装或不可用:', err);
                    reject(new Error('Python未安装或不可用'));
                });

                console.log('正在启动代理进程...');
                proxyProcess = spawn('python', [proxyPath], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                
                let errorOutput = '';
                let startupTimeout = setTimeout(() => {
                    console.error('代理启动超时');
                    reject(new Error('代理启动超时'));
                    if (proxyProcess) {
                        proxyProcess.kill();
                    }
                }, 10000);
                
                proxyProcess.stdout.on('data', (data) => {
                    const output = data.toString().trim();
                    console.log(`代理输出: ${output}`);
                    
                    if (output.startsWith('PROXY_STARTED:')) {
                        clearTimeout(startupTimeout);
                        const [ip, port] = output.split(':').slice(1);
                        proxyInfo = { ip, port: parseInt(port) };
                        console.log('代理启动成功:', proxyInfo);
                        
                        // 设置自动关闭定时器
                        proxyTimer = setTimeout(() => {
                            if (proxyProcess) {
                                console.log('代理超时关闭');
                                proxyProcess.kill();
                                proxyProcess = null;
                                proxyInfo = null;
                            }
                        }, 2 * 60 * 60 * 1000); // 2小时后自动关闭
                        
                        resolve({
                            ...proxyInfo,
                            autoCloseTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString()
                        });
                    } else if (output.startsWith('PROXY_ERROR:') || output.startsWith('STARTUP_ERROR:')) {
                        clearTimeout(startupTimeout);
                        const errorMsg = output.split(':')[1];
                        console.error('代理启动失败:', errorMsg);
                        reject(new Error(errorMsg));
                    }
                });

                proxyProcess.stderr.on('data', (data) => {
                    errorOutput += data;
                    console.error(`代理错误输出: ${data}`);
                });

                proxyProcess.on('error', (err) => {
                    clearTimeout(startupTimeout);
                    console.error('代理进程启动错误:', err);
                    reject(new Error(`代理启动失败: ${err.message}`));
                });

                proxyProcess.on('close', (code) => {
                    clearTimeout(startupTimeout);
                    console.log(`代理进程关闭，退出码: ${code}`);
                    if (code !== 0 && code !== null) {
                        console.error('代理异常退出');
                        console.error('错误输出:', errorOutput);
                        reject(new Error(`代理异常退出，退出码: ${code}`));
                    }
                    proxyProcess = null;
                    proxyInfo = null;
                    if(proxyTimer) {
                        clearTimeout(proxyTimer);
                        proxyTimer = null;
                    }
                });

                console.log('向代理发送配置...');
                proxyProcess.stdin.write('1\n');
                proxyProcess.stdin.write(`${randomPort}\n`);
                console.log('配置已发送');

            } catch (err) {
                console.error('启动代理时发生错误:', err);
                reject(err);
            }
        });
    } catch (err) {
        console.error('launchProxy 函数错误:', err);
        throw err;
    }
}

app.use(cors())
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
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
        
        // 新用户加入时，向所有用户发送最新的图表数据
        io.of('/groupChat').emit('getEchartsData', {
            sparkAiHistoriesToken,
            userMessageNumCount
        });
        
        sockets.forEach((value)=>{
            if (!value.username){
                value.emit('undefineClient')
            }
        })
    })
    socket.on('sendMsg', async (data) => {
        try {
            console.log('收到消息:', data);
            socket.broadcast.emit('getMsg', data);
            data.username in userMessageNumCount ? userMessageNumCount[data.username]+=1:userMessageNumCount[data.username]=1
            io.of('/groupChat').emit('getEchartsData',{sparkAiHistoriesToken,userMessageNumCount})
            if (data.msg_type === 4) {
                const model_type = data.content.split(' ')[0];
                const message = data.content.slice(model_type.length + 1).trim();
                console.log('机器人类型:', model_type);
                console.log('发送内容:', message);
                if (!message) {
                    io.of('/groupChat').emit('getMsg', {
                        id: Date.now(),
                        username: model_type.slice(1),
                        content: '请输入想提问的内容',
                        time: formatTime(new Date()),
                        is_HTML: false,
                        msg_type: 5
                    });
                    return;
                }

                try {
                    const response = await axios.post(`http://${IP}:${port}/getRobotMsg`, {
                        username: data.username,
                        model_type: model_type,
                        Msg: message
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 90000
                    });
                    
                    if (response.data && response.data.code === "0") {
                        io.of('/groupChat').emit('getMsg', {
                            id: Date.now(),
                            username: model_type.slice(1),
                            content: response.data.message.aiMsg,
                            time: formatTime(new Date()),
                            is_HTML: false,
                            msg_type: 5
                        });
                        if(model_type === "@星火大模型"){
                            io.of('/groupChat').emit('getMsg', {
                                id: Date.now(),
                                username: model_type.slice(1),
                                content:`### Token 消耗信息
                                - 用户信息消耗 token 数: ${response.data.message.token.prompt_tokens}
                                - 机器人信息消耗 token 数: ${response.data.message.token.completion_tokens}
                                - 本次回复总消耗 token 数:${response.data.message.token.total_tokens}`,
                                time: formatTime(new Date()),
                                is_HTML: false,
                                msg_type: 5
                            });
                        }

                    } else {
                        throw new Error(response.data.message || '机器人响应异常');
                    }
                } catch (err) {
                    console.error('机器人消息处理错误:', err);
                    console.error('错误详情:', {
                        message: err.message,
                        response: err.response?.data,
                        status: err.response?.status
                    });
                    
                    io.of('/groupChat').emit('getMsg', {
                        id: Date.now(),
                        username: model_type.slice(1),
                        content: `消息处理出错: ${err.response?.data?.message || err.message || '未知错误'}`,
                        time: formatTime(new Date()),
                        is_HTML: false,
                        msg_type: 5
                    });
                }
            }
        } catch (err) {
            console.error('sendMsg 事件处理错误:', err);
        }
    });

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
            const sqlquery = `SELECT * FROM user WHERE name = ?`;
            const sqlparams=[data.username]
            const results = await usequery(sqlquery,sqlparams);
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
        sparkAiHistories[socket.username]=[]
        console.log(getAllOnlineGroupMembers());
        io.of('/groupChat').emit('allUser', { userList: getAllOnlineGroupMembers() });
    })
    socket.on('requestEchartsData', () => {
        socket.emit('getEchartsData', {
            sparkAiHistoriesToken,
            userMessageNumCount
        });
    });
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
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'chatroom',
    connectionLimit: 10,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000,
});

const usequery = async (query,params=undefined) => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('获取连接错误:', err);
                reject(err);
                return;
            }
            const queryCallback=(error,results,field)=>{
                connection.release();
                if (error) {
                    console.error('查询执行错误:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            }
            if (params===undefined){
                connection.query(query,queryCallback)
            }else {
                connection.query(query,params,queryCallback)
            }
        });
    });
}
const getUserAvatar=async (user)=>{
    try {
        const results = await usequery(`select avatar from useravatar where name=?`,[user])
        if (results.length===0){
            console.log(`用户${user}没有头像`)
            return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAF8AXwDAREAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAgEBgcJAQMFAv/EAEYQAAEDAwIEAwQGCAMGBwEAAAEAAgMEBQYHEQgSITFBUWETInGBFDJCYpGhFSNScoKSscEkM6JDU2NzstEWFzSDk8Lhs//EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEB/9oADAMBAAIRAxEAPwDZ2gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd0BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA+CC3sm1BwbDYjLlWW2m17fYqKpjXn4M35j8ggxRkPGjopZHOjoay53mRu42oqMhpP70haEGPLvx/0gc5uP6azuH2X1txDT82sYf+pBa1bx56iTE/QsRsNMPDmM0h/6gg813HNq8TuLdjzB5ClkP/3QdkPHVqxGQZ7Nj0o/5Ejf6PQe5buPrKoyP0rp/aqhvj7CrkiJ/EOQXnZOPfB6ktZf8JvVvJ6F9PNFUtH48h/JBk3GeKLRDKCyODNqeglf0EdxY6m6/vP9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"
        }
        return results[0].avatar
    }catch (e) {
        console.error(`获取用户${user}头像失败:`,e)
    }
}
const setUserAvatar=async (username,avatar)=>{
    try {
        const alluser = await getAllDBUser()
        if (!alluser.includes(username)){
            return "该用户不存在"
        }
        if (!isBase64(avatar)){
            return "图片参数错误"
        }
        const avatarUserList=await usequery(`SELECT name FROM useravatar`)
        if (avatarUserList.map(user => user.name).includes(username)){
            await usequery(`update useravatar set avatar=? where name = ?`,[avatar,username])
            return "设置成功"
        }else {
            await usequery(`INSERT INTO useravatar(name,avatar) value(?,?)`,[username,avatar])
            return "设置成功"
        }
    }catch (e){
        console.error("设置用户头像出现错误:",e)
    }
}
const getSparkaiMsg = async (username, message) => {
    try {
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
            sparkAiHistoriesToken[username] = 0
        }

        const headers = getSparkAiHeaders(process.env.SPARK_API_KEY);
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                const response = await axios.post(
                    "https://spark-api-open.xf-yun.com/v1/chat/completions",
                    {
                        model: 'generalv3.5',
                        user: username,
                        messages: sparkAiHistories[username]
                    },
                    {
                        headers,
                        timeout: 60000  // 增加超时时间到60秒
                    }
                ).catch((err)=>{
                    console.log(`SparkAPI请求错误: ${err.message}`)
                });
                
                const aiMsg = response.data.choices[0].message.content;
                sparkAiHistories[username].push({
                    role: "assistant",
                    content: aiMsg
                });

                const totalTokens = parseInt(response.data.usage.total_tokens) || 0;
                if (!sparkAiHistoriesToken[username]) {
                    sparkAiHistoriesToken[username] = 0;
                }
                sparkAiHistoriesToken[username] += totalTokens;

                console.log('Token 统计:', sparkAiHistoriesToken);
                io.of('/groupChat').emit('getEchartsData', {
                    sparkAiHistoriesToken,
                    userMessageNumCount
                });

                return {
                    aiMsg: aiMsg,
                    token: response.data.usage
                };
                
            } catch (err) {
                retryCount++;
                console.error(`AI请求失败 (尝试 ${retryCount}/${maxRetries}):`, err.message);
                
                if (retryCount === maxRetries) {
                    throw new Error(`多次请求失败: ${err.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
        }
    } catch (err) {
        console.error('Spark AI 调用错误:', err);
        throw new Error(`AI服务暂时不可用: ${err.message}`);
    }
}
const checkInputPwd = async (username,password)=>{
    const qdata = await usequery(`select EXISTS(select * FROM user where name = ? and password = ?) as isExist`,[username,password])
    if (qdata[0].isExist == 0){
        return 1
    }else {
        return 0
    }
}
const getDeepseekMsg= async (username,message)=>{

}
// 是否是管理员
const isAdministrator = async (username)=>{
    const dbUserList = await getAllDBUser()
    if (!dbUserList.includes(username)){
        return false
    }
    const res = await usequery(`select permission from user where name=?`,[username])
    return res[0].permission !== 0
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
        const qdata = await usequery(`select * from user where name = ?`,[username])
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
        const qdata = await usequery(`INSERT into user(name,password,permission) VALUES(?,?,?)`,[username,password,0])
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
    const msg =await checkInputPwd(username,password)
    return res.status(200).send(JSON.stringify({
        code:200,
        msg:msg
    }))
})
// 更新用户权限的接口
// /updateUserPermission
// 传入用户名和权限
// username permission
// 权限 0 普通用户 1 管理员
// 返回 0 成功 1 失败
app.post('/updateUserPermission',async (req,res)=>{
    const username = req.body.username
    const permission = req.body.permission
    if (!username || !permission) {
        return res.status(400).send('Username and permission are required');
    }
    const qdata = await usequery(`UPDATE user SET permission = ? WHERE name = ?`,[permission,username])
    if (qdata.affectedRows > 0){
        return res.status(200).send(JSON.stringify({
            code:200,
            msg:0
        }))
    }else {
        return res.status(200).send(JSON.stringify({
            code:200,
            msg:1
        }))
    }
})
// 获取用户权限的接口
// /getUserPermission
// 传入用户名
// username
// 返回 0 普通用户 1 管理员
app.post('/getUserPermission',async (req,res)=>{
    const username = req.body.username
    if (!username) {
        return res.status(400).send('Username is required');
    }
    const qdata = await usequery(`SELECT permission FROM user WHERE name = ?`,[username])
    res.status(200).send(JSON.stringify({
        code:200,
        msg:qdata[0].permission
    }))
})
// 与机器人通信接口
// /getRobotMsg
// 返回 code 成功时0
//  message 机器人说的话
// 传入
// 用户名 username
// 机器人类型 model_type 星火大模型 deepseek-chat deepseek-reasoner  机器人
// 发送的信息 Msg
app.post('/getRobotMsg', async (req, res) => {
    try {
        const { username, model_type, Msg } = req.body;
        
        // 输入验证
        if (!username || !Msg) {
            return res.status(400).json({
                code: "1",
                message: '缺少必要参数：username 或 Msg'
            });
        }

        if (!model_type) {
            return res.status(400).json({
                code: "1",
                message: '缺少机器人类型'
            });
        }

        let robotMsg = "";
        
        if (model_type === "@星火大模型") {
            try {
                robotMsg = await getSparkaiMsg(username, Msg);
                if (!robotMsg) {
                    throw new Error('星火API返回空响应');
                }
            } catch (err) {
                console.error('星火API调用错误:', err);
                return res.status(500).json({
                    code: "1",
                    message: `星火API调用失败: ${err.message}`
                });
            }
        } else if (model_type === "@机器人") {
            try {
                if (Msg === "开启代理") {
                    const proxyInfo = await launchProxy();
                    if (proxyInfo && proxyInfo.ip && proxyInfo.port) {
                        return res.status(200).json({
                            code: "0",
                            message: {
                                aiMsg: `代理开启成功，地址为 ${proxyInfo.ip}:${proxyInfo.port}\n代理将在 ${proxyInfo.autoCloseTime} 自动关闭`
                            }
                        });
                    } else {
                        throw new Error('代理信息无效');
                    }
                } else if (Msg === "关闭代理") {
                    if (proxyProcess) {
                        proxyProcess.kill();
                        proxyProcess = null;
                        proxyInfo = null;
                        if (proxyTimer) {
                            clearTimeout(proxyTimer);
                            proxyTimer = null;
                        }
                    }
                    return res.status(200).json({
                        code: "0",
                        message: {aiMsg: "代理已关闭"}
                    });
                }
            } catch (err) {
                console.error('代理操作错误:', err);
                return res.status(500).json({
                    code: "1",
                    message: {aiMsg: `代理操作失败: ${err.message}`}
                });
            }
        } else {
            return res.status(200).json({
                code: "0",
                message:{aiMsg:"其他机器人暂未接入"}
            });
        }
        
        return res.status(200).json({
            code: "0",
            message: robotMsg
        });
        
    } catch (err) {
        console.error('getRobotMsg 路由错误:', err);
        return res.status(500).json({
            code: "1",
            message:{aiMsg:`服务器错误: ${err.message}`}
        });
    }
});
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
//管理员用户登录接口
// code为1登录失败 0登录成功
app.post('/superuserLogin',async (req,res)=>{
    const {username,password} = req.body
    if (!username || !password){
        return res.status(400).send(JSON.stringify({
            code:1,
            message:"缺少必要字段"
        }))
    }
    const msg =await checkInputPwd(username,password)
    if (msg===1){
        return res.status(200).send(JSON.stringify({
            code:msg,
            message: "账号或密码错误"
        }))
    }
    if (!await isAdministrator(username)){
        return res.status(200).send(JSON.stringify({
            code:1,
            message:"用户权限不足"
        }))
    }
    return res.status(200).send(JSON.stringify({
        code:msg,
        message: "登陆成功"
    }))
})
// 获取用户的头像
// 传入用户名 返回图片base64编码
app.post('/getUserAvatar',async (req,res)=>{
    const {username} = req.body
    if (!username){
        return res.status(400).json({
            code: "1",
            message: '缺少必要参数'
        });
    }
    const avatar =await getUserAvatar(username)
    return res.status(200).json({
        code:"0",
        avatar:avatar
    })
})
// 设置用户头像
// 传入头像的base64编码(avatar)和用户名(username)
app.post('/setUserAvatar',async (req,res)=>{
    const {username,avatar} = req.body
    if (!username || !avatar){
        return res.status(400).send(JSON.stringify({
            code:1,
            message:"缺少必要参数"
        }))
    }
    const message = await setUserAvatar(username,avatar)
    return res.status(200).send(JSON.stringify({
        code:0,
        message:message
    }))
})