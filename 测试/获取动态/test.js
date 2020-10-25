const fs = require('fs');
fs.readFile('测试/获取动态/example.json',(err,data) =>{
    if (err) {
        return;
    } else {
        let res = JSON.parse(data.toString())
        console.log( JSON.parse(JSON.parse(res.data.cards[0].card).origin).user.name )
        // res.data.cards.forEach(element => {
        //     try {
        //         console.log( JSON.parse(element.card).origin_user.info.uname )
        //         console.log( /互动抽奖/.test(JSON.parse(JSON.parse(element.card).origin).item.description) )
        //         console.log( JSON.parse(element.card).origin_extension )
        //         // console.log('\n');
        //     } catch (error) {
        //         console.log('非lottery');
        //     }
        // });
    }
})