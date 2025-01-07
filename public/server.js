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

let proxyProcess = null;
let proxyInfo = null;
let proxyTimer = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const launchProxy = async () => {
    try {
        if (proxyInfo) {
            console.log('使用现有代理:', proxyInfo);
            return proxyInfo;
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
                        
                        proxyTimer = setTimeout(() => {
                            if(proxyProcess) {
                                console.log('代理超时关闭');
                                proxyProcess.kill();
                                proxyProcess = null;
                                proxyInfo = null;
                            }
                        }, 12 * 60 * 60 * 1000);
                        
                        resolve(proxyInfo);
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
    socket.on('sendMsg', async (data) => {
        try {
            console.log('收到消息:', data);
            socket.broadcast.emit('getMsg', data);
            
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
                        timeout: 30000
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
        sparkAiHistories[socket.username]=[]
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

const usequery = async (query) => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('获取连接错误:', err);
                reject(err);
                return;
            }

            connection.query(query, (error, results, fields) => {
                // 释放连接回连接池
                connection.release();

                if (error) {
                    console.error('查询执行错误:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    });
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
                );
                
                const aiMsg = response.data.choices[0].message.content;
                sparkAiHistories[username].push({
                    role: "assistant",
                    content: aiMsg
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
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
        }
    } catch (err) {
        console.error('Spark AI 调用错误:', err);
        throw new Error(`AI服务暂时不可用: ${err.message}`);
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
        const qdata = await usequery(`INSERT into user(name,password,permission) VALUES('${username}','${password}','${0}')`)
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
    const qdata = await usequery(`UPDATE user SET permission = '${permission}' WHERE name = '${username}'`)
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
    const qdata = await usequery(`SELECT permission FROM user WHERE name = '${username}'`)
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
// 机器人类型 model_type   星火大模型   机器人
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
                if(Msg=="开启代理"){
                const proxyInfo = await launchProxy();
                if (proxyInfo && proxyInfo.ip && proxyInfo.port) {
                    return res.status(200).json({
                        code: "0",
                        message:{aiMsg:`代理开启成功，地址为 ${proxyInfo.ip}:${proxyInfo.port}`} 
                    });
                } else {
                    throw new Error('代理信息无效');
                }}else if(Msg=="关闭代理"){
                    if (proxyProcess) {
                        proxyProcess.kill();
                        proxyProcess = null;
                        proxyInfo = null;
                        proxyTimer = null;
                    }
                    return res.status(200).json({
                        code: "0",
                        message:{aiMsg:"代理已关闭"}
                    });
                }
            } catch (err) {
                console.error('代理启动错误:', err);
                return res.status(500).json({
                    code: "1",
                    message:{aiMsg:`代理启动失败: ${err.message}`}
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