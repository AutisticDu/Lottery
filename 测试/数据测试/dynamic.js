const { HttpRequest } = require('../../node/HttpRequest');
function strToJson(params) {
    let isJSON = str => {
        if (typeof str === 'string') {
            try {
                var obj = JSON.parse(str);
                if (typeof obj === 'object' && obj) {
                    return true;
                } else {
                    return false;
                }
            } catch (e) {
                console.error('error：' + str + '!!!' + e);
                return false;
            }
        }
        console.error('It is not a string!')
    }
    if (isJSON(params)) {
        let obj = JSON.parse(params);
        return obj
    }
}
function modifyDynamicRes(res) {
    const jsonRes = strToJson(res),
        Data = jsonRes.data;
    if (jsonRes.code !== 0) {
        console.warn('获取动态数据出错');
        return null;
    }
    /**
     * 储存获取到的一组动态中的信息
     */
    let array = [];
    /**
     * 空动态无cards
     */
    try {
        const Card = Data.card;
        let obj = {}, /* 储存单个动态中的信息 */
            desc = Card.desc,
            card = Card.card;
        /**
         * 转化后的字符串形式的Json数据
         */
        const cardToJson = strToJson(card);
        obj.uid = desc.uid; /* 转发者的UID */
        obj.dynamic_id = desc.dynamic_id_str; /* 转发者的动态ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
        obj.uname = desc.user_profile.info.uname; /* 转发者的用户名 */
        if (desc.orig_dy_id_str === '0') {
            try {
                obj.description = cardToJson.item.description; /* 转发者的描述 */
            } catch (error) {
                obj.type = '视频或其他';
                console.log('视频动态')
            }
        } else {
            obj.origin_uid = desc.origin.uid; /* 被转发者的UID */
            obj.origin_dynamic_id = desc.orig_dy_id_str; /* 被转发者的动态的ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
            try {
                obj.description = cardToJson.item.content; /* 转发者的描述 */
                obj.origin_description = strToJson(cardToJson.origin).item.description; /* 被转发者的描述 */
            } catch (error) {
                obj.origin_type = '视频或其他';
                console.log('转发的视频')
            }
        }
        array.push(obj);
    } catch (error) {
        array = '无'
    }
    return {
        modifyDynamicResArray: array,
    };
}
function sumStrings(a,b){
    var res='', c=0;
    a = a.split('');
    b = b.split('');
    while (a.length || b.length || c){
        c += ~~a.pop() + ~~b.pop();
        res = c % 10 + res;
        c = c>9;
    }
    return res.replace(/^0+/,'');
}
next('445551377489986742');
function next(id) {
    HttpRequest({
        type: 'GET',
        _url: 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail',
        _query_string: {
            dynamic_id: id
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
            Accept: 'application/json, text/plain, */*',
            Cookie: "",
        },
        success: chunk => {
            console.log(modifyDynamicRes(chunk).modifyDynamicResArray[0]);
            next(sumStrings('445551377489986742','1'));
        },
    })
}