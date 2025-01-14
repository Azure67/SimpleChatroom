const fn1 = (num,num2) =>{
    if (num<10){
        console.log(num)
        return fn1(num+num2)
    }
    return num
}
fn1(1,2)