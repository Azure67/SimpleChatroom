import OpenAI from "openai";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({path:path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.env")})
const DEEPSEEK_API_KEY=process.env.DEEPSEEK_API_KEY
const tools=[]

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: `${DEEPSEEK_API_KEY}`,
    timeout:240000
});

const userContexts = new Map();
const MAX_CONTEXT_MESSAGES = 10;

function getUserContext(userId) {
    if (!userContexts.has(userId)) {
        userContexts.set(userId, []);
    }
    return userContexts.get(userId);
}

function addMessageToContext(userId, message) {
    const context = getUserContext(userId);
    context.push(message);
    if (context.length > MAX_CONTEXT_MESSAGES) {
        const firstNonSystemIndex = context.findIndex(msg => msg.role !== 'system');
        if (firstNonSystemIndex !== -1) {
            context.splice(firstNonSystemIndex, 1);
        }
    }
    
    userContexts.set(userId, context);
}

async function getDeepseekMsg(model, message, userId) {
    if (!model || !message) {
        return "缺少必要的字段";
    }
    
    if (!userId) {
        userId = "default";
    }
    
    let deepseel_model = "";
    if (model == "v3") {
        deepseel_model = "deepseek-chat";
    } else if (model == "r1") {
        deepseel_model = "deepseek-reasoner";
    } else {
        return "模型参数不合法";
    }

    const newMessage = {
        role: "user",
        content: message
    };

    const contextMessages = getUserContext(userId);
    let fullMessages = [...contextMessages];
    
    fullMessages.push(newMessage);

    const response = await openai.chat.completions.create({
        model: deepseel_model,
        messages: fullMessages,
        tool_choice:'auto',
        tools:tools
    });

    addMessageToContext(userId, newMessage);
    
    const assistantMessage = {
        role: "assistant",
        content: response.choices[0].message.content
    };
    addMessageToContext(userId, assistantMessage);
    
    return {
        "reasoning_content": response.choices[0].message.reasoning_content,
        "content": response.choices[0].message.content
    };
}

function clearUserContext(userId) {
    userContexts.delete(userId);
    return { success: true, message: `已清除用户 ${userId} 的对话上下文` };
}

// 获取特定用户的上下文
function getUserContextHistory(userId) {
    return getUserContext(userId);
}

function setSystem(userId,Msg){
    clearUserContext(userId);
    userContexts.set(userId,[{"role":"system","content":Msg}])
}

function setSystemPrompt(userId, systemMessage) {
    if (!userId || !systemMessage) {
        return { success: false, message: "缺少必要参数" };
    }
    clearUserContext(userId);
    const systemMsg = {
        role: "system",
        content: systemMessage
    };
    
    userContexts.set(userId, [systemMsg]);
    return { success: true, message: "系统提示词设置成功" };
}

export { getDeepseekMsg, clearUserContext, getUserContextHistory, setSystemPrompt };