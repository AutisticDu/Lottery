// ==UserScript==
// @name         Bili动态抽奖助手
// @namespace    http://tampermonkey.net/
// @version      3.2.3
// @description  自动参与B站"关注转发抽奖"活动
// @author       shanmite
// @include      /^https?:\/\/space\.bilibili\.com/[0-9]*/
// @license      GPL
// @grant        none
// ==/UserScript==
(function () {
    /**
     * uid列表
     */
    const uids = [
        213931643,
        15363359,
        31252386,
        80158015
    ];
    /**
     * 浮动提示框
     */
    const Tooltip = (() => {
        const DOC = document,
            body = DOC.querySelector('body'),
            logbox = DOC.createElement('div'),
            style = DOC.createElement('style');
        /**
         * 初始化日志框
         */
        (() => {
            style.setAttribute('type', 'text/css');
            style.innerText = ".test{float:right;margin:100px;}.logbox{z-index:99999;position:fixed;top:0;right:0;max-width:400px;max-height:600px;overflow-y:scroll;scroll-behavior:smooth;}.logbox::-webkit-scrollbar{width:0;}.logline{display:flex;justify-content:flex-end;}.out{min-height:26px;line-height:26px;margin:3px 0;border-radius:6px;padding:0 10px;transition:background-color 1s;font-size:16px;color:#fff;box-shadow:1px 1px 3px 0px #000;}.outLog{background-color:#81ec81;}.outWarn{background-color:#fd2d2d;}";
            logbox.setAttribute('class', 'logbox');
            logbox.appendChild(style);
            body.appendChild(logbox)
        })();
        /**
         * 打印信息的公共部分
         * @param {string} classname 
         * @param {string} text 
         */
        function _add(classname, text) {
            const div = DOC.createElement('div'), /* log行 */
                span = DOC.createElement('span'); /* log信息 */
            div.setAttribute('class', 'logline');
            span.setAttribute('class', classname);
            span.innerText = text;
            div.appendChild(span);
            logbox.appendChild(div);
            setTimeout(() => {
                span.style.color = 'transparent';
                span.style.backgroundColor = 'transparent';
                span.style.boxShadow = 'none';
                setTimeout(() => {
                    div.removeChild(span);
                    logbox.removeChild(div)
                }, 1000)
            }, 4000) /* 显示5秒 */
        }
        /**
         * 展示信息
         * @param {string} text 
         */
        function log(text) {
            _add('out outLog', text)
        }
        /**
         * 警告信息
         * @param {string} text 
         */
        function warn(text) {
            _add('out outWarn', text)
        }
        return {
            log: log,
            warn: warn
        }
    })()
    /**
     * 贮存全局变量
     */
    const GlobalVar = (() => {
        const Cookie = document.cookie,
            a = /((?<=DedeUserID=)\d+).*((?<=bili_jct=)\w+)/g.exec(Cookie);
        if (a.length !== 3) {
            Tooltip.warn('全局变量读取失败');
            return;
        }
        /**
         * 自己的uid
         */
        const myUID = a[1];
        /**
         * 请求需携带的csrf字符串
         */
        const csrf = a[2];
        /**
         * 返回字符串
         * @returns {string}
         */
        function getChat() {
            const chat = [
                '永不缺席 永不中奖 永不放弃！',
                '万一呢',
                '来了',
                '[保佑][保佑]',
                '从未中，从未停',
                '[吃瓜]',
                '[抠鼻][抠鼻]',
                '秋梨膏',
                '我还能中！让我中！！！',
                '大家都散了吧，已经抽完了，是我的',
                '我是天选之子',
                '给我中一次吧！',
                '坚持不懈，迎难而上，开拓创新！',
                '[OK][OK]',
                '我来抽个奖',
                '中中中中中中',
                '[doge][doge][doge]',
                '我我我'
            ];
            return chat[parseInt(Math.random()*chat.length)]
        }
        /**
         * 
         * @param {number} time
         * @returns {Promise<void>}
         */
        const delay = time => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve()
                }, time)
            })
        };
        return {
            myUID,
            csrf,
            getChat,
            delay
        }
    })()
    /**
     * Ajax请求对象
     */
    const Ajax = (() => {
        'use strict';
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
     * 基础工具
     */
    class Basic {
        constructor() { }
        /**
         * 安全的将JSON字符串转为对象
         * 超出精度的数转为字符串
         * @param {string} params
         * @return {object}
         * 返回对象
         */
        strToJson(params) {
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
        /**
         * 函数柯里化
         * @param {function} func
         * 要被柯里化的函数
         * @returns {function}
         * 一次接受一个参数并返回一个接受余下参数的函数
         */
        curryify(func) {
            function _c(restNum, argsList) {
                return restNum === 0 ?
                    func.apply(null, argsList) :
                    function (x) {
                        return _c(restNum - 1, argsList.concat(x));
                    };
            }
            return _c(func.length, []);
        }
        /**
         * 获取一次动态的信息
         * @param {number} UID
         * 被查看者的uid
         * @param {number} offset
         * 下一页动态,
         * 初始为 0
         * @returns {Promise<string>}
         */
        getOneDynamicInfo(UID, offset) {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history',
                    queryStringsObj: {
                        visitor_uid: GlobalVar.myUID,
                        host_uid: `${UID}`,
                        offset_dynamic_id: `${offset}`,
                    },
                    hasCookies: true,
                    success: responseText => {
                        resolve(responseText)
                    }
                })
            });
        }
        /**
         * 通过tag名获取tag的id
         * @param {string} tagename
         * tag名
         * @returns {Promise}
         * 正确: tag ID
         * 错误: -1
         */
        getTagIDByTagName(tagename) {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.bilibili.com/x/tag/info',
                    queryStringsObj: {
                        tag_name: tagename
                    },
                    hasCookies: false,
                    success: responseText => {
                        const res = Basic.prototype.strToJson(responseText);
                        if (res.code !== 0) {
                            Tooltip.warn('获取TagID失败');
                            resolve(-1)
                        }
                        resolve(res.data.tag_id)
                    }
                })
            });
        }
        /**
         * 获取开奖信息
         * @param {string} dyid
         * 动态id
         * @returns {Promise<{ts:number,text:string}>}
         * 开奖时间
         */
        getLotteryNotice(dyid) {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.vc.bilibili.com/lottery_svr/v1/lottery_svr/lottery_notice',
                    queryStringsObj: {
                        dynamic_id: dyid
                    },
                    hasCookies: false,
                    success: responseText => {
                        const res = this.strToJson(responseText);
                        if (res.code === 0) {
                            const timestamp10 = res.data.lottery_time,
                                timestamp13 = timestamp10 * 1000,
                                time = new Date(timestamp13);
                            const remain = (() => {
                                const timestr = ((timestamp13 - Date.now()) / 86400000).toString(),
                                    timearr = timestr.replace(/(\d+)\.(\d+)/, "$1,0.$2").split(',');
                                return `${timearr[0]}天余${parseInt(timearr[1] * 24)}小时`
                            })();
                            resolve({
                                ts: timestamp10,
                                text: `开奖时间: ${time.toLocaleString()} 还有${remain}`
                            });
                        } else {
                            Tooltip.warn(`获取开奖信息失败\n${responseText}`);
                            resolve({
                                ts: 0
                            })
                        }
                    }
                })
            });
        }
        /**
         * 之前不检查是否重复关注
         * 自动关注
         * 并转移分组
         * @param {Number} uid
         * 被关注者的UID
         */
        autoAttention(uid) {
            let self = this;
            Ajax.post({
                url: 'https://api.bilibili.com/x/relation/modify',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    fid: `${uid}`,
                    act: 1,
                    re_src: 11,
                    jsonp: 'jsonp',
                    csrf: GlobalVar.csrf
                },
                success: responseText => {
                    if (/^{"code":0/.test(responseText)) {
                        Tooltip.log('[自动关注]关注+1')
                        /* 移动分区 */
                        Ajax.post({
                            url: 'https://api.bilibili.com/x/relation/tags/addUsers?cross_domain=true',
                            hasCookies: true,
                            dataType: 'application/x-www-form-urlencoded',
                            data: {
                                fids: uid,
                                tagids: self.tagid,
                                csrf: GlobalVar.csrf
                            },
                            success: responseText => {
                                if (/^{"code":0/.test(responseText)) {
                                    Tooltip.log('[移动分区]up主分区移动成功');
                                } else {
                                    Tooltip.warn(`[移动分区]up主分区移动失败\n${responseText}`);
                                }
                            }
                        })
                    }
                }
            })
        }
        /**
         * 取消关注
         * @param {number} uid 
         */
        cancelAttention(uid) {
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
                    const res = this.strToJson(responseText)
                    if (res.code === 0) {
                        Tooltip.log('[自动取关]取关成功')
                    } else {
                        Tooltip.warn(`[自动取关]取关失败\n${responseText}`)
                    }
                }
            })
        }
        /**
         * 转发前因查看是否重复转发
         * 自动转发
         * @param {Number} uid
         * 自己的UID
         * @param {string} dyid
         * 动态的ID
         */
        autoRelay(uid, dyid) {
            Ajax.post({
                url: 'https://api.vc.bilibili.com/dynamic_repost/v1/dynamic_repost/repost',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    uid: `${uid}`,
                    dynamic_id: dyid,
                    content: '冲冲冲',
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
        }
        /**
         * 移除动态
         * @param {string} dyid 
         */
        rmDynamic(dyid) {
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
        }
        /**
         * 发送评论
         * @param {string} dyid
         * cid_str
         * @param {number} type
         * 1(视频)
         * 11(有图)
         * 17(无图)
         * @param {string} msg
         */
        sendChat(dyid,type,msg) {
            Ajax.post({
                url: 'https://api.bilibili.com/x/v2/reply/add',
                hasCookies: true,
                dataType: 'application/x-www-form-urlencoded',
                data: {
                    oid: dyid,
                    type: type,
                    message: msg,
                    jsonp: 'jsonp',
                    csrf: GlobalVar.csrf
                },
                success: responseText => {
                    if (/^{"code":0/.test(responseText)) {
                        console.log('[自动评论]评论成功');
                    } else {
                        console.warn(`[自动评论]评论失败`)
                    }
                }
            })
        }
        /**
         * 互动抽奖
         * 处理来自动态页面的数据
         * @param {String} res
         * @returns {
            {
                modifyDynamicResArray: {
                    uid: number;
                    dynamic_id: string;
                    description: string;
                    type: string;
                    origin_uid: string;
                    origin_rid_str: string;
                    origin_dynamic_id: string;
                    origin_hasOfficialLottery: boolean;
                    origin_description: string;
                    origin_type: string;
                }[];
                nextinfo: {
                    has_more: number;
                    next_offset: string;
                };
            }
        }
         * 返回对象,默认为null
         */
        modifyDynamicRes(res) {
            const strToJson = Basic.prototype.strToJson,
                jsonRes = strToJson(res),
                Data = jsonRes.data;
            if (jsonRes.code !== 0) {
                Tooltip.warn('获取动态数据出错');
                return null;
            }
            const offset = /(?<=next_offset":)[0-9]*/.exec(res)[0], /* 字符串防止损失精度 */
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
                    let obj = {}, /* 储存单个动态中的信息 */
                        desc = onecard.desc,
                        card = onecard.card;
                    /**
                     * 转化后的字符串形式的Json数据
                     */
                    const cardToJson = strToJson(card);
                    obj.uid = desc.uid; /* 转发者的UID */
                    obj.dynamic_id = desc.dynamic_id_str; /* 转发者的动态ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
                    if (desc.orig_dy_id_str === '0') {
                        try {
                            obj.description = cardToJson.item.description; /* 转发者的描述 */
                        } catch (error) {
                            obj.type = '视频或其他';
                        }
                    } else {
                        obj.origin_uid = desc.origin.uid; /* 被转发者的UID */
                        obj.origin_rid_str = desc.origin.rid_str /* 被转发者的rid(用于发评论) */
                        obj.origin_dynamic_id = desc.orig_dy_id_str; /* 被转发者的动态的ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
                        obj.origin_hasOfficialLottery = (typeof cardToJson.origin_extension === 'undefined') ? false : true; /* 是否有官方抽奖 */
                        try {
                            obj.description = cardToJson.item.content; /* 转发者的描述 */
                            obj.origin_description = strToJson(cardToJson.origin).item.description; /* 被转发者的描述 */
                        } catch (error) {
                            obj.origin_type = '视频或其他';
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
         * 检查分区
         * 不存在指定分区时创建
         * 获取到tagid添加为对象的属性
         */
        checkMyPartition() {
            let self = this;
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
                                    let obj = self.strToJson(responseText);
                                    if (obj.code === 0) {
                                        Tooltip.log('[新建分区]分区新建成功')
                                        self.tagid = obj.data.tagid /* 获取tagid */
                                        resolve()
                                    }
                                }
                            })
                        } else {
                            /* 此处可能会出现问题 */
                            self.tagid = /[0-9]*(?=,"name":"此处存放因抽奖临时关注的up")/.exec(responseText)[0] /* 获取tagid */
                            resolve()
                        }
                    }
                })
            });
        }
        /**
         * 检查所有的动态信息
         * @param {string} UID
         * 指定的用户UID
         * @param {number} pages
         * 读取页数
         * @returns {Promise<{uid: any,dynamic_id: any,uname: any,description: any,type: string,origin_uid: any,origin_rid_str: string,origin_dynamic_id: any,origin_hasOfficialLottery: boolean,origin_description: any,origin_type: string;}[]>}
         * 获取前 pages*12 个动态信息
         */
        checkAllDynamic(hostuid, pages) {
            const self = this,
                mDR = self.modifyDynamicRes,
                getOneDynamicInfo = self.getOneDynamicInfo,
                curriedGetOneDynamicInfo = self.curryify(getOneDynamicInfo); /* 柯里化的请求函数 */
            /**
             * 储存了特定UID的请求函数
             */
            let hadUidGetOneDynamicInfo = curriedGetOneDynamicInfo(hostuid);
            /**
             * 储存所有经过整理后信息
             * [{}{}...{}]
             */
            let allModifyDynamicResArray = [];
            let depth = pages; /* 递归深度最大值 */
            return new Promise((resolve) => {
                /**
                 * 下一页动态
                 * @param {string} offset 
                 */
                function next(offset) {
                    let OneDynamicInfo = hadUidGetOneDynamicInfo(offset);
                    OneDynamicInfo.then(res => {
                        const mDRdata = mDR.call(self, res); /* 注意匿名函数中的this */
                        if (mDRdata === null) {
                            resolve(allModifyDynamicResArray)
                            return;
                        }
                        /**
                         * 储存一片动态信息
                         * [{}{}...{}]
                         */
                        const mDRArry = mDRdata.modifyDynamicResArray,
                            nextinfo = mDRdata.nextinfo;
                        if (nextinfo.has_more === 0) {
                            resolve(allModifyDynamicResArray);
                            return;
                        } else {
                            allModifyDynamicResArray.push.apply(allModifyDynamicResArray, mDRArry);
                            Tooltip.log('开始读取下一页动态信息');
                            depth--;
                            if (depth === 0) {
                                resolve(allModifyDynamicResArray);
                                return;
                            }
                            next(nextinfo.next_offset);
                        }
                    })
                }
                next(0)
            });
        }
    }
    /**
     * 监视器
     */
    class Monitor extends Basic {
        constructor(UID) {
            super();
            this.UID = UID;
            this.tagid = 0; /* tagid初始化为默认分组 */
        }
        /**
         * 初始化
         */
        init() {
            const self = this;
            let ckPartition = self.checkMyPartition(); /* 检查关注分区 */
            let cADynamic = self.checkAllDynamic(GlobalVar.myUID, 5); /* 检查我的所有动态 */
            Promise.all([ckPartition, cADynamic]).then(result => {
                /**
                 * 前五页动态Array
                 */
                const cADdata = result[1];
                /**
                 * 储存转发过的动态信息
                 */
                let array = [];
                for (let index = 0; index < cADdata.length; index++) {
                    const oneDynamicObj = cADdata[index];
                    if (typeof oneDynamicObj.origin_dynamic_id === 'string') {
                        array.push(oneDynamicObj.origin_dynamic_id)
                    }
                }
                self.lottery(array.toString());
            })
        }
        /**
         * 获取第一页的动态信息
         * 滤出抽奖信息
         * 参与抽奖
         * @param {string} relayedStrings
         * 已转发的抽奖动态
         */
        async lottery(relayedStrings) {
            const self = this;
            let getDI = await self.getOneDynamicInfo(self.UID, 0);
            /**
             * 最新的动态数据
             */
            const mDRdata = self.modifyDynamicRes(getDI);
            /**
             * 自己的关注列表
             */
            let attentions = '';
            if (mDRdata === null) {
                return;
            }
            try {
                attentions = Basic.prototype.strToJson(getDI).data.attentions.uids.toString();
            } catch (error) {
                Tooltip.warn('读取关注列表出错')
            }
            /**
             * 滤出的抽奖信息
             */
            let lotteryCard = [];
            for (const info of mDRdata.modifyDynamicResArray) {
                let isRepeat = true;
                let lotteryinfo = {
                    origin_uid: undefined,
                    origin_dynamic_id: undefined,
                    origin_rid_str: undefined
                };
                const origin_description = (typeof info.origin_description === 'undefined') ? '' : info.origin_description;
                if (/抽奖/.test(origin_description)) {
                    let oneLNotice = info.origin_hasOfficialLottery
                        ? await self.getLotteryNotice(info.origin_dynamic_id)
                        : { ts: Infinity, text: '非官方抽奖请自行查看' };
                    if (oneLNotice.ts > (Date.now()) / 1000 || oneLNotice.ts === 0) {
                        /* 判断是否重复关注 */
                        {
                            const origin_uid = info.origin_uid;
                            const reg1 = new RegExp(origin_uid);
                            if (!reg1.test(attentions)) {
                                lotteryinfo.origin_uid = origin_uid;
                            }
                        }
                        /* 判断是否重复转发 */
                        {
                            const origin_dynamic_id = info.origin_dynamic_id;
                            const reg2 = new RegExp(origin_dynamic_id);
                            if (!reg2.test(relayedStrings)) {
                                lotteryinfo.origin_dynamic_id = origin_dynamic_id;
                            }
                        }
                        /* 用于评论 */
                        lotteryinfo.origin_rid_str = info.origin_rid_str;
                        for (const key in lotteryinfo) {
                            if (typeof lotteryinfo[key] !== 'undefined') {
                                isRepeat = false;
                                break;
                            }
                        }
                        isRepeat ? void 0 : lotteryCard.push(lotteryinfo);
                    }
                }
            }
            /**
             * 执行操作
             */
            const len = lotteryCard.length;
            let index = 0;
            if (len === 0) {
                startAndNextUID()
            } else {
                for (const lotteryinfo of lotteryCard) {
                    const origin_uid = lotteryinfo.origin_uid,
                        origin_dynamic_id = lotteryinfo.origin_dynamic_id,
                        origin_rid_str = lotteryinfo.origin_rid_str;
                    if (typeof origin_uid === 'undefined' || typeof origin_dynamic_id === 'undefined' || typeof origin_rid_str === 'undefined') {
                        void 0
                    } else {
                        self.autoAttention(origin_uid);
                        self.autoRelay(GlobalVar.myUID, origin_dynamic_id),
                            self.sendChat(origin_rid_str,11, GlobalVar.getChat())
                        await GlobalVar.delay(10000);
                    }
                    if (index++ === len - 1) {
                        Tooltip.log('开始转发下一组动态');
                        startAndNextUID();
                    } else {
                        void 0;
                    }
                }
            }
        }
    }
    /**
     * 开奖信息与展示
     */
    class LotteryNotice extends Basic {
        constructor() {
            super();
            this.info = null;
        }
        /**
         * 初始化
         */
        init() {
            const DOC = document
            /* 主体区域 */
            const shanmitemain = DOC.createElement('div');
            shanmitemain.setAttribute('class', 'shanmitemain');
            DOC.body.appendChild(shanmitemain);
            /* 样式表 */
            const style = DOC.createElement('style');
            style.innerText = ".shanmitemain {z-index:99999;position:fixed;right:8px;top:68%;}.shanmiterefresh {position:absolute;left:0;top:-2em;width:15px;height:15px;border-radius:50%;cursor:pointer;background:url('https://tse2-mm.cn.bing.net/th/id/OIP.5LiyglYTGJYrttXqc20rcQHaHW?w=170&h=180&c=7&o=5&dpr=1.5&pid=1.7') no-repeat;background-size:cover;transition:0.3s ease 0s;}.shanmiterefresh:hover {transform:rotateZ(360deg)}.shanmiteclick {display:inline-block;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;width:1em;border:2px solid skyblue;background-color:#C3E7F5;transition:.3s all ease 0s;}.shanmiteclick:hover {background-color:skyblue;}.shanmiteinfo {position:absolute;overflow-y:scroll;right:2em;bottom:0;width:450px;height:300px;box-shadow:black;border:2px solid skyblue;box-shadow:0px 0px 6px 0px black;background-color:#C3E7F5;}.shanmiteinfo div {padding:2px;}.shanmitelink {padding:0 5px;}"
            shanmitemain.appendChild(style);
            /* 点击区域 */
            const shanmiteclick = DOC.createElement('span');
            shanmiteclick.setAttribute('id', 'info');
            shanmiteclick.setAttribute('class', 'shanmiteclick');
            shanmiteclick.innerText = '开奖信息';
            shanmitemain.appendChild(shanmiteclick);
            /* 刷新 */
            const shanmiterefresh = DOC.createElement('span');
            shanmiterefresh.setAttribute('id', 'refresh');
            shanmiterefresh.setAttribute('class', 'shanmiterefresh');
            shanmitemain.appendChild(shanmiterefresh);
            /* 展示信息的区域 */
            const shanmiteinfo = DOC.createElement('div');
            shanmiteinfo.setAttribute('class', 'shanmiteinfo');
            shanmitemain.appendChild(shanmiteinfo);
            this.basicAction();
        }
        /**
         * 基本互动操作
         */
        basicAction() {
            const self = this,
                main = document.querySelector('.shanmitemain'),
                info = main.querySelector('.shanmiteinfo');
            self.info = info;
            info.style.display = 'none';
            self.sortInfoAndShow();
            main.addEventListener('click', (ev) => {
                switch (ev.target.id) {
                    case 'refresh':
                        self.sortInfoAndShow();
                        self.info.innerHTML = '';
                        break;
                    case 'info':
                        if (info.style.display === 'none') {
                            info.style.display = 'block';
                        } else {
                            info.style.display = 'none';
                        }
                        break;
                    case 'button':
                        self.rmDynamic(ev.target.dataset.dyid)
                        self.cancelAttention(ev.target.dataset.originUID)
                        break;
                    default:
                        break;
                }
            })
        }
        /**
         * 提取所需的信息
         * @return {Promise<{ts:number,text:string,dynamic_id:number,origin_uid:number,origin_dynamic_id:string}[]>}
         * 截止时间戳
         * 文本
         * 本动态ID
         * 源up主UID
         * 源动态ID
         */
        async fetchDynamicInfo() {
            const self = this;
            let allMDResArray = await self.checkAllDynamic(GlobalVar.myUID, 5);
            /**
             * 滤出抽奖信息
             */
            const _arr = allMDResArray.filter(a => {
                let beFilter = false;
                const origin_description = a.origin_description;
                if (typeof origin_description === 'undefined') {
                    return beFilter;
                } else {
                    if (/抽奖/.test(origin_description)) {
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
                    origin_hasOfficialLottery: a.origin_hasOfficialLottery,
                    origin_uid: a.origin_uid,
                    origin_dynamic_id: a.origin_dynamic_id
                }
            })
            let elemarray = [];
            for (let one of arr) {
                let LotteryNotice = one.origin_hasOfficialLottery
                    ? await self.getLotteryNotice(one.origin_dynamic_id) 
                    : {ts:0,text:'非官方抽奖请自行查看'};
                LotteryNotice.dynamic_id = one.dynamic_id;//用于删除动态
                LotteryNotice.origin_uid = one.origin_uid;//取关
                LotteryNotice.origin_dynamic_id = one.origin_dynamic_id//用于查看开奖信息
                elemarray.push(LotteryNotice);
            }
            return elemarray;
        }
        /**
         * 排序后展示
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
                self.showInfo(one)
            })
            return;
        }
        /**
         * 展示一条信息
         * @param {{ts:number,text:string,dynamic_id:number,origin_uid:number,origin_dynamic_id:string}} oneInfo
         */
        showInfo(oneInfo) {
            const DOC = document;
            /**
             * 容纳一条信息
             */
            const div = DOC.createElement('div');
            /**
             * 主要开奖信息
             */
            const span = DOC.createElement('span');
            span.innerText = oneInfo.text;
            /**
             * 跳转链接
             */
            const a = DOC.createElement('a');
            a.setAttribute('class', 'shanmitelink');
            a.href = `https://t.bilibili.com/${oneInfo.origin_dynamic_id}`;
            a.target = '_blank';
            a.innerText = '查看详情';
            /**
             * 移除按钮
             */
            const button = DOC.createElement('button');
            button.id = 'button';
            button.dataset.dyid = oneInfo.dynamic_id;
            button.dataset.originUID = oneInfo.origin_uid;
            button.type = 'button';
            button.innerText = '删除动态';
            div.appendChild(span);
            div.appendChild(a);
            div.appendChild(button)
            this.info.appendChild(div);
        }
    }
    /**
     * 下一个
     * @returns {function}
     */
    const startAndNextUID = (() => {
        let i = 0;
        if (/(?<=space\.bilibili\.com\/)[0-9]*(?=\/?)/.exec(window.location.href)[0] === GlobalVar.myUID) {
            Basic.prototype.sendChat('449626403800921162',17,(new Date(Date.now())).toLocaleString());
            (new Monitor(uids[i])).init();
            (new LotteryNotice()).init();
        } else {
            Tooltip.log(document.title);
        }
        return () => {
            if (i === uids.length - 1) {
                Tooltip.log('所有动态转发完毕');
                Tooltip.log('[运行结束]目前无抽奖信息,过一会儿再来看看吧')
                return;
            }
            (new Monitor(uids[++i])).init();
        }
    })()
})();