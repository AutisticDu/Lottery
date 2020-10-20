// const fs = require('fs');
// fs.readFile('测试/截止时间/dy.json',(err,data) =>{
//     if (err) {
//         return;
//     }
//     JSON.parse(data).data.cards.forEach(Card => {
//         if (typeof JSON.parse(Card.card).origin !== 'undefined') {
//             console.log(Card.card);
//         }
//     });
// })
const {HttpRequest} = require('../../node/HttpRequest');
HttpRequest({
    type: 'GET',
    _url: 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice',
    _query_string: {
        dynamic_id:'44038911455642960'
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Cookie: '',
    },
    success: chunk => {
        const res = JSON.parse(chunk);
        if (res.code === 0) {
            const timestamp10 = res.data.lottery_time,
                timestamp13 = timestamp10*1000,
                time = new Date(timestamp13);
                console.log(timestamp10);
            const remain = (()=>{
                const timestr = ((timestamp13 - Date.now())/86400000).toString(),
                    timearr = timestr.replace(/(\d+)\.(\d+)/,"$1,0.$2").split(',');
                return `${timearr[0]}天余${parseInt(timearr[1]*24)}小时`
            })();
            console.log(`开奖时间: ${time.toLocaleString()} 还有${remain}`);
        } else {
            console.warn('获取开奖信息失败')
        }
        // let time = JSON.parse(chunk).data.lottery_time
        // console.log(JSON.parse(chunk),time,new Date(time*1000).toLocaleString())
    }
})
//https://t.bilibili.com/448114983336506983 动态



// const timestamp10 = res.data.lottery_time,
// timestamp13 = timestamp10*1000,
// time = new Date(timestamp13);
// const remain = (()=>{
// const timestr = ((timestamp13 - Date.now())/86400000).toString(),
//     timearr = timestr.replace(/(\d+)\.(\d+)/,"$1,0.$2").split(',');
// return `${timearr[0]}天余${parseInt(timearr[1]*24)}小时`
// })();
// resolve(`开奖时间: ${time.toLocaleString()} 还有${remain}`);