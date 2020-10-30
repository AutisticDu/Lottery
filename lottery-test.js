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
// ==/UserScript==
(function () {
    const config = {
        version: '|version: 3.4.1',
        refresh_time: 3600000,
        model: 3
    }
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
            console.log(text);
            _add('out outLog', text)
        }
        /**
         * 警告信息
         * @param {string} text 
         */
        function warn(text) {
            console.warn(text);
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
        const [myUID,csrf] = (()=>{
            const a = /((?<=DedeUserID=)\d+).*((?<=bili_jct=)\w+)/g.exec(document.cookie);
            return [a[1],a[2]]
        })()
        const chat = [
            '[OK]','[星星眼]','[歪嘴]','[喜欢]','[偷笑]','[笑]','[喜极而泣]','[辣眼睛]','[吃瓜]','[奋斗]',
            '永不缺席 永不中奖 永不放弃！','万一呢','在','冲吖~','来了','万一','[保佑][保佑]','从未中，从未停','[吃瓜]','[抠鼻][抠鼻]',
            '来力','秋梨膏','[呲牙]','从不缺席','分子','可以','恰','不会吧','1','好',
            'rush','来来来','ok','冲','凑热闹','我要我要[打call]','我还能中！让我中！！！','大家都散了吧，已经抽完了，是我的','我是天选之子','给我中一次吧！',
            '坚持不懈，迎难而上，开拓创新！','[OK][OK]','我来抽个奖','中中中中中中','[doge][doge][doge]','我我我',
        ];
        const UIDs = [
            213931643,
            15363359,
            31252386,
            80158015,
            678772444,
            35719643,
            223748830,
            420788931,
            689949971,
            38970985
        ];
        const TAGs = [
            '抽奖',
            '互动抽奖',
            '转发抽奖',
            '动态抽奖'
        ];
        /**
         * 抽奖信息
         */
        const Lottery = ((model)=>{
            let ret = undefined;
            switch (model) {
                case 0:
                    UIDs.push.apply(UIDs,TAGs);
                    ret = UIDs;
                    break
                case 1:
                    ret = UIDs;
                    break;
                case 2:
                    ret = TAGs;
                    break;
                default:
                    ret = [];
                    break;
            }
            return ret
        })(config.model);
        /**
         * 返回字符串  
         * @returns {string}
         */
        const getChat = () => {
            return chat[parseInt(Math.random()*chat.length)]
        }
        /**
         * 从本地获取dyid
         * (如果没有就初始化)
         * @returns {Promise<string|void>}
         */
        const getAllMyDyID = async() => {
            /**@type {string} */
            // eslint-disable-next-line no-undef
            let allmydyid = await GM.getValue("AllMyDyID");
            if (typeof allmydyid === 'undefined') {
                Tooltip.log('第一次使用,初始化中...')
                let alldy = await Public.prototype.checkAllDynamic(myUID,50);
                let array = [];
                for (let index = 0; index < alldy.length; index++) {
                    const oneDynamicObj = alldy[index];
                    if (typeof oneDynamicObj.origin_dynamic_id === 'string') {
                        array.push(oneDynamicObj.origin_dynamic_id)
                    }
                }
                await addDyID(array);
                return;
            } else {
                return allmydyid;
            }
        }
        /**
         * 设置本地dyid
         * @param {string[]} dyidarr
         * @returns {Promise<void>}
         */
        const addDyID = async dyidarr => {
            /**@type {string}*/
            // eslint-disable-next-line no-undef
            let previousdyid = await GM.getValue("AllMyDyID");
            if(typeof previousdyid === 'undefined') {
                // eslint-disable-next-line no-undef
                await GM.setValue("AllMyDyID",''+dyidarr);
                Tooltip.log('初始化成功');
                return;
            } else {
                /**@type {string[]}*/
                let previousdyidarr = previousdyid.split(',');
                const nowdyid = Array.from(new Set([...previousdyidarr, ...dyidarr]))
                // eslint-disable-next-line no-undef
                await GM.setValue("AllMyDyID",''+nowdyid);
                Tooltip.log('新增动态id数据存储至本地');
                return;
            }
        }
        return {
            myUID,
            csrf,
            Lottery,
            getChat,
            getAllMyDyID,
            addDyID
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
                        let res = Basic.strToJson(responseText)
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
         * 获取一次动态的信息
         * @param {number} UID
         * 被查看者的uid
         * @param {number} offset
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
                        host_uid: `${UID}`,
                        offset_dynamic_id: `${offset}`,
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
                        const res = Basic.strToJson(responseText);
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
         * 获取开奖信息
         * @param {string} dyid
         * 动态id
         * @returns {
            Promise<{
                ts:number;
                text:string
            } | {
                ts: 0;
                text: '获取开奖信息失败'
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
                        const res = Basic.strToJson(responseText);
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
                                ts: 0,
                                text: '获取开奖信息失败'
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
                    const res = Basic.strToJson(responseText)
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
                    content: '转发动态',
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
         * @returns {Promise<string|number>}
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
                                    let obj = Basic.strToJson(responseText);
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
                            resolve(tagid)
                        }
                    }
                })
            });
        },
    }
    /**
     * 基础工具
     */
    const Basic = {
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
        }
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
        checkAllDynamic (hostuid, pages) {
            const mDR = this.modifyDynamicRes,
                getOneDynamicInfoByUID = API.getOneDynamicInfoByUID,
                curriedGetOneDynamicInfoByUID = Basic.curryify(getOneDynamicInfoByUID); /* 柯里化的请求函数 */
            /**
             * 储存了特定UID的请求函数
             */
            let hadUidGetOneDynamicInfoByUID = curriedGetOneDynamicInfoByUID(hostuid);
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
                    let OneDynamicInfo = hadUidGetOneDynamicInfoByUID(offset);
                    OneDynamicInfo.then(res => {
                        const mDRdata = mDR(res);
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
            const strToJson = Basic.strToJson,
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
                            let item = cardToJson.item;
                            obj.description = typeof item.description === 'undefined' ? item.content : item.description; /* 转发者的描述 */
                        } catch (error) {
                            obj.description = '';
                        }
                    } else {
                        obj.origin_uid = desc.origin.uid; /* 被转发者的UID */
                        obj.origin_rid_str = desc.origin.rid_str /* 被转发者的rid(用于发评论) */
                        obj.origin_dynamic_id = desc.orig_dy_id_str; /* 被转发者的动态的ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
                        obj.origin_hasOfficialLottery = (typeof cardToJson.origin_extension === 'undefined') ? false : true; /* 是否有官方抽奖 */
                        try {
                            let item = strToJson(cardToJson.origin).item;
                            obj.origin_uname = strToJson(cardToJson.origin).user.name; /* 被转发者的name */
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
        }
        /**
         * 初始化
         */
        async init() {
            const self = this;
            let ckPartition = API.checkMyPartition(); /* 检查关注分区 */
            let cADynamic = self.checkAllDynamic(GlobalVar.myUID, 2); /* 检查我的所有动态 */
            let myAttentionList = API.getAttentionList(GlobalVar.myUID);
            Promise.all([ckPartition, cADynamic, myAttentionList]).then(async result => {
                self.tagid = result[0];
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
                self.attentionList = result[2];
                await GlobalVar.addDyID(array)
                self.startLottery();
            })
        }
        /**
         * 启动
         */
        async startLottery() {
            const allLottery = await this.filterLotteryInfo();
            const len = allLottery.length;
            let index = 0;
            if(len === 0){
                await startAndNextUID()
            } else {
                for (const Lottery of allLottery) {
                    this.go(Lottery);
                    await Basic.delay(20000);
                    if (index++ === len - 1) {
                        Tooltip.log('开始转发下一组动态');
                        await startAndNextUID();
                    } else {
                        void 0;
                    }
                }
            }
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
                tag_id = await API.getTagIDByTagName(self.tag_name),
                hotdy = await API.getHotDynamicInfoByTagID(tag_id),
                modDR = API.modifyDynamicRes(hotdy);
            if(modDR === null) return null;
            let mDRdata = modDR.modifyDynamicResArray;
            const newdy = await API.getOneDynamicInfoByTag(self.tag_name,modDR.nextinfo.next_offset);
            mDRdata.push.apply(mDRdata, API.modifyDynamicRes(newdy).modifyDynamicResArray);
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
                fomatdata = mDRdata.map(o=>{
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
            return fomatdata
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
            for (const info of protoLotteryInfo) {
                let onelotteryinfo = {};
                let isLottery = false;
                const description = typeof info.des === 'string' ? info.des : '';
                if(info.hasOfficialLottery) {
                    const oneLNotice = await API.getLotteryNotice(info.dyid);
                    isLottery = oneLNotice.ts > (Date.now() / 1000);
                } else {
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
                    let alldyid = await GlobalVar.getAllMyDyID();
                    reg2.test(alldyid) ? void 0 : onelotteryinfo.dyid = dynamic_id;
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
        go(obj) {
            const { uid, dyid, type, rid } = obj;
            typeof uid === 'number'
                ? (
                    API.autoAttention(uid).then(()=>{
                        API.movePartition(uid,this.tagid)
                    },()=>{
                        Tooltip.warn('未关注无法移动分区');
                    })
                )
                : void 0;
            typeof dyid === 'string'
                ? (
                    API.autolike(dyid),
                    API.autoRelay(GlobalVar.myUID, dyid)
                )
                : void 0;
            typeof rid === 'string'
                ? API.sendChat(rid, GlobalVar.getChat(), type)
                : void 0;
        }
    }
    /**
     * 查询最新的<60页动态
     * 开奖信息与展示
     */
    class LotteryNotice extends Public {
        constructor() {
            super();
            this.infos = null;
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
            style.innerText = ".shanmitemain {z-index:99999;position:fixed;right:8px;top:68%;}.shanmiterefresh {position:absolute;left:0;top:-2em;width:15px;height:15px;border-radius:50%;cursor:pointer;background:url('https://tse2-mm.cn.bing.net/th/id/OIP.5LiyglYTGJYrttXqc20rcQHaHW?w=170&h=180&c=7&o=5&dpr=1.5&pid=1.7') no-repeat;background-size:cover;transition:0.3s ease 0s;}.shanmiterefresh:hover {transform:rotateZ(360deg)}.shanmiteclick {display:inline-block;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;width:1em;border:2px solid skyblue;background-color:#C3E7F5;transition:.3s all ease 0s;}.shanmiteclick:hover {background-color:skyblue;}.shanmiteinfos {position:absolute;overflow-y:scroll;right:2em;bottom:0;width:500px;height:300px;box-shadow:black;border:2px solid skyblue;box-shadow:0px 0px 6px 0px black;background-color:#C3E7F5;}.shanmiteinfos div {padding:2px;}.shanmitelink {padding:0 5px;}.shanmiteinfos .shanmiteinfo {position:relative;}.shanmiteinfos #button2 {margin-left:5px;}.shanmiteinfos #button2::after{content:'移除up主:' attr(data-originuname);position:absolute;top:0px;left:0px;background-color:skyblue;color:black;padding:2px;border:1px solid #fff;opacity:0;transition:0.5s opacity;}.shanmiteinfos #button2:hover::after{opacity:1;}"
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
            const shanmiteinfos = DOC.createElement('div');
            shanmiteinfos.setAttribute('class', 'shanmiteinfos');
            shanmiteinfos.innerText = '请单击右侧刷新按钮以启动或刷新'
            shanmitemain.appendChild(shanmiteinfos);
            this.basicAction();
        }
        /**
         * 基本互动操作
         * @returns {void}
         */
        basicAction() {
            const self = this,
                main = document.querySelector('.shanmitemain'),
                infos = main.querySelector('.shanmiteinfos');
            self.infos = infos;
            infos.style.display = 'none';
            main.addEventListener('click', (ev) => {
                switch (ev.target.id) {
                    case 'refresh':
                        self.sortInfoAndShow();
                        self.infos.innerHTML = '';
                        break;
                    case 'info':
                        if (infos.style.display === 'none') {
                            infos.style.display = 'block';
                        } else {
                            infos.style.display = 'none';
                        }
                        break;
                    case 'button1':
                        API.rmDynamic(ev.target.dataset.dyid)
                        break;
                    case 'button2':
                        API.cancelAttention(ev.target.dataset.originUID)
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
                ts:number;
                text:string;
                dynamic_id:number;
                origin_uid:number;
                origin_uname:string;
                origin_dynamic_id:string
            }[] | {
                ts:0;
                text:'非官方抽奖请自行查看';
                dynamic_id:number;
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
                    origin_uname: a.origin_uname,
                    origin_dynamic_id: a.origin_dynamic_id
                }
            })
            /**
             * @type {
                {
                ts:number;
                text:string;
                dynamic_id:number;
                origin_uid:number;
                origin_uname:string;
                origin_dynamic_id:string
                }[] | {
                    ts:0;
                    text:'非官方抽奖请自行查看';
                    dynamic_id:number;
                    origin_uid:number;
                    origin_uname:string;
                    origin_dynamic_id:string
                }[]
            }
             */
            let elemarray = [];
            for (let one of arr) {
                /**
                 * @type {
                    {
                        ts:number;
                        text:string;
                        dynamic_id:number;
                        origin_uid:number;
                        origin_uname:string;
                        origin_dynamic_id:string
                    } | {
                        ts:0;
                        text:'非官方抽奖请自行查看';
                        dynamic_id:number;
                        origin_uid:number;
                        origin_uname:string;
                        origin_dynamic_id:string
                    }
                }
                 */
                let LotteryNotice = one.origin_hasOfficialLottery
                    ? await API.getLotteryNotice(one.origin_dynamic_id) 
                    : {ts:0,text:'非官方抽奖请自行查看'};
                LotteryNotice.dynamic_id = one.dynamic_id;/* 用于删除动态 */
                LotteryNotice.origin_uid = one.origin_uid;/* 取关 */
                LotteryNotice.origin_uname = one.origin_uname;/* 查看用户名 */
                LotteryNotice.origin_dynamic_id = one.origin_dynamic_id/* 用于查看开奖信息 */
                elemarray.push(LotteryNotice);
            }
            return elemarray;
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
                self.showInfo(one)
            })
            return;
        }
        /**
         * 展示一条信息
         * @param {
            {
                ts:number;
                text:string;
                dynamic_id:number;
                origin_uid:number;
                origin_uname:string;
                origin_dynamic_id:string
            }
        } oneInfo
         * @returns {void}
         */
        showInfo(oneInfo) {
            const DOC = document;
            /**
             * 容纳一条信息
             */
            const shanmiteinfo = DOC.createElement('div');
            shanmiteinfo.setAttribute('class', 'shanmiteinfo')
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
             * 删除动态
             */
            const button1 = DOC.createElement('button');
            button1.id = 'button1';
            button1.dataset.dyid = oneInfo.dynamic_id;
            button1.type = 'button';
            button1.innerText = '删除动态';
            /**
             * 移除关注
             */
            const button2 = DOC.createElement('button');
            button2.id = 'button2';
            button2.dataset.originUID = oneInfo.origin_uid;
            button2.dataset.originuname = oneInfo.origin_uname;
            button2.type = 'button';
            button2.innerText = '移除关注';
            /* 链接 */
            shanmiteinfo.appendChild(span);
            shanmiteinfo.appendChild(a);
            shanmiteinfo.appendChild(button1)
            shanmiteinfo.appendChild(button2)
            this.infos.appendChild(shanmiteinfo);
        }
    }
    /**
     * 下一个
     * @returns {function}
     */
    const startAndNextUID = (() => {
        let i = 0;
        if (/(?<=space\.bilibili\.com\/)[0-9]*(?=\/?)/.exec(window.location.href)[0] === GlobalVar.myUID) {
            setTimeout(()=>{location.reload()},config.refresh_time)/* 1h自动刷新 */
            Tooltip.log('一小时后自动刷新此页面');
            GlobalVar.getAllMyDyID().then(()=>{
                API.sendChat('449626403800921162',(new Date(Date.now())).toLocaleString()+config.version,17);
                GlobalVar.Lottery.length === 0 ? void 0 : (new Monitor(GlobalVar.Lottery[i])).init();
                (new LotteryNotice()).init();
            })
        } else {
            Tooltip.log(document.title);
        }
        return async () => {
            if (i === GlobalVar.Lottery.length - 1) {
                Tooltip.log('所有动态转发完毕');
                Tooltip.log('[运行结束]目前无抽奖信息,过一会儿再来看看吧');
                return;
            }
            (new Monitor(GlobalVar.Lottery[++i])).init();
            return;
        }
    })()
})();