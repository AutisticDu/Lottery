// ==UserScript==
// @name         Bili动态抽奖助手(测试专用)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  自动参与B站"关注转发抽奖"活动
// @author       shanmite
// @include      /^https?:\/\/space\.bilibili\.com/[0-9]*/
// @license      GPL
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// ==/UserScript==
(async function () {
    "use strict"
    const Script = {
        version: '|version: 3.5.3',
        author: '@shanmite',
        UIDs: [],
        TAGs: [
            '抽奖',
            ]
    }
    /**
     * 基础工具
     */
    const Base = {
        /**
         * 安全的将JSON字符串转为对象
         * 超出精度的数转为字符串
         * @param {string} params
         * @return {object}
         * 返回对象
         */
        strToJson: params => {
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
        },
        /**
         * 函数柯里化
         * @param {function} func
         * 要被柯里化的函数
         * @returns {function}
         * 一次接受一个参数并返回一个接受余下参数的函数
         */
        curryify: func => {
            function _c(restNum, argsList) {
                return restNum === 0 ?
                    func.apply(null, argsList) :
                    function (x) {
                        return _c(restNum - 1, argsList.concat(x));
                    };
            }
            return _c(func.length, []);
        },
        /**
         * 延时函数
         * @param {number} time ms
         * @returns {Promise<void>}
         */
        delay: time => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve()
                }, time)
            })
        },
        /**
         * 随机获取字符串数组中的字符串
         * @param {string[]} arr
         * @returns {string}
         */
        getRandomStr: arr => {
            return arr[parseInt(Math.random()*arr.length)]
        },
        /**
         * 生成一段文档片段
         * @param {
            {
                tagname: string;
                attr?: {
                    [index: string]:string
                };
                script?: (el: Element) => void;
                text?: string;
                children?: DocumentFragment[];
            }
        } StructInfo
         * @returns {DocumentFragment}
         */
        creatCompleteElement: (StructInfo) => {
            const { tagname, attr, script, text, children } = StructInfo;
            if (typeof tagname !== 'string') throw new TypeError('at tagname');
            let frg = document.createDocumentFragment();
            const el = document.createElement(tagname);
            if (typeof text === 'string' && text !== '') el.textContent = text;
            if (typeof attr === 'object') {
                Object.entries(attr).forEach(([key, value]) => {
                    el.setAttribute(key, value);
                })
            }
            if (typeof script === 'function') script(el);
            if (children instanceof Array) {
                children.forEach(child => {
                    if (child instanceof DocumentFragment) el.appendChild(child)
                });
            }
            frg.appendChild(el);
            return frg;
        },
        storage: {
            /**
             * 获取本地值
             * @param {string} key
             * @returns {Promise<string>}
             */
            get: async key=> {
                if (typeof GM === 'undefined') {
                    return localStorage.getItem(key)
                } else {
                    // eslint-disable-next-line no-undef
                    return await GM.getValue(key)
                }
            },
            /**
             * 
             * @param {string} key
             * @param {string} value 
             */
            set: async (key,value)=>{
                if (typeof GM === 'undefined') {
                    localStorage.setItem(key,value);
                    return;
                } else {
                    // eslint-disable-next-line no-undef
                    await GM.setValue(key,value)
                    return;
                }
            }
        }
    }
    /**
     * 浮动提示框
     */
    const Tooltip = (() => {
        const creatCompleteElement = Base.creatCompleteElement,
        cssContent = ".shanmitelogbox {z-index:99999;position:fixed;top:0;right:0;max-width:400px;max-height:600px;overflow-y:scroll;scroll-behavior:smooth;}.shanmitelogbox::-webkit-scrollbar {width:0;}.shanmitelogbox .line {display:flex;justify-content:flex-end;}.shanmitelogbox .Info {line-height:26px;min-height:26px;margin:6px 0;border-radius:6px;padding:0px 10px;transition:background-color 1s;font-size:16px;color:#fff;box-shadow:1px 1px 3px 0px #000;}.shanmitelogbox .Log {background-color:#81ec81;}.shanmitelogbox .Warn {background-color:#fd2d2d;}",
        /** 显示运行日志 */
        LogBox = creatCompleteElement({
            tagname: 'div',
            attr: {
                class: 'shanmitelogbox',
            },
            children: [
                creatCompleteElement({
                    tagname: 'style',
                    attr: {
                        type: 'text/css'
                    },
                    text: cssContent,
                })
            ]
        });
        document.body.appendChild(LogBox);
        const logbox = document.querySelector('.shanmitelogbox');
        /**
         * 打印信息的公共部分
         * @param {string} classname 
         * @param {string} text 
         */
        const add = (classname, text) => {
            const log = creatCompleteElement({
                tagname: 'div',
                attr: {
                    class: 'line',
                },
                script: el => {
                    setTimeout(() => {
                        logbox.removeChild(el)
                    }, 6000)/* 自动移除 */
                },
                children: [
                    creatCompleteElement({
                        tagname: 'span',
                        attr: {
                            class: classname,
                        },
                        script: el => {
                            setTimeout(() => {
                                el.style.color = 'transparent';
                                el.style.backgroundColor = 'transparent';
                                el.style.boxShadow = 'none';
                            }, 5000);/* 显示5秒 */
                        },
                        text: text,
                    })
                ]
            });
            logbox.appendChild(log);
        },
        module = {
            /**
             * 提示信息
             * @param {string} text 
             */
            log: text => {
                console.log(text);
                add('Info Log', text)
            },
            /**
             * 警告信息
             * @param {string} text 
             */
            warn: text => {
                console.warn(text);
                add('Info Warn', text)
            }
        }
        return module;
    })()
    /**
     * 默认设置
     */
    let config = {
        model: '11',/* both */
        maxday: '', /* 不限 */
        scan_time: '1800000', /* 30min */
        wait: '20000', /* 20s */
        relay: ['转发动态'],
        chat: [
            '[OK]', '[星星眼]', '[歪嘴]', '[喜欢]', '[偷笑]', '[笑]', '[喜极而泣]', '[辣眼睛]', '[吃瓜]', '[奋斗]',
            '永不缺席 永不中奖 永不放弃！', '万一呢', '在', '冲吖~', '来了', '万一', '[保佑][保佑]', '从未中，从未停', '[吃瓜]', '[抠鼻][抠鼻]',
            '来力', '秋梨膏', '[呲牙]', '从不缺席', '分子', '可以', '恰', '不会吧', '1', '好',
            'rush', '来来来', 'ok', '冲', '凑热闹', '我要我要[打call]', '我还能中！让我中！！！', '大家都散了吧，已经抽完了，是我的', '我是天选之子', '给我中一次吧！',
            '坚持不懈，迎难而上，开拓创新！', '[OK][OK]', '我来抽个奖', '中中中中中中', '[doge][doge][doge]', '我我我',
        ],
    }
    let configstr = await Base.storage.get('config');
    if (typeof configstr === 'undefined') {
        await Base.storage.set('config', JSON.stringify(config));
        Tooltip.log('设置修改成功');
    } else {
        config = JSON.parse(configstr);
    }
    /**
     * 事件总线
     */
    const eventBus = (() => {
        const eTarget = new EventTarget()
            , module = {
                /**
                 * 监听事件
                 * @param {string} type
                 * @param {(e: CustomEvent<string>) => void} fn
                 * @example fn:
                 * ({ detail }) => detail;
                 * (e) => e.detail
                 * @param {boolean | AddEventListenerOptions} [opt]
                 */
                on: (type, fn, opt) => {
                    eTarget.addEventListener(type, fn, opt);
                },
                /**
                 * 取消监听事件
                 * @param {string} type
                 * @param {(e: CustomEvent<string>) => void} fn 
                 * @param {boolean | AddEventListenerOptions} [opt]
                 */
                off: (type, fn, opt) => {
                    eTarget.removeEventListener(type, fn, opt);
                },
                /**
                 * 触发事件
                 * @param {string} type
                 * @param {string} [detail]
                 */
                emit: (type, detail) => {
                    const event = new CustomEvent(type, { detail });
                    eTarget.dispatchEvent(event);
                }
            }
        return module;
    })()
    /**
     * 贮存全局变量
     */
    const GlobalVar = (() => {
        const [myUID,csrf] = (()=>{
            const a = /((?<=DedeUserID=)\d+).*((?<=bili_jct=)\w+)/g.exec(document.cookie);
            return [a[1],a[2]]
        })(),
        module = {
            /**自己的UID*/
            myUID,
            /**防跨站请求伪造*/
            csrf,
            /**
             * 抽奖信息
             * @type {(string|number)[]}
             */
            Lottery: (()=>{
                return Script.UIDs.concat(Script.TAGs);
            })(),
            getAllMyLotteryInfo: async() => {
                const allMyLotteryInfo = await Base.storage.get('AllMyLotteryInfo');
                if (typeof allMyLotteryInfo === 'undefined' ) {
                    const AllMyDyID = await Base.storage.get('AllMyDyID');
                    // eslint-disable-next-line no-undef
                    if (typeof AllMyDyID !== 'undefined') GM.deleteValue('AllMyDyID');
                    Tooltip.log('第一次使用,初始化中...');
                    let alldy = await Public.prototype.checkAllDynamic(myUID,50);
                    let obj = {};
                    for (let index = 0; index < alldy.length; index++) {
                        const {dynamic_id,origin_dynamic_id} = alldy[index];
                        if (typeof origin_dynamic_id === 'string') {
                            obj[origin_dynamic_id] = [dynamic_id,0]
                        }
                    }
                    await Base.storage.set('AllMyLotteryInfo',JSON.stringify(obj));
                    Tooltip.log('初始化成功');
                } else {
                    return allMyLotteryInfo
                }
            },
            /**
             * 
             * @param {string|''} dyid
             * @param {string} odyid
             * @param {number|0} ts
             */
            addLotteryInfo: async (dyid, odyid, ts) => {
                const allMyLotteryInfo = await module.getAllMyLotteryInfo();
                let obj = JSON.parse(allMyLotteryInfo);
                Object.prototype.hasOwnProperty.call(obj, odyid) ? void 0 : obj[odyid] = [];
                const [_dyid,_ts] = [obj[odyid][0],obj[odyid][1]];
                obj[odyid][0] = typeof _dyid === 'undefined' ? dyid : dyid === '' ? _dyid : dyid;
                obj[odyid][1] = typeof _ts === 'undefined' ? ts : ts === 0 ? _ts : ts;
                await Base.storage.set('AllMyLotteryInfo', JSON.stringify(obj));
                Tooltip.log('新增数据存储至本地');
            },
        };
        return module;
    })()
    /**
     * Ajax请求对象
     */
    const Ajax = (() => {
        /**
         * 发送Get请求
         * @param {Object} options
         */
        function get(options) {
            if (checkOptions(options)) {
                let xhr = new XMLHttpRequest();
                let url = options.url,
                    queryStringsObj = options.queryStringsObj;
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
                })
                xhr.addEventListener('error', () => {
                    throw new Error('xhr请求出错')
                })
                xhr.addEventListener('timeout', () => {
                    throw new Error('请求超时')
                })
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
                })
                xhr.addEventListener('error', () => {
                    throw new Error('xhr请求出错')
                })
                xhr.addEventListener('timeout', () => {
                    throw new Error('请求超时')
                })
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
    })()
    /**
     * 网络请求
     */
    const API = {
        /**
         * 获取关注列表
         * @param {number} uid 
         * @returns {Promise<string | null>}
         */
        getAttentionList: uid => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.vc.bilibili.com/feed/v1/feed/get_attention_list',
                    queryStringsObj: {
                        uid: uid
                    },
                    hasCookies: true,
                    success: responseText => {
                        let res = Base.strToJson(responseText)
                        if (res.code === 0) {
                            Tooltip.log('[获取关注列表]成功');
                            resolve(res.data.list.toString())
                        } else {
                            Tooltip.warn(`[获取关注列表]失败\n${responseText}`);
                            resolve(null)
                        }
                    }
                })
            });
        },
        /**
         * 获取一组动态的信息
         * @param {number} UID
         * 被查看者的uid
         * @param {string} offset
         * 此动态偏移量
         * 初始为 0
         * @returns {Promise<string>}
         */
        getOneDynamicInfoByUID: (UID, offset) => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history',
                    queryStringsObj: {
                        visitor_uid: GlobalVar.myUID,
                        host_uid: UID,
                        offset_dynamic_id: offset,
                    },
                    hasCookies: true,
                    success: responseText => {
                        /* 鉴别工作交由modifyDynamicRes完成 */
                        resolve(responseText)
                    }
                })
            });
        },
        /**
         * 通过tag名获取tag的id
         * @param {string} tagename
         * tag名
         * @returns {Promise<number | -1>}
         * 正确:tag_ID  
         * 错误:-1
         */
        getTagIDByTagName: tagename => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.bilibili.com/x/tag/info',
                    queryStringsObj: {
                        tag_name: tagename
                    },
                    hasCookies: false,
                    success: responseText => {
                        const res = Base.strToJson(responseText);
                        if (res.code !== 0) {
                            Tooltip.warn('获取TagID失败');
                            resolve(-1)
                        }
                        resolve(res.data.tag_id)
                    }
                })
            });
        },
        /**
         * 获取tag下的热门动态以及一条最新动态
         * @param {number} tagid
         * @returns {Promise<string>}
         */
        getHotDynamicInfoByTagID: tagid => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.vc.bilibili.com/topic_svr/v1/topic_svr/topic_new',
                    queryStringsObj: {
                        topic_id: tagid 
                    },
                    hasCookies: true,
                    success: responseText => {
                        resolve(responseText)
                    }
                })
            });
        },
        /**
         * 获取tag下的最新动态
         * @param {string} tagname
         * @param {string} offset
         * @returns {Promise<string>}
         */
        getOneDynamicInfoByTag: (tagname, offset) => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.vc.bilibili.com/topic_svr/v1/topic_svr/topic_history',
                    queryStringsObj: {
                        topic_name: tagname,
                        offset_dynamic_id: offset
                    },
                    hasCookies: true,
                    success: responseText => {
                        resolve(responseText)
                    }
                })
            });
        },
        /**
         * 获取动态的细节
         * @param {string} dyid 
         */
        getDynamicDetail: dyid => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail',
                    queryStringsObj: {
                        dynamic_id: dyid
                    },
                    hasCookies: true,
                    success: responseText => {
                        resolve(responseText)
                    }
                })
            });
        },
        /**
         * 获取开奖信息
         * @param {string} dyid
         * 动态id
         * @returns {
            Promise<{
                ts:number|0;
                text:string|'获取开奖信息失败';
                item:string|'null';
                isMe:string|'未知';
            }>
        } 开奖时间
         */
        getLotteryNotice: dyid => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice',
                    queryStringsObj: {
                        dynamic_id: dyid
                    },
                    hasCookies: false,
                    success: responseText => {
                        const res = Base.strToJson(responseText);
                        /(?<=_prize_cmt":").*(?=")/.exec()
                        if (res.code === 0) {
                            const timestamp10 = res.data.lottery_time,
                                timestamp13 = timestamp10 * 1000,
                                time = new Date(timestamp13);
                            const remain = (() => {
                                const timestr = ((timestamp13 - Date.now()) / 86400000).toString(),
                                    timearr = timestr.replace(/(\d+)\.(\d+)/, "$1,0.$2").split(',');
                                return `${timearr[0]}天余${parseInt(timearr[1] * 24)}小时`
                            })();
                            let isMeB = (new RegExp(GlobalVar.myUID)).test(responseText);
                            const isMe = isMeB ? '中奖了！！！' : '未中奖';
                            const iteminfo = res.data.first_prize_cmt||''+'  '+res.data.second_prize_cmt||''+'  '+res.data.third_prize_cmt||'';
                            resolve({
                                ts: timestamp10,
                                text: `开奖时间: ${time.toLocaleString()} 还有${remain}`,
                                item: iteminfo,
                                isMe: isMe
                            });
                        } else {
                            Tooltip.warn(`获取开奖信息失败\n${responseText}`);
                            resolve({
                                ts: 0,
                                text: '获取开奖信息失败',
                                item: 'null',
                                isMe: '未知'
                            })
                        }
                    }
                })
            });
        },
        /**
         * 之前不检查是否重复关注
         * 自动关注
         * 并转移分组
         * @param {Number} uid
         * 被关注者的UID
         * @returns {Promise<null>}
         */
        autoAttention: uid => {
            return new Promise((resolve,reject) => {
                Ajax.post({
                    url: 'https://api.bilibili.com/x/relation/modify',
                    hasCookies: true,
                    dataType: 'application/x-www-form-urlencoded',
                    data: {
                        fid: uid,
                        act: 1,
                        re_src: 11,
                        jsonp: 'jsonp',
                        csrf: GlobalVar.csrf
                    },
                    success: responseText => {
                        /* 重复关注code also equal 0  */
                        if (/^{"code":0/.test(responseText)) {
                            Tooltip.log('[自动关注]关注+1');
                            resolve()
                        } else {
                            Tooltip.warn(`[自动关注]失败\n${responseText}`);
                            reject()
                        }
                    }
                })
            });
        },
        /**
         * 移动分区
         * @param {number} uid
         * @param {number} tagid 关注分区的ID
         */
        movePartition: (uid,tagid) => {
            Ajax.post({
                url: 'https://api.bilibili.com/x/relation/tags/addUsers?cross_domain=true',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    fids: uid,
                    tagids: tagid,
                    csrf: GlobalVar.csrf
                },
                success: responseText => {
                    /* 重复移动code also equal 0 */
                    if (/^{"code":0/.test(responseText)) {
                        Tooltip.log('[移动分区]up主分区移动成功');
                    } else {
                        Tooltip.warn(`[移动分区]up主分区移动失败\n${responseText}`);
                    }
                }
            })
        },
        /**
         * 取消关注
         * @param {number} uid 
         * @returns {void}
         */
        cancelAttention: uid => {
            Ajax.post({
                url: 'https://api.bilibili.com/x/relation/modify',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    fid: `${uid}`,
                    act: 2,
                    re_src: 11,
                    jsonp: 'jsonp',
                    csrf: GlobalVar.csrf
                },
                success: responseText => {
                    const res = Base.strToJson(responseText)
                    if (res.code === 0) {
                        Tooltip.log('[自动取关]取关成功')
                    } else {
                        Tooltip.warn(`[自动取关]取关失败\n${responseText}`)
                    }
                }
            })
        },
        /**
         * 动态自动点赞
         * @param {string} dyid
         * @returns {void}
         */
        autolike: dyid => {
            Ajax.post({
                url: 'https://api.vc.bilibili.com/dynamic_like/v1/dynamic_like/thumb',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    uid: GlobalVar.myUID,
                    dynamic_id: dyid,
                    up: 1,
                    csrf: GlobalVar.csrf
                },
                success: responseText => {
                    if (/^{"code":0/.test(responseText)) {
                        Tooltip.log('[自动点赞]点赞成功');
                    } else {
                        Tooltip.warn(`[转发动态]点赞失败\n${responseText}`);
                    }
                }
            })
        },
        /**
         * 转发前因查看是否重复转发
         * 自动转发
         * @param {Number} uid
         * 自己的UID
         * @param {string} dyid
         * 动态的ID
         * @returns {void}
         */
        autoRelay: (uid, dyid) => {
            Ajax.post({
                url: 'https://api.vc.bilibili.com/dynamic_repost/v1/dynamic_repost/repost',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    uid: `${uid}`,
                    dynamic_id: dyid,
                    content: Base.getRandomStr(config.relay),
                    extension: '{"emoji_type":1}',
                    csrf: GlobalVar.csrf
                },
                success: responseText => {
                    if (/^{"code":0/.test(responseText)) {
                        Tooltip.log('[转发动态]成功转发一条动态');
                    } else {
                        Tooltip.warn(`[转发动态]转发动态失败\n${responseText}`);
                    }
                }
            })
        },
        /**
         * 移除动态
         * @param {string} dyid
         * @returns {void}
         */
        rmDynamic: dyid => {
            Ajax.post({
                url: 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/rm_dynamic',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    dynamic_id: dyid,
                    csrf: GlobalVar.csrf
                },
                success: responseText => {
                    if (/^{"code":0/.test(responseText)) {
                        Tooltip.log('[删除动态]成功删除一条动态');
                    } else {
                        Tooltip.warn(`[删除动态]删除动态失败\n${responseText}`);
                    }
                }
            })
        },
        /**
         * 发送评论
         * @param {string} rid
         * cid_str
         * @param {string} msg
         * @param {number} type
         * 1(视频)  
         * 11(有图)  
         * 17(无图)  
         * @returns {void}
         */
        sendChat: (rid,msg,type) => {
            Ajax.post({
                url: 'https://api.bilibili.com/x/v2/reply/add',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    oid: rid,
                    type: type,
                    message: msg,
                    jsonp: 'jsonp',
                    csrf: GlobalVar.csrf
                },
                success: responseText => {
                    if (/^{"code":0/.test(responseText)) {
                        Tooltip.log('[自动评论]评论成功');
                    } else {
                        Tooltip.warn('[自动评论]评论失败')
                    }
                }
            })
        },
        /**
         * 检查分区  
         * 不存在指定分区时创建  
         * 获取到tagid添加为对象的属性  
         * @returns {Promise<number>}
         */
        checkMyPartition: () => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.bilibili.com/x/relation/tags',
                    queryStringsObj: {
                        jsonp: 'jsonp',
                        callback: '__jp14'
                    },
                    hasCookies: true,
                    success: responseText => {
                        if (!/此处存放因抽奖临时关注的up/.test(responseText)) {
                            /* 如果不存在就新建一个 */
                            Ajax.post({
                                url: 'https://api.bilibili.com/x/relation/tag/create?cross_domain=true',
                                hasCookies: true,
                                dataType: 'application/x-www-form-urlencoded',
                                data: {
                                    tag: '此处存放因抽奖临时关注的up',
                                    csrf: GlobalVar.csrf
                                },
                                success: responseText => {
                                    let obj = Base.strToJson(responseText);
                                    if (obj.code === 0) {
                                        Tooltip.log('[新建分区]分区新建成功')
                                        let tagid = obj.data.tagid /* 获取tagid */
                                        resolve(tagid)
                                    }
                                }
                            })
                        } else {
                            /* 此处可能会出现问题 */
                            let tagid = /[0-9]*(?=,"name":"此处存放因抽奖临时关注的up")/.exec(responseText)[0] /* 获取tagid */
                            resolve(Number(tagid))
                        }
                    }
                })
            });
        },
    }
    /**
     * 基础功能
     */
    class Public {
        constructor() {}
        /**
         * 检查所有的动态信息
         * @param {string} UID
         * 指定的用户UID
         * @param {number} pages
         * 读取页数
         * @returns {
            Promise<{
                uid: number;
                dynamic_id: string;
                description: string;
                type: string;
                origin_uid: string;
                origin_uname: string;
                origin_rid_str: string;
                origin_dynamic_id: string;
                origin_hasOfficialLottery: boolean;
                origin_description: string;
                origin_type: string;
            }[]>
        } 获取前 pages*12 个动态信息
         */
        async checkAllDynamic (hostuid, pages) {
            Tooltip.log(`准备读取${pages}页自己的动态信息`);
            const mDR = this.modifyDynamicRes,
                getOneDynamicInfoByUID = API.getOneDynamicInfoByUID,
                curriedGetOneDynamicInfoByUID = Base.curryify(getOneDynamicInfoByUID); /* 柯里化的请求函数 */
            /**
             * 储存了特定UID的请求函数
             */
            let hadUidGetOneDynamicInfoByUID = curriedGetOneDynamicInfoByUID(hostuid);
            /**
             * 储存所有经过整理后信息
             * [{}{}...{}]
             */
            let allModifyDynamicResArray = [];
            let offset = '0';
            for (let i = 0; i < pages; i++) {
                Tooltip.log(`正在读取第${i+1}页动态`);
                let OneDynamicInfo = await hadUidGetOneDynamicInfoByUID(offset);
                const mDRdata = mDR(OneDynamicInfo);
                if (mDRdata === null) {
                    break;
                }
                /**
                 * 储存一片动态信息
                 * [{}{}...{}]
                 */
                const mDRArry = mDRdata.modifyDynamicResArray,
                    nextinfo = mDRdata.nextinfo;
                if (nextinfo.has_more === 0) {
                    Tooltip.log(`成功读取${i+1}页信息(已经是最后一页了故无法读取更多)`);
                    break;
                } else {
                    allModifyDynamicResArray.push.apply(allModifyDynamicResArray, mDRArry);
                    i + 1 < pages ? Tooltip.log(`开始读取第${i+2}页动态信息`) : Tooltip.log(`${pages}页信息全部成功读取完成`);
                    offset = nextinfo.next_offset;
                }
            }
            return(allModifyDynamicResArray);
        }
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
                    type: number;
                    description: string;
                    hasOfficialLottery: boolean;
                    origin_uid: number;
                    origin_uname: string;
                    origin_rid_str: string;
                    origin_dynamic_id: string;
                    orig_type: number;
                    origin_description: string;
                    origin_hasOfficialLottery: boolean;
                }[];
                nextinfo: {
                    has_more: number;
                    next_offset: string;
                };
            } | null
        } 返回对象,默认为null
         */
        modifyDynamicRes (res){
            const strToJson = Base.strToJson,
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
                Tooltip.log('动态数据读取完毕');
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
                            let item = cardToJson.item;
                            obj.description = item.content || item.description; /* 转发者的描述 */
                        } catch (error) {
                            obj.description = '';
                        }
                    } else {
                        obj.origin_uid = desc.origin.uid; /* 被转发者的UID */
                        obj.origin_rid_str = desc.origin.rid_str /* 被转发者的rid(用于发评论) */
                        obj.origin_dynamic_id = desc.orig_dy_id_str; /* 被转发者的动态的ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
                        obj.origin_hasOfficialLottery = (typeof cardToJson.origin_extension === 'undefined') ? false : true; /* 是否有官方抽奖 */
                        try {
                            let origin = strToJson(cardToJson.origin)
                            let item = origin.item;
                            obj.origin_uname = origin.user.name || origin.user.uname; /* 被转发者的name */
                            obj.origin_description = typeof item.description === 'undefined' ? item.content : item.description; /* 被转发者的描述 */
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
        /**
         * 获取tag下的抽奖信息(转发母动态)  
         * 并初步整理
         * @returns {
            Promise<{
                uid: number;
                dyid: string;
                befilter: boolean;
                rid: string;
                des: string;
                type: number;
                hasOfficialLottery: boolean
            }[] | null>
        }
         */
        async getLotteryInfoByTag() {
            const self = this,
                tag_name = self.tag_name,
                tag_id = await API.getTagIDByTagName(tag_name),
                hotdy = await API.getHotDynamicInfoByTagID(tag_id),
                modDR = self.modifyDynamicRes(hotdy);
            if(modDR === null) return null;
            Tooltip.log(`开始获取带话题#${tag_name}#的动态信息`);
            let mDRdata = modDR.modifyDynamicResArray;
            const newdy = await API.getOneDynamicInfoByTag(tag_name,modDR.nextinfo.next_offset);
            mDRdata.push.apply(mDRdata, self.modifyDynamicRes(newdy).modifyDynamicResArray);
            const fomatdata = mDRdata.map(o=>{
                const hasOrigin = o.type === 1
                return {
                    uid: o.uid,
                    dyid: o.dynamic_id,
                    befilter: hasOrigin,
                    rid: o.rid_str,
                    des: o.description,
                    type: o.type,
                    hasOfficialLottery: o.hasOfficialLottery
                }
            })
            Tooltip.log(`成功获取带话题#${tag_name}#的动态信息`);
            return fomatdata
        }
        /**
         * 获取最新动态信息(转发子动态)  
         * 并初步整理
         * @returns {
            Promise<{
                uid: number;
                dyid: string;
                befilter: boolean;
                rid: string;
                des: string;
                type: number;
                hasOfficialLottery: boolean
            }[] | null>
        }
         */
        async getLotteryInfoByUID() {
            const self = this,
                dy = await API.getOneDynamicInfoByUID(self.UID, 0),
                modDR = self.modifyDynamicRes(dy);
            if(modDR === null) return null;
            const mDRdata = modDR.modifyDynamicResArray,
                _fomatdata = mDRdata.map(o=>{
                    return {
                        uid: o.origin_uid,
                        dyid: o.origin_dynamic_id,
                        befilter: false,
                        rid: o.origin_rid_str,
                        des: o.origin_description,
                        type: o.orig_type,
                        hasOfficialLottery: o.origin_hasOfficialLottery
                    }
                })
            const fomatdata = _fomatdata.filter(a => {
                if (a.type === 0) {
                    return false
                }
                return true
            })
            return fomatdata
        }
    }
    /**
     * 监视器
     */
    class Monitor extends Public {
        /**
         * @param {number | string} param
         */
        constructor(param) {
            super();
            typeof param === 'number' ? this.UID = param : this.tag_name = param;
            this.tagid = 0; /* tagid初始化为默认分组 */
            this.attentionList = ''; /* 转为字符串的所有关注的up主uid */
            this.AllMyLotteryInfo = '' /* 转发过的动态信息 */
        }
        /**
         * 初始化
         */
        async init() {
            if (config.model === '00') return;
            this.tagid = await API.checkMyPartition(); /* 检查关注分区 */
            this.attentionList = await API.getAttentionList(GlobalVar.myUID);
            this.AllMyLotteryInfo = await GlobalVar.getAllMyLotteryInfo()
            const isAdd = await this.startLottery();
            if (isAdd) {
                let cADynamic = await this.checkAllDynamic(GlobalVar.myUID, 2); /* 检查我的所有动态 */
                /**
                 * 储存转发过的动态信息
                 */
                for (let index = 0; index < cADynamic.length; index++) {
                    const {type,dynamic_id,origin_dynamic_id,origin_description} = cADynamic[index];
                    if (type === 1&& typeof origin_description !== 'undefined') {
                        await GlobalVar.addLotteryInfo(dynamic_id,origin_dynamic_id,0)
                    }
                }
                this.clearDynamic();
            }
        }
        /**
         * 启动
         * @returns {Promise<boolean>}
         */
        async startLottery() {
            const allLottery = await this.filterLotteryInfo();
            const len = allLottery.length;
            let index = 0;
            if(len === 0){
                eventBus.emit('Turn_on_the_Monitor');
                return false;
            } else {
                for (const Lottery of allLottery) {
                    await this.go(Lottery);
                    if (index++ === len - 1) {
                        Tooltip.log('开始转发下一组动态');
                        eventBus.emit('Turn_on_the_Monitor');
                        return true;
                    } else {
                        void 0;
                    }
                }
            }
        }
        /**
         * 保持1500条动态
         */
        async clearDynamic() {
            const AllMyLotteryInfo = JSON.parse(await GlobalVar.getAllMyLotteryInfo());
            const keyArr = Object.keys(AllMyLotteryInfo);
            if (keyArr.length > 1500) {
                for (let i = 0; i < keyArr.length - 1500; i++) {
                    let dyid = AllMyLotteryInfo[keyArr[i]][0];
                    API.rmDynamic(dyid);
                }
            }
        }
        /**
         * @returns {
            Promise<{
                uid: number;
                dyid: string;
                type: number;
                rid: string;
            }[] | []>
        }
         */
        async filterLotteryInfo() {
            const self = this,
                protoLotteryInfo = typeof self.UID === 'number' ? await self.getLotteryInfoByUID() : await self.getLotteryInfoByTag();
            if(protoLotteryInfo === null) return [];
            let alllotteryinfo = [];
            const model = config.model;
            const maxday = config.maxday === '' ? Infinity : (Number(config.maxday) * 86400);
            for (const info of protoLotteryInfo) {
                let onelotteryinfo = {};
                let isLottery = false;
                const description = typeof info.des === 'string' ? info.des : '';
                if(info.hasOfficialLottery && model[0] == '1') {
                    const oneLNotice = await API.getLotteryNotice(info.dyid);
                    isLottery = oneLNotice.ts > (Date.now() / 1000) && oneLNotice.ts < maxday;
                    isLottery ? await GlobalVar.addLotteryInfo('',info.dyid,oneLNotice.ts) : void 0;
                } else if(model[1] == '1') {
                    isLottery = /[关转]/.test(description) && !info.befilter;
                }
                if(isLottery) {
                    /* 判断是否重复关注 */
                    const uid = info.uid;
                    const reg1 = new RegExp(uid);
                    reg1.test(self.attentionList) ? void 0 : onelotteryinfo.uid = uid;
                    /* 判断是否重复转发 */
                    const dynamic_id = info.dyid;
                    const reg2 = new RegExp(dynamic_id);
                    /**从本地读取的dyid */
                    reg2.test(self.AllMyLotteryInfo) ? void 0 : onelotteryinfo.dyid = dynamic_id;
                    /* 用于评论 */
                    onelotteryinfo.type = (info.type === 2) ? 11 : (info.type === 4) ? 17 : 0;
                    onelotteryinfo.rid = info.rid;
                    typeof onelotteryinfo.uid === 'undefined' && typeof onelotteryinfo.dyid === 'undefined'
                        ? void 0
                        : alllotteryinfo.push(onelotteryinfo);
                }
            }
            return alllotteryinfo
        }
        /**
         * 关注转发评论
         * @param {
            {
                uid: number;
                dyid: string;
                type: number;
                rid: string;
            }
        } obj
         */
        async go(obj) {
            const { uid, dyid, type, rid } = obj;
            if (typeof dyid === 'string') {
                API.autoRelay(GlobalVar.myUID, dyid);
                API.autolike(dyid);
                if (typeof uid === 'number') {
                    API.autoAttention(uid).then(()=>{
                        API.movePartition(uid,this.tagid)
                    },()=>{
                        Tooltip.warn('未关注无法移动分区');
                    })
                }
                if (typeof rid === 'string'&&config.model[0] === '1') {
                    API.sendChat(rid, Base.getRandomStr(config.chat), type);
                }
                await Base.delay(Number(config.wait));
                return;
            }
            return;
        }
    }
    /**
     * 主菜单
     */
    class MainMenu extends Public{
        constructor() {
            super()
        }
        init() {
            this.initUI();
            this.eventListener();
            this.sortInfoAndShow()
        }
        initUI() {
            const creatCompleteElement = Base.creatCompleteElement
                , cssContent = ".shanmitemenu {position:fixed;z-index:99999;right:30px;top:68%;}.shanmitemenu .icon {background-position:0em -8.375em;width:0.425em;height:0.4em;vertical-align:middle;display:inline-block;background-image:url(https://s1.hdslb.com/bfs/seed/bplus-common/icon/2.2.1/bp-svg-icon.svg);background-repeat:no-repeat;background-size:1em 23.225em;font-size:40px;font-style:italic;}.shanmitemenu .show {position:relative;overflow:hidden;padding-left:0px;transition:0.3s all 0.1s cubic-bezier(0, 0.53, 0.15, 0.99);cursor:pointer;color:#178bcf;}.shanmitemenu .show:hover {padding-left:75px;}.shanmitemenu .box {position:absolute;right:20px;bottom:20px;background-color:#fff;padding:5px;border-radius:5px;box-shadow:grey 0px 0px 10px 0px;width:550px;height:350px;}.shanmitemenu button {font-size:14px;padding:0 5px;}.shanmitemenu .changetab {display:flex;-webkit-user-select:none;}.shanmitemenu .changetab div {margin:0 0 0 10px;padding:3px;border-radius:6px;border:2px solid #26c6da;font-size:14px;cursor:pointer;transition:background-color .3s ease 0s;background-color:#87cfeb80;}.shanmitemenu .changetab div:hover {background-color:skyblue;}.shanmitemenu .tab {display:none;overflow:hidden;overflow-y:scroll;height:310px;margin:3px;}.shanmitemenu .tab .card {font-size:15px;margin:5px;padding:2px;border-radius:5px;box-shadow:gray 0px 0px 4px 0px;}.shanmitemenu .bottom {display:flex;justify-content:flex-end;align-items:flex-end;}.shanmitemenu .bottom button{margin-left:10px;}"
                , frg = creatCompleteElement({
                    tagname: 'div',
                    attr: {
                        class: 'shanmitemenu',
                    },
                    text: '',
                    children: [
                        creatCompleteElement({
                            tagname: 'style',
                            attr: {
                                type: 'text/css'
                            },
                            text: cssContent,
                        }),
                        creatCompleteElement({
                            tagname: 'div',
                            attr: {
                                title: 'Bili互动抽奖助手',
                                class: 'show',
                            },
                            children: [
                                creatCompleteElement({
                                    tagname: 'span',
                                    attr: {
                                        id: 'showall',
                                        style: 'position:absolute;right: 1.5em;width: 4em;font-size: 17px;-webkit-user-select: none;'
                                    },
                                    text: '抽奖助手',
                                }),
                                creatCompleteElement({
                                    tagname: 'i',
                                    attr: {
                                        id: 'showall',
                                        class: 'icon',
                                        style: "position:relative;top:-2px;margin-left:2px;margin-right:2px;border: 1px dashed skyblue;"
                                    },
                                })
                            ]
                        }),
                        creatCompleteElement({
                            tagname: 'div',
                            attr: {
                                class: 'box',
                                style: 'display: none;'
                            },
                            children: [
                                creatCompleteElement({
                                    tagname: 'div',
                                    attr: {
                                        class: 'changetab',
                                    },
                                    children: [
                                        creatCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                id: 'showtab0',
                                            },
                                            text: '开奖信息',
                                        }),
                                        creatCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                id: 'showtab1',
                                            },
                                            text: '设置',
                                        })
                                    ]
                                }),
                                creatCompleteElement({
                                    tagname: 'div',
                                    attr: {
                                        class: 'tabs',
                                    },
                                    children: [
                                        creatCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                class: 'tab info',
                                            }
                                        }),
                                        creatCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                class: 'tab config',
                                            },
                                            children: [
                                                creatCompleteElement({
                                                    tagname: 'button',
                                                    attr: {
                                                        id: 'save',
                                                        style: 'position: absolute;right: 30px;bottom: 20px;'
                                                    },
                                                    text: '保存设置',
                                                }),
                                                creatCompleteElement({
                                                    tagname: 'form',
                                                    attr: {
                                                        id: 'config',
                                                    },
                                                    children: [
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '当前版本'+Script.version+Script.author,
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '模式选择',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'label',
                                                            text: '转发官方抽奖',
                                                            children: [
                                                                creatCompleteElement({
                                                                    tagname: 'input',
                                                                    attr: {
                                                                        type: 'checkbox',
                                                                        name: 'mode'
                                                                    },
                                                                    script: el=>{
                                                                        config.model[0] === '1' ? el.checked = 'checked' : void 0;
                                                                    }
                                                                })
                                                            ]
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'label',
                                                            text: '转发非官方抽奖',
                                                            children: [
                                                                creatCompleteElement({
                                                                    tagname: 'input',
                                                                    attr: {
                                                                        type: 'checkbox',
                                                                        name: 'mode'
                                                                    },
                                                                    script: el=>{
                                                                        config.model[1] === '1' ? el.checked = 'checked' : void 0;
                                                                    }
                                                                })
                                                            ]
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '开奖时间(默认不限):',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'maxday'
                                                            },
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'span',
                                                            text: '天内',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '再次扫描间隔(完成所有转发后进行停止等待,于指定时间间隔后再次进行操作):',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'scan_time',
                                                                value: (Number(config.scan_time) / 60000).toString(),
                                                            }
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'span',
                                                            text: '分钟',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '转发间隔(每条动态的转发间隔时间):',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'wait',
                                                                value: (Number(config.wait) / 1000).toString(),
                                                            }
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'span',
                                                            text: '秒',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '转发动态评语(!注意!以下每一句英文逗号分割(句子内不要出现英文逗号)):',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'relay'
                                                            },
                                                            text: config.relay.toString(),
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '随机评论内容:',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'chat'
                                                            },
                                                            text: config.chat.toString(),
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '监视的UID:',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: Script.UIDs.toString(),
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: '监视的话题:',
                                                        }),
                                                        creatCompleteElement({
                                                            tagname: 'p',
                                                            text: Script.TAGs.toString(),
                                                        }),
                                                    ]
                                                })
                                            ]
                                        }),
                                    ]
                                })
                            ]
                        })
                    ]
                });
            document.body.appendChild(frg);
        }
        eventListener() {
            const shanmitemenu = document.querySelector('.shanmitemenu')
                , box = shanmitemenu.querySelector('.box')
                , tabsarr = shanmitemenu.querySelectorAll('.tab')
                , infotab = shanmitemenu.querySelector('.tab.info')
                , configForm = shanmitemenu.querySelector('#config')
                , show = num => {
                    for (let index = 0; index < tabsarr.length; index++) {
                        const element = tabsarr[index];
                        element.style.display = index == num ? 'block' : 'none';
                    }
                }
            show(0)
            shanmitemenu.addEventListener('click', ev => {
                const id = ev.target.id;
                switch (id) {
                    case 'showall': {
                        if (box.style.display == 'block') {
                            box.style.display = 'none';
                        } else {
                            show(0);
                            box.style.display = 'block';
                        }
                    }
                        break;
                    case 'showtab0': {
                        show(0);
                        infotab.innerHTML = '';
                        this.sortInfoAndShow();
                    }
                        break;
                    case 'showtab1': {
                        show(1);
                    }
                        break
                    case 'save': {
                        let newConfig = {
                                model: '',
                                maxday: '',
                                scan_time: '',
                                wait: '',
                                relay: [],
                                chat: [],
                                }
                        configForm.mode[0].checked ? newConfig.model = '1' : newConfig.model = '0';
                        for (let i = 1; i < 2; i++) {
                            configForm.mode[i].checked ? newConfig.model += '1' : newConfig.model += '0';
                        }
                        newConfig.maxday = configForm['maxday'].value === '' ? '' : configForm['maxday'].value;
                        newConfig.scan_time = (Number(configForm.scan_time.value) * 60000).toString();
                        newConfig.wait = (Number(configForm.wait.value) * 1000).toString();
                        newConfig.relay = configForm.relay.value.split(',');
                        newConfig.chat = configForm.chat.value.split(',');
                        config = newConfig;
                        eventBus.emit('Modify_settings',JSON.stringify(newConfig));
                    }
                        break;
                    case 'btn1':
                        API.rmDynamic(ev.target.dataset.dyid);
                        API.cancelAttention(ev.target.dataset.uid);
                        infotab.removeChild(ev.target.parentNode);
                        break;
                    case 'btn2':
                        API.rmDynamic(ev.target.dataset.dyid)
                        infotab.removeChild(ev.target.parentNode);
                        break;
                    default:
                        break;
                }
            })
        }
        /**
         * 提取所需的信息
         * @return {
            Promise<{
                ts:number | 0;
                text:string | '非官方抽奖请自行查看';
                item:string;
                isMe: string;
                dynamic_id:string;
                origin_description: string;
                origin_uid:number;
                origin_uname:string;
                origin_dynamic_id:string
            }[]>
        } 
         * 截止时间戳  
         * 文本  
         * 本动态ID  
         * 源up主UID  
         * 源动态ID
         */
        async fetchDynamicInfo() {
            let allMDResArray = await this.checkAllDynamic(GlobalVar.myUID, 5);
            /**
             * 滤出抽奖信息
             */
            const _arr = allMDResArray.filter(a => {
                let beFilter = false;
                const origin_description = a.origin_description;
                if (typeof origin_description === 'undefined') {
                    return beFilter;
                } else {
                    if (/[奖关转]/.test(origin_description)) {
                        beFilter = true;
                    } else {
                        return beFilter;
                    }
                }
                return beFilter;
            })
            /**
             * 提取主要内容
             */
            const arr = _arr.map(a => {
                return {
                    dynamic_id: a.dynamic_id,
                    origin_description: a.origin_description,
                    origin_hasOfficialLottery: a.origin_hasOfficialLottery,
                    origin_uid: a.origin_uid,
                    origin_uname: a.origin_uname,
                    origin_dynamic_id: a.origin_dynamic_id
                }
            })
            let elemarray = [];
            for (let one of arr) {
                let LotteryNotice = one.origin_hasOfficialLottery
                    ? await API.getLotteryNotice(one.origin_dynamic_id) 
                    : {ts:0,text:'非官方抽奖请自行查看',item:'null',isMe:'未知'};
                LotteryNotice.origin_description = one.origin_description;
                LotteryNotice.dynamic_id = one.dynamic_id;/* 用于删除动态 */
                LotteryNotice.origin_uid = one.origin_uid;/* 取关 */
                LotteryNotice.origin_uname = one.origin_uname;/* 查看用户名 */
                LotteryNotice.origin_dynamic_id = one.origin_dynamic_id/* 用于查看开奖信息 */
                elemarray.push(LotteryNotice);
            }
            return elemarray;
        }
        /**
         * 生成一条开奖信息卡片
         * @param {
            {
                ts:number;
                text:string;
                item:string;
                isMe:boolean;
                dynamic_id:string;
                origin_description: string;
                origin_uid:number;
                origin_uname:string;
                origin_dynamic_id:string
            }
        } info
         */
        creatLotteryDetailInfo(info) {
            const creatCompleteElement = Base.creatCompleteElement
                , infocards = document.querySelector('.tab.info')
                , LotteryDetailInfo = creatCompleteElement({
                    tagname: 'div',
                    attr: {
                        class: 'card',
                    },
                    children: [
                        creatCompleteElement({
                            tagname: 'p',
                            attr: {
                                style: 'color:#fb7299;'
                            },
                            text: info.origin_uname+':',
                        }),
                        creatCompleteElement({
                            tagname: 'p',
                            attr: {
                                title: info.origin_description,
                                style: 'height:40px;color:gray;display:-webkit-box;overflow: hidden;-webkit-line-clamp: 2;-webkit-box-orient: vertical;'
                            },
                            text: info.origin_description
                        }),
                        creatCompleteElement({
                            tagname: 'p',
                            attr: {
                                style: 'color:red;'
                            },
                            text: info.text
                        }),
                        creatCompleteElement({
                            tagname: 'p',
                            attr: {
                                style: 'color:#ffa726;'
                            },
                            text: '奖品:'+info.item
                        }),
                        creatCompleteElement({
                            tagname: 'span',
                            attr: {
                                style: 'color:green;'
                            },
                            text: info.isMe+'   '
                        }),
                        creatCompleteElement({
                            tagname: 'a',
                            attr: {
                                href: 'https://t.bilibili.com/'+info.origin_dynamic_id,
                                target: '_blank'
                            },
                            text: '查看详情'
                        }),
                        creatCompleteElement({
                            tagname: 'button',
                            attr: {
                                id: 'btn1',
                                'data-dyid': info.dynamic_id,
                                'data-uid': info.origin_uid
                            },
                            text: '删除动态并取关',
                        }),
                        creatCompleteElement({
                            tagname: 'button',
                            attr: {
                                id: 'btn2',
                                'data-dyid': info.dynamic_id,
                            },
                            text: '仅移除动态',
                        })
                    ]
                });
            infocards.appendChild(LotteryDetailInfo);
        }
        /**
         * 排序后展示
         * @returns {Promise<void>}
         */
        async sortInfoAndShow() {
            const self = this
            let protoArr = await this.fetchDynamicInfo();
            /**
             * 按ts从小到大排序
             */
            protoArr.sort((a, b) => {
                return a.ts - b.ts;
            })
            protoArr.forEach(one => {
                self.creatLotteryDetailInfo(one)
            })
            return;
        }
    }
    /**主函数 */
    (async function main() {
        if (/(?<=space\.bilibili\.com\/)[0-9]*(?=\/?)/.exec(window.location.href)[0] !== GlobalVar.myUID) {
            Tooltip.log(document.title);
            return;
        }
        if (/(compatible|Trident)/.test(navigator.appVersion)) {alert('当前浏览器内核为IE内核，请使用非IE内核浏览器!');return}
        /* 注册事件 */
        { 
            {
                let i = 0;
                eventBus.on('Turn_on_the_Monitor', () => {
                    if (i === GlobalVar.Lottery.length) {
                        Tooltip.log('所有动态转发完毕');
                        Tooltip.log('[运行结束]目前无抽奖信息,过一会儿再来看看吧');
                        i = 0;
                        Tooltip.log(`${Number(config.scan_time) / 60000}分钟后再次扫描`);
                        setTimeout(() => {
                            eventBus.emit('Turn_on_the_Monitor');
                        }, Number(config.scan_time))
                        return;
                    }
                    (new Monitor(GlobalVar.Lottery[i++])).init();
                });
            }
            eventBus.on('Modify_settings', async ({ detail }) => {
                await Base.storage.set('config', detail);
                Tooltip.log('设置修改成功');
            })
        }
        API.sendChat('453380690548954982', (new Date(Date.now())).toLocaleString() + Script.version, 17);
        await GlobalVar.getAllMyLotteryInfo();
        GlobalVar.Lottery.length === 0 ? void 0 : eventBus.emit('Turn_on_the_Monitor');
        (new MainMenu()).init();
    })()
})();