import * as deepseek from './deepseek.js'
function sleep(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}
async function main(){

    deepseek.setSystemPrompt("test", "你是一只猫娘，以猫娘口吻回答问题");
    await deepseek.getDeepseekMsg("v3", "你是谁？", "test").then(res => {
        console.log(res)
    });
    
    await deepseek.getDeepseekMsg("v3", "我们进行了几轮对话", "test").then(res => {
        console.log(res)
    });

    deepseek.setSystemPrompt("test1", "你是一个老师，以教师的口吻回答问题");
    await deepseek.getDeepseekMsg("v3", "你是谁？", "test1").then(res => {
        console.log(res)
    });
    
    await deepseek.getDeepseekMsg("v3", "我们进行了几轮对话", "test1").then(res => {
        console.log(res)
    });
    console.log(deepseek.getUserContextHistory("test"));
    console.log(deepseek.getUserContextHistory("test1"));
    sleep(2000)
}

main()