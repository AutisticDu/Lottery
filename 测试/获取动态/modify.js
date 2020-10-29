const fs = require('fs');
fs.readFile('测试/获取动态/tagdy.json',(err,data) =>{
    if (err) {
        return;
    } else {
        const obj = modifyDynamicRes(data.toString())
        console.log(obj.modifyDynamicResArray[2].description,/#.*奖.*#/.exec(obj.modifyDynamicResArray[2].description))
    }
})
/**
 * 互动抽奖
 * 处理来自动态页面的数据
 * @param {String} res
 * @returns {
    {
        modifyDynamicResArray: {
            uid: number;
            uname: string;
            rid_str: string;
            dynamic_id: string;
            description?: string;
            tag?: string[]
            hasOfficialLottery: boolean;
            type?: '视频或其他';
            origin_uid: number;
            origin_uname: string;
            origin_rid_str: string;
            origin_dynamic_id: string;
            origin_description: string;
            origin_hasOfficialLottery: boolean;
            origin_type?: '视频或其他';
        }[];
        nextinfo: {
            has_more: number;
            next_offset: string;
        };
    } | null
} 返回对象,默认为null
 */
function modifyDynamicRes(res) {
    const strToJson = JSON.parse,
        jsonRes = strToJson(res),
        Data = jsonRes.data;
    if (jsonRes.code !== 0) {
        console.warn('获取动态数据出错');
        return null;
    }
    const offset = typeof Data.offset === 'string'
        ? Data.offset
        : /(?<=next_offset":)[0-9]*/.exec(res)[0], /* 字符串防止损失精度 */
        next = {
            has_more: Data.has_more,
            next_offset: offset
        };
    /**
     * 储存获取到的一组动态中的信息
     */
    let array = [];
    if (next.has_more === 0) {
        // Tooltip.log('动态数据读取完毕');
    } else {
        /**
         * 空动态无cards
         */
        const Cards = Data.cards;
        Cards.forEach(onecard => {
            /**临时储存单个动态中的信息 */
            let obj = {};
            const desc = onecard.desc,
                card = onecard.card,
                // display = onecard.display,
                userinfo = desc.user_profile.info,
                cardToJson = strToJson(card);
            obj.uid = userinfo.uid; /* 转发者的UID */
            obj.uname = userinfo.uname;/* 转发者的name */
            obj.rid_str = desc.rid_str;/* 用于发送评论 */
            obj.type = desc.type /* 动态类型 */
            obj.orig_type = desc.orig_type /* 源动态类型 */
            obj.dynamic_id = desc.dynamic_id_str; /* 转发者的动态ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
            obj.hasOfficialLottery = (typeof onecard.extension === 'undefined') ? false : true; /* 是否有官方抽奖 */
            if (obj.type !== 1) {
                try {
                    obj.description = cardToJson.item.description; /* 转发者的描述 */
                } catch (error) {
                    obj.description = '';
                }
            } else {
                obj.origin_uid = desc.origin.uid; /* 被转发者的UID */
                obj.origin_rid_str = desc.origin.rid_str /* 被转发者的rid(用于发评论) */
                obj.origin_dynamic_id = desc.orig_dy_id_str; /* 被转发者的动态的ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
                obj.origin_hasOfficialLottery = (typeof cardToJson.origin_extension === 'undefined') ? false : true; /* 是否有官方抽奖 */
                try {
                    obj.origin_uname = strToJson(cardToJson.origin).user.name; /* 被转发者的name */
                    obj.origin_description = strToJson(cardToJson.origin).item.description; /* 被转发者的描述 */
                } catch (error) {
                    obj.origin_description = '';
                }
            }
            array.push(obj);
        });
    }
    return {
        modifyDynamicResArray: array,
        nextinfo: next
    };
}