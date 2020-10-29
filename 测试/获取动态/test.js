const fs = require('fs');
fs.readFile('测试/获取动态/allclass.json',(err,data) =>{
    if (err) {
        return;
    } else {
        let res = JSON.parse(data.toString())
        res.data.cards.forEach(element => {
            console.log(element.desc.type,element.desc.orig_type);
        });
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