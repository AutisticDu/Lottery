(function () {
    const Ajax = (() => {
        'use strict';
        /**
         * 发送Get请求
         * @param {Object} options
         */
        function get(options) {
            if (checkOptions(options)) {
                let xhr = new XMLHttpRequest();
                let url = options.url
                    , queryStringsObj = options.queryStringsObj;
                if (typeof queryStringsObj === 'object') {
                    url = url + '?' + objToURLCode(queryStringsObj);
                }
                xhr.open("GET", url);
                if (options.hasCookies) {
                    xhr.withCredentials = true;
                }
                xhr.timeout = 3000;
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        options.success(xhr.responseText)
                    } else {
                        throw new Error(`status = ${xhr.status}`)
                    }
                }
                )
                xhr.addEventListener('error', () => {
                    throw new Error('xhr请求出错')
                }
                )
                xhr.addEventListener('timeout', () => {
                    throw new Error('请求超时')
                }
                )
                xhr.send()
            }
        }
        /**
         * 发送Post请求
         * @param {object} options
         */
        function post(options) {
            if (checkOptions(options)) {
                let xhr = new XMLHttpRequest();
                let data = options.data;
                let dataType = options.dataType
                xhr.open("POST", options.url);
                xhr.setRequestHeader('Content-Type', dataType);
                if (options.hasCookies) {
                    xhr.withCredentials = true;
                }
                xhr.timeout = 3000;
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        options.success(xhr.responseText)
                    } else {
                        throw new Error(`status = ${xhr.status}`)
                    }
                }
                )
                xhr.addEventListener('error', () => {
                    throw new Error('xhr请求出错')
                }
                )
                xhr.addEventListener('timeout', () => {
                    throw new Error('请求超时')
                }
                )
                let body = (/urlencoded/.test(dataType)) ? objToURLCode(data) : data;
                xhr.send(body)
            }
        }
        /**
         * 检查options是否符合要求
         * @param {object} options
         * @returns {boolean}
         */
        function checkOptions(options) {
            let result = false;
            if (typeof options !== 'object') {
                console.warn('类型错误: typeof Options !== Object');
                return result;
            } else {
                if (typeof options.url !== 'string') {
                    console.warn('类型错误: typeof Link !== Strings');
                    return result;
                } else {
                    const reg = /^https?:\/\/(?:\w+\.?)+(?:\/.*)*\/?$/i;
                    if (!reg.test(options.url)) {
                        console.warn('url字符串须为完整http链接');
                        return result;
                    }
                    result = true;
                }
            }
            return result;
        }
        /**
         * 对象转URL编码
         * @param {object} data
         */
        function objToURLCode(data) {
            var _result = [];
            for (var key in data) {
                var value = data[key];
                if (value instanceof Array) {
                    value.forEach(function (_value) {
                        _result.push(key + "=" + _value);
                    });
                } else {
                    _result.push(key + '=' + value);
                }
            }
            return _result.join('&');
        }
        return {
            'get': get,
            'post': post
        };
    }
    )();
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
        const offset = /(?<=offset":")[0-9]*/.exec(res)[0], /* 字符串防止损失精度 */
            next = {
            has_more: Data.has_more,
            next_offset: offset
        };
        /**
         * 储存获取到的一组动态中的信息
         */
        let array = [];
        if (next.has_more === 0) {
            console.log('动态数据读取完毕');
        } else {
            /**
             * 空动态无cards
             */
            const Cards = Data.cards;
            Cards.forEach(onecard => {
                let obj = {}, /* 储存单个动态中的信息 */
                    desc = onecard.desc,
                    card = onecard.card;
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
            });
        }
        return {
            modifyDynamicResArray: array,
            nextinfo: next
        };
    }
    Ajax.get({
        url: 'https://api.vc.bilibili.com/topic_svr/v1/topic_svr/topic_new',
        queryStringsObj: {
            topic_id: 3230836
        },
        hasCookies: false,
        success: responseText => {
            let res = JSON.parse(responseText);
            res.data.cards.forEach(card => {
                console.log(card.desc.topic_board_desc);
            });
            console.log(res.data.offset);
            Ajax.get({
                url: 'https://api.vc.bilibili.com/topic_svr/v1/topic_svr/topic_history',
                queryStringsObj: {
                    topic_name: '互动抽奖',
                    offset_dynamic_id: res.data.offset
                },
                hasCookies: false,
                success: responseText => {
                    // console.log(responseText);
                    console.log(modifyDynamicRes(responseText));
                }
            })
        }
    })
})()