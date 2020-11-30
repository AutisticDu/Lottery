// ==UserScript==
// @name         Bili动态抽奖助手
// @namespace    http://tampermonkey.net/
// @version      3.7.10
// @description  自动参与B站"关注转发抽奖"活动
// @author       shanmite
// @include      /^https?:\/\/space\.bilibili\.com/[0-9]*/
// @license      GPL
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// @grant        GM.xmlHttpRequest
// @connect      gitee.com
// ==/UserScript==
(function () {
    "use strict"
    let [Script, config ,errorbar] = [{},{},{}];
    /**
     * 基础工具
     */
    const Base = {
        /**
         * 安全的将JSON字符串转为对象
         * 超出精度的数转为字符串
         * @param {string} params
         * @return {object}
         * 返回对象或空对象
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
                console.error(`${str}<- It is not a string!`);
            }
            if (isJSON(params)) {
                let obj = JSON.parse(params);
                return obj
            } else {
                return {};
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
         * 节流
         * @param {Function} func 
         * @param {number} delay 当函数在短时间内多次触发时，做节流，间隔delay时长再去执行
         */
        throttle(func, delay) {
            let timer = null, // 用来保存setTimeout返回的值
                startTime = Date.now(); // 创建节流函数的时间
            return function () {
                let curTime = Date.now(), // 返回的这个函数被调用的时间
                    remaining = delay - (curTime - startTime), // 设定的delay与[上一次被调用的时间与现在的时间间隔]的差值
                    context = this, // 上下文对象
                    args = arguments; // 返回的这个函数执行时传入的参数
                // 首先清掉定时器
                clearTimeout(timer);
                // // 假如距离上一次执行此函数的时间已经超过了设定的delay，则执行
                if (remaining <= 0) {
                    func.apply(context, args);
                    startTime = Date.now(); // 重置最后执行时间为现在
                    // 否则，等到间隔时间达到delay时，执行函数
                } else {
                    timer = setTimeout(() => {
                        func.apply(context, args);
                    }, remaining);
                }
            }
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
        createCompleteElement: (StructInfo) => {
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
        /**
         * 提取开奖信息
         * @param {string} des 描述
         * @returns {
                {
                    ts: number|0;
                    text:string|'开奖时间: 未填写开奖时间';
                    item:string|'请自行查看';
                    isMe:string|'请自行查看';
                }
         * }
         */
        getLotteryNotice: des => {
            const r = /([\d零一二两三四五六七八九十]+)[.月]([\d零一二两三四五六七八九十]+)[日号]?/;
            if (des === '') return {
                ts: 0,
                text: `开奖时间: 未填写开奖时间`,
                item: '请自行查看',
                isMe: '请自行查看'
            }
            const _date = r.exec(des) || [];
            const timestamp10 = ((month, day) => {
                if (month && day) {
                    let date = new Date(`${new Date(Date.now()).getFullYear()}-${month}-${day} 23:59:59`).getTime()
                    if (!isNaN(date)) return date / 1000;
                }
                return 0
            })(_date[1], _date[2])
            if ( timestamp10 === 0) return {
                ts: 0,
                text: `开奖时间: 未填写开奖时间`,
                item: '请自行查看',
                isMe: '请自行查看'
            }
            const timestamp13 = timestamp10 * 1000,
                time = new Date(timestamp13);
            const remain = (() => {
                const timestr = ((timestamp13 - Date.now()) / 86400000).toString()
                    , timearr = timestr.replace(/(\d+)\.(\d+)/, "$1,0.$2").split(',');
                const text = timearr[0][0] === '-' ? `开奖时间已过${timearr[0].substring(1)}天余${parseInt(timearr[1] * 24)}小时` : `还有${timearr[0]}天余${parseInt(timearr[1] * 24)}小时`;
                return text
            })();
            return {
                ts: timestamp10,
                text: `开奖时间: ${time.toLocaleString()} ${remain}`,
                item: '请自行查看',
                isMe: '请自行查看'
            };
        },
        /**
         * @returns {Promise<{}>} 设置
         */
        getMyJson: () => {
            return new Promise((resolve) => {
                // eslint-disable-next-line no-undef
                GM.xmlHttpRequest({
                    method: "GET",
                    url: "https://gitee.com/shanmite/lottery-notice/raw/master/notice.json",
                    onload: function (response) {
                        resolve(JSON.parse(response.responseText));
                    }
                });
            });
        },
        /**存储 */
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
             * 存储本地值
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
            },
        }
    }
    /**
     * 浮动提示框
     */
    const Tooltip = (() => {
        const createCompleteElement = Base.createCompleteElement,
        cssContent = ".shanmitelogbox {z-index:99999;position:fixed;top:0;right:0;max-width:400px;max-height:600px;overflow-y:scroll;scroll-behavior:smooth;}.shanmitelogbox::-webkit-scrollbar {width:0;}.shanmitelogbox .line {display:flex;justify-content:flex-end;}.shanmitelogbox .Info {line-height:26px;min-height:26px;margin:6px 0;border-radius:6px;padding:0px 10px;transition:background-color 1s;font-size:16px;color:#fff;box-shadow:1px 1px 3px 0px #000;}.shanmitelogbox .Log {background-color:#81ec81;}.shanmitelogbox .Warn {background-color:#fd2d2d;}",
        /** 显示运行日志 */
        LogBox = createCompleteElement({
            tagname: 'div',
            attr: {
                class: 'shanmitelogbox',
            },
            children: [
                createCompleteElement({
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
            const log = createCompleteElement({
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
                    createCompleteElement({
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
        mod = {
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
        return mod;
    })()
    /**
     * 事件总线
     */
    const eventBus = (() => {
        const eTarget = new EventTarget()
            , mod = {
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
        return mod;
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
                        console.error(`status:${xhr.status}`);
                        options.success(`{"code":666,"msg":"错误代码${xhr.status}"}`);
                    }
                })
                xhr.addEventListener('error', () => {
                    console.error('ajax请求出错')
                    options.success('{"code":666,"msg":"ajax请求出错"}');
                })
                xhr.addEventListener('timeout', () => {
                    console.error('请求超时')
                    options.success('{"code":666,"msg":"请求超时"}');
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
                        console.error(`status:${xhr.status}`);
                        options.success(`{"code":666,"msg":"错误代码${xhr.status}"}`);
                    }
                })
                xhr.addEventListener('error', () => {
                    console.error('ajax请求出错')
                    options.success('{"code":666,"msg":"ajax请求出错"}');
                })
                xhr.addEventListener('timeout', () => {
                    console.error('请求超时')
                    options.success('{"code":666,"msg":"请求超时"}');
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
    const BiliAPI = {
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
         * 获取关注数
         * @param {number} uid
         * @returns {Promise<number | 0>}
         */
        getUserInfo: uid=>{
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.bilibili.com/x/web-interface/card',
                    queryStringsObj: {
                        mid: uid,
                    },
                    hasCookies: true,
                    success: responseText => {
                        const res = Base.strToJson(responseText);
                        if (res.code === 0) {
                            resolve(res.data.follower)
                        } else {
                            Ajax.get({
                                url: 'https://api.bilibili.com/x/relation/stat',
                                queryStringsObj: {
                                    vmid: uid
                                },
                                hasCookies: true,
                                success: responseText => {
                                    const res = Base.strToJson(responseText);
                                    if (res.code === 0) {
                                        resolve(res.data.follower)
                                    } else {
                                        Tooltip.warn(`获取关注数出错,可能是访问过频繁${responseText}`);
                                        resolve(0);
                                    }
                                }
                            })
                        }
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
                                const timestr = ((timestamp13 - Date.now()) / 86400000).toString()
                                    , timearr = timestr.replace(/(\d+)\.(\d+)/, "$1,0.$2").split(',');
                                const text = timearr[0][0] === '-' ? `开奖时间已过${timearr[0].substring(1)}天余${parseInt(timearr[1] * 24)}小时` : `还有${timearr[0]}天余${parseInt(timearr[1] * 24)}小时`;
                                return text
                            })();
                            let isMeB = (new RegExp(GlobalVar.myUID)).test(responseText);
                            const isMe = isMeB ? '中奖了！！！' : '未中奖';
                            const iteminfo = res.data.first_prize_cmt||''+'  '+res.data.second_prize_cmt||''+'  '+res.data.third_prize_cmt||'';
                            resolve({
                                ts: timestamp10,
                                text: `开奖时间: ${time.toLocaleString()} ${remain}`,
                                item: iteminfo,
                                isMe: isMe
                            });
                        } else {
                            Tooltip.log(`无法获取非官方抽奖信息\n${responseText}`);
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
         * 之前应检查是否重复关注
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
                            Tooltip.log(`[自动关注]失败,尝试切换线路\n${responseText}`);
                            Ajax.post({
                                url: 'https://api.vc.bilibili.com/feed/v1/feed/SetUserFollow',
                                hasCookies: true,
                                dataType: 'application/x-www-form-urlencoded',
                                data: {
                                    type: 1,
                                    follow: uid,
                                    csrf: GlobalVar.csrf
                                },
                                success: responseText => {
                                    if (/^{"code":0/.test(responseText)) {
                                        Tooltip.log('[自动关注]关注+1');
                                        resolve()
                                    } else {
                                        Tooltip.warn(`[自动关注]失败,请在"错误信息"处手动关注\n${responseText}`);
                                        errorbar.appendChild(Base.createCompleteElement({
                                            tagname: 'a',
                                            attr: {
                                                href: `https://space.bilibili.com/${uid}`,
                                                target: "_blank",
                                                style: "display: block;",
                                                title: '点击访问5s后自动移除'
                                            },
                                            script: (el)=>{
                                                el.addEventListener('click',()=>{
                                                    setTimeout(()=>{
                                                        el.parentNode.removeChild(el);
                                                    },5000)
                                                })
                                            },
                                            text: `未成功关注的up|uid:${uid}`
                                        }))
                                        reject()
                                    }
                                }
                            })
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
         * 获取一个分区中50个的id
         * @param {number} tagid
         * @param {number} n 1->
         * @returns {Promise<number[]>}
         */
        getPartitionUID: (tagid,n) =>{
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.bilibili.com/x/relation/tag',
                    queryStringsObj: {
                        mid: GlobalVar.myUID,
                        tagid: tagid,
                        pn: n,
                        ps: 50
                    },
                    hasCookies: true,
                    success: responseText => {
                        const res = Base.strToJson(responseText);
                        let uids = [];
                        if (res.code === 0) {
                            res.data.forEach(d => {
                                uids.push(d.mid);
                            })
                            Tooltip.log('[获取分组]成功获取取关分区列表');
                            resolve(uids)
                        } else {
                            Tooltip.warn(`[获取分组]获取取关分区列表失败\n${responseText}`);
                            resolve(uids)
                        }
                    }
                })
            });
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
                        Tooltip.log(`[自动取关]失败,尝试切换线路\n${responseText}`);
                        Ajax.post({
                            url: 'https://api.vc.bilibili.com/feed/v1/feed/SetUserFollow',
                            hasCookies: true,
                            dataType: 'application/x-www-form-urlencoded',
                            data: {
                                type: 0,
                                follow: uid,
                                csrf: GlobalVar.csrf
                            },
                            success: responseText => {
                                if (/^{"code":0/.test(responseText)) {
                                    Tooltip.log('[自动取关]取关成功');
                                } else {
                                    Tooltip.warn(`[自动取关]失败\n${responseText}`);
                                }
                            }
                        })
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
                        errorbar.appendChild(Base.createCompleteElement({
                            tagname: 'a',
                            attr: {
                                href: `https://t.bilibili.com/${dyid}`,
                                target: "_blank",
                                style: "display: block;",
                                title: '点击访问5s后自动移除'
                            },
                            script: (el) => {
                                el.addEventListener('click', () => {
                                    setTimeout(() => {
                                        el.parentNode.removeChild(el);
                                    }, 5000)
                                })
                            },
                            text: `未成功点赞的动态|动态id:${dyid}`,
                        }))
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
                        Tooltip.warn(`[转发动态]转发动态失败,请在"错误信息"处手动处理\n${responseText}`);
                        errorbar.appendChild(Base.createCompleteElement({
                            tagname: 'a',
                            attr: {
                                href: `https://t.bilibili.com/${dyid}`,
                                target: "_blank",
                                style: "display: block;",
                                title: '点击访问5s后自动移除'
                            },
                            script: (el) => {
                                el.addEventListener('click', () => {
                                    setTimeout(() => {
                                        el.parentNode.removeChild(el);
                                    }, 5000)
                                })
                            },
                            text: `未成功转发的动态|动态id:${dyid}`,
                        }))
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
         * @param {boolean} show
         * @param {string} dyid
         * @returns {Promise<0 | -1>}
         */
        sendChat: (rid, msg, type, show, dyid = '') => {
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
                        show ? Tooltip.log('[自动评论]评论成功') : void 0;
                    } else {
                        show ? Tooltip.warn(`[自动评论]评论失败,请在"错误信息"处手动评论${responseText}`) : void 0;
                        errorbar.appendChild(Base.createCompleteElement({
                            tagname: 'a',
                            attr: {
                                href: `https://t.bilibili.com/${dyid}`,
                                target: "_blank",
                                style: "display: block;",
                                title: '点击访问5s后自动移除'
                            },
                            script: (el) => {
                                el.addEventListener('click', () => {
                                    setTimeout(() => {
                                        el.parentNode.removeChild(el);
                                    }, 5000)
                                })
                            },
                            text: `未成功评论的动态|动态id:${dyid}`,
                        }))
                    }
                }
            })
        },
        /**
         * 检查分区  
         * 不存在指定分区时创建  
         * 获取到tagid添加为对象的属性  
         * @returns {Promise<number|0>}
         */
        checkMyPartition: () => {
            return new Promise((resolve) => {
                Ajax.get({
                    url: 'https://api.bilibili.com/x/relation/tags',
                    hasCookies: true,
                    success: responseText => {
                        const res = Base.strToJson(responseText);
                        let tagid = 0;
                        if (res.code === 0) {
                            const data = res.data;
                            for (let index = 0; index < data.length; index++) {
                                const element = data[index];
                                if (element.name === '此处存放因抽奖临时关注的up') {
                                    Tooltip.log('[获取分区id]成功');
                                    tagid = element.tagid;
                                    break;
                                }
                            }
                            if (tagid === 0) {
                                Ajax.post({
                                    url: 'https://api.bilibili.com/x/relation/tag/create',
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
                                            tagid = obj.data.tagid /* 获取tagid */
                                            resolve(tagid)
                                        } else {
                                            Tooltip.warn(`[新建分区]分区新建失败\n${responseText}`);
                                            resolve(tagid);
                                        }
                                    }
                                })
                            } else {
                                resolve(tagid);
                            }
                        } else {
                            Tooltip.warn(`[获取分区id]失败\n${responseText}`);
                            resolve(tagid);
                        }
                    }
                })
            });
        },
    }
    /**
     * 贮存全局变量
     */
    const GlobalVar = (() => {
        const [myUID,csrf] = (()=>{
            const a = /((?<=DedeUserID=)\d+).*((?<=bili_jct=)\w+)/g.exec(document.cookie);
            return [a[1],a[2]]
        })(),
            mod = {
                /**自己的UID*/
                myUID,
                /**防跨站请求伪造*/
                csrf,
                /**
                 * 获取本地存储信息
                 * 格式-> odyid:[dyid, ts, origin_uid]
                 */
                getAllMyLotteryInfo: async () => {
                    const allMyLotteryInfo = await Base.storage.get(myUID);
                    if (typeof allMyLotteryInfo === 'undefined') {
                        Tooltip.log('第一次使用,初始化中...');
                        let alldy = (await Public.prototype.checkAllDynamic(myUID, 50)).allModifyDynamicResArray;
                        let obj = {};
                        for (let index = 0; index < alldy.length; index++) {
                            const { dynamic_id, origin_dynamic_id ,origin_uid} = alldy[index];
                            if (typeof origin_dynamic_id === 'string') {
                                obj[origin_dynamic_id] = [dynamic_id, 0, origin_uid]
                            }
                        }
                        await Base.storage.set(myUID, JSON.stringify(obj));
                        Tooltip.log('初始化成功');
                    } else {
                        return allMyLotteryInfo
                    }
                },
                /**
                 * 增加动态信息
                 * @param {string|''} dyid
                 * @param {string} odyid
                 * @param {number|0} ts
                 * @param {number} ouid 
                 */
                addLotteryInfo: async (dyid, odyid, ts, ouid) => {
                    const allMyLotteryInfo = await mod.getAllMyLotteryInfo();
                    let obj = JSON.parse(allMyLotteryInfo);
                    Object.prototype.hasOwnProperty.call(obj, odyid) ? void 0 : obj[odyid] = [];
                    const [_dyid, _ts] = [obj[odyid][0], obj[odyid][1]];
                    obj[odyid][0] = typeof _dyid === 'undefined' ? dyid : dyid === '' ? _dyid : dyid;
                    obj[odyid][1] = typeof _ts === 'undefined' ? ts : ts === 0 ? _ts : ts;
                    obj[odyid][2] = ouid;
                    await Base.storage.set(myUID, JSON.stringify(obj));
                    Tooltip.log(`新增${dyid}:[${odyid},${ts},${ouid}]存储至本地`);
                    return;
                },
                /**
                 * 移除一条动态信息
                 * @param {string} odyid
                 */
                deleteLotteryInfo: async (odyid) => {
                    const allMyLotteryInfo = await mod.getAllMyLotteryInfo();
                    let obj = JSON.parse(allMyLotteryInfo);
                    delete obj[odyid];
                    await Base.storage.set(myUID, JSON.stringify(obj));
                    Tooltip.log(`本地移除dyid:${odyid}`);
                    return;
                },
            };
        return mod;
    })()
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
         * @param {number} time
         * 时延
         * @returns {
            Promise<{
                allModifyDynamicResArray: {
                    uid: number;
                    uname: string;
                    createtime: number;
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
                }[],
                offset: string
            }>
        } 获取前 pages*12 个动态信息
         */
        async checkAllDynamic(hostuid, pages, time = 0, _offset = '0') {
            Tooltip.log(`准备读取${pages}页自己的动态信息`);
            const mDR = this.modifyDynamicRes,
                getOneDynamicInfoByUID = BiliAPI.getOneDynamicInfoByUID,
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
            let offset = _offset;
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
                    offset = nextinfo.next_offset;
                    Tooltip.log(`成功读取${i+1}页信息(已经是最后一页了故无法读取更多)`);
                    break;
                } else {
                    allModifyDynamicResArray.push.apply(allModifyDynamicResArray, mDRArry);
                    i + 1 < pages ? Tooltip.log(`开始读取第${i+2}页动态信息`) : Tooltip.log(`${pages}页信息全部成功读取完成`);
                    offset = nextinfo.next_offset;
                }
                await Base.delay(time);
            }
            return ({ allModifyDynamicResArray, offset });
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
                    createtime: number;
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
                {data} = jsonRes;
            if (jsonRes.code !== 0) {
                Tooltip.warn('获取动态数据出错,可能是访问太频繁');
                return null;
            }
            /* 字符串防止损失精度 */
            const offset = typeof data.offset === 'string' ? data.offset : /(?<=next_offset":)[0-9]*/.exec(res)[0]
                , next = {
                    has_more: data.has_more,
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
                const Cards = data.cards;
                Cards.forEach(onecard => {
                    /**临时储存单个动态中的信息 */
                    let obj = {};
                    const {desc,card} = onecard
                        , {info} = desc.user_profile
                        , cardToJson = strToJson(card);
                    obj.uid = info.uid; /* 转发者的UID */
                    obj.uname = info.uname;/* 转发者的name */
                    obj.createtime = desc.timestamp /* 动态的ts10 */
                    obj.rid_str = desc.rid_str;/* 用于发送评论 */
                    obj.type = desc.type /* 动态类型 */
                    obj.orig_type = desc.orig_type /* 源动态类型 */
                    obj.dynamic_id = desc.dynamic_id_str; /* 转发者的动态ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
                    const {extension} = onecard;
                    obj.hasOfficialLottery = (typeof extension === 'undefined') ? false : typeof extension.lott === 'undefined' ? false : true; /* 是否有官方抽奖 */
                    const item = cardToJson.item || {};
                    obj.description = item.content || item.description || ''; /* 转发者的描述 */
                    if (obj.type === 1) {
                        obj.origin_uid = desc.origin.uid; /* 被转发者的UID */
                        obj.origin_rid_str = desc.origin.rid_str /* 被转发者的rid(用于发评论) */
                        obj.origin_dynamic_id = desc.orig_dy_id_str; /* 被转发者的动态的ID !!!!此为大数需使用字符串值,不然JSON.parse()会有丢失精度 */
                        const { origin_extension } = cardToJson ;
                        obj.origin_hasOfficialLottery = typeof origin_extension === 'undefined' ? false : typeof origin_extension.lott === 'undefined' ? false : true; /* 是否有官方抽奖 */
                        const origin = cardToJson.origin || '{}';
                        const { user, item } = strToJson(origin);
                        obj.origin_uname = typeof user === 'undefined' ? '' : user.name || user.uname || ''; /* 被转发者的name */
                        obj.origin_description = typeof item === 'undefined' ? '' : item.content || item.description || ''; /* 被转发者的描述 */
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
         * @param {string} tag_name
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
        async getLotteryInfoByTag(tag_name) {
            const self = this,
                tag_id = await BiliAPI.getTagIDByTagName(tag_name),
                hotdy = await BiliAPI.getHotDynamicInfoByTagID(tag_id),
                modDR = self.modifyDynamicRes(hotdy);
            if(modDR === null) return null;
            Tooltip.log(`开始获取带话题#${tag_name}#的动态信息`);
            let mDRdata = modDR.modifyDynamicResArray; /* 热门动态 */
            let next_offset = modDR.nextinfo.next_offset;
            for (let index = 0; index < 3; index++) {
                const newdy = await BiliAPI.getOneDynamicInfoByTag(tag_name,next_offset);
                const _modify = self.modifyDynamicRes(newdy);
                mDRdata.push.apply(mDRdata, _modify.modifyDynamicResArray);
                next_offset = _modify.nextinfo.next_offset;
            }
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
         * @param {string} UID
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
        async getLotteryInfoByUID(UID) {
            Tooltip.log(`开始获取用户${UID}的动态信息`);
            const self = this,
                dy = await BiliAPI.getOneDynamicInfoByUID(UID, 0),
                modDR = self.modifyDynamicRes(dy);
            if(modDR === null) return null;
            Tooltip.log(`成功获取用户${UID}的动态信息`);
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
            if (config.model === '00') { Tooltip.log('已关闭所有转发行为'); return }
            const tagid = await BiliAPI.checkMyPartition();
            if (tagid === 0) { Tooltip.log('未能成功获取关注分区id'); return }
            this.tagid = tagid; /* 检查关注分区 */
            this.attentionList = await BiliAPI.getAttentionList(GlobalVar.myUID);
            const isAdd = await this.startLottery();
            if (isAdd) {
                let cADynamic = (await this.checkAllDynamic(GlobalVar.myUID, 2)).allModifyDynamicResArray; /* 检查我的所有动态 */
                /**
                 * 储存转发过的动态信息
                 */
                for (let index = 0; index < cADynamic.length; index++) {
                    const {type,dynamic_id,origin_dynamic_id,origin_description,origin_uid} = cADynamic[index];
                    if (type === 1&& typeof origin_description !== 'undefined') {
                        await GlobalVar.addLotteryInfo(dynamic_id,origin_dynamic_id,0,origin_uid)
                    }
                }
                await this.clearDynamic();
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
                    }
                }
            }
        }
        /**
         * 保持800条动态
         */
        async clearDynamic() {
            const AllMyLotteryInfo = JSON.parse(await GlobalVar.getAllMyLotteryInfo());
            const keyArr = Object.keys(AllMyLotteryInfo);
            if (keyArr.length > 1000) {
                Tooltip.log('已储存1000条消息,开始删除最初转发的内容');
                for (let i = 0; i < keyArr.length - 1000; i++) {
                    let dyid = AllMyLotteryInfo[keyArr[i]][0];
                    GlobalVar.deleteLotteryInfo(keyArr[i]);
                    BiliAPI.rmDynamic(dyid);
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
                protoLotteryInfo = typeof self.UID === 'number' ? await self.getLotteryInfoByUID(self.UID) : await self.getLotteryInfoByTag(self.tag_name);
            if(protoLotteryInfo === null) return [];
            let alllotteryinfo = [];
            const {model,chatmodel,maxday:_maxday,minfollower,blockword,blacklist} = config;
            const maxday = _maxday === '-1'||_maxday === '' ? Infinity : (Number(_maxday) * 86400);
            for (const info of protoLotteryInfo) {
                const {uid,dyid,befilter,rid,des,type,hasOfficialLottery} = info;
                let onelotteryinfo = {};
                let isLottery = false;
                let isSendChat = false;
                let isBlock = false;
                let ts = 0;
                const description = typeof des === 'string' ? des : '';
                for (let index = 0; index < blockword.length; index++) {
                    const word = blockword[index];
                    const reg = new RegExp(word);
                    isBlock = reg.test(description) ? true : false;
                    if (isBlock) break;
                }
                if (isBlock) continue;
                if(hasOfficialLottery && model[0] === '1') {
                    const oneLNotice = await BiliAPI.getLotteryNotice(dyid);
                    ts = oneLNotice.ts;
                    isLottery = ts > (Date.now() / 1000) && ts < maxday;
                    isSendChat = chatmodel[0] === '1';
                }else if(!hasOfficialLottery&& model[1] === '1') {
                    const followerNum = await BiliAPI.getUserInfo(uid);
                    if (followerNum < Number(minfollower)) continue;
                    ts = Base.getLotteryNotice(description).ts;
                    isLottery = /[关转]/.test(description) && !befilter && (ts === 0 || (ts > (Date.now() / 1000) && ts < (Date.now() / 1000) + maxday));
                    isSendChat = chatmodel[1] === '1';
                }
                if(isLottery) {
                    const reg1 = new RegExp(uid);
                    const reg2 = new RegExp(dyid);
                    if (reg1.test(blacklist)||reg2.test(blacklist)) continue;
                    /* 判断是否关注过 */
                    reg1.test(self.attentionList) ? void 0 : onelotteryinfo.uid = uid;
                    /* 判断是否转发过 */
                    reg2.test(await GlobalVar.getAllMyLotteryInfo()) ? void 0 : onelotteryinfo.dyid = dyid;
                    /* 根据动态的类型决定评论的类型 */
                    onelotteryinfo.type = (type === 2) ? 11 : (type === 4) ? 17 : 0;
                    /* 是否评论 */
                    isSendChat ? onelotteryinfo.rid = rid : void 0;
                    if (typeof onelotteryinfo.uid === 'undefined' && typeof onelotteryinfo.dyid === 'undefined') continue;
                    await GlobalVar.addLotteryInfo('',dyid,ts,uid);
                    alllotteryinfo.push(onelotteryinfo);
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
                BiliAPI.autoRelay(GlobalVar.myUID, dyid);
                BiliAPI.autolike(dyid);
                if (typeof uid === 'number') {
                    BiliAPI.autoAttention(uid).then(()=>{
                        BiliAPI.movePartition(uid,this.tagid)
                    },()=>{
                        Tooltip.warn('未关注无法移动分区');
                    })
                }
                if (typeof rid === 'string'&& type !== 0) {
                    BiliAPI.sendChat(rid, Base.getRandomStr(config.chat), type, true, dyid);
                }
                await Base.delay(Number(config.wait));
            }
            return;
        }
    }
    /**
     * 主菜单
     */
    class MainMenu extends Public{
        constructor() {
            super();
            this.offset = '0';
        }
        init() {
            this.initUI();
            this.eventListener();
        }
        initUI() {
            const createCompleteElement = Base.createCompleteElement
                , cssContent = ".shanmitemenu {position:fixed;z-index:99999;right:30px;top:90%;}.shanmitemenu .icon {background-position:0em -8.375em;width:0.425em;height:0.4em;vertical-align:middle;display:inline-block;background-image:url(https://s1.hdslb.com/bfs/seed/bplus-common/icon/2.2.1/bp-svg-icon.svg);background-repeat:no-repeat;background-size:1em 23.225em;font-size:40px;font-style:italic;}.shanmitemenu .show {position:relative;overflow:hidden;padding-left:0px;line-height:30px;transition:0.3s all 0.1s cubic-bezier(0, 0.53, 0.15, 0.99);cursor:pointer;color:#178bcf;}.shanmitemenu .show:hover {padding-left:75px;}.shanmitemenu .box {position:absolute;right:20px;bottom:30px;background-color:#E5F4FB;padding:5px;border-radius:5px;box-shadow:grey 0px 0px 10px 0px;width:550px;height:550px;}.shanmitemenu button {font-size:14px;padding:0 5px;}.shanmitemenu .changetab {display:flex;-webkit-user-select:none;}.shanmitemenu .changetab div {margin:0 0 0 10px;padding:3px;border-radius:6px;border:2px solid #26c6da;font-size:14px;cursor:pointer;transition:background-color .3s ease 0s;background-color:#87cfeb80;}.shanmitemenu .changetab div:hover {background-color:skyblue;}.shanmitemenu .tab {display:none;overflow:hidden;overflow-y:scroll;height:510px;margin:3px;}.shanmitemenu .tab .card {font-size:15px;margin:15px;padding:5px;border-radius:5px;background-color:#ffffff ;box-shadow:gray 0px 0px 4px 0px;}.shanmitemenu .bottom {display:flex;justify-content:flex-end;align-items:flex-end;}.shanmitemenu .bottom button{margin-left:10px;}"
                , frg = createCompleteElement({
                    tagname: 'div',
                    attr: {
                        class: 'shanmitemenu',
                    },
                    text: '',
                    children: [
                        createCompleteElement({
                            tagname: 'style',
                            attr: {
                                type: 'text/css'
                            },
                            text: cssContent,
                        }),
                        createCompleteElement({
                            tagname: 'div',
                            attr: {
                                title: 'Bili互动抽奖助手',
                                class: 'show',
                            },
                            children: [
                                createCompleteElement({
                                    tagname: 'span',
                                    attr: {
                                        id: 'showall',
                                        style: 'position:absolute;right: 1.5em;width: 4em;font-size: 17px;-webkit-user-select: none;'
                                    },
                                    text: '抽奖助手',
                                }),
                                createCompleteElement({
                                    tagname: 'i',
                                    attr: {
                                        id: 'showall',
                                        class: 'icon',
                                        style: "position:relative;top:-2px;margin-left:2px;margin-right:2px;border: 1px dashed skyblue;"
                                    },
                                })
                            ]
                        }),
                        createCompleteElement({
                            tagname: 'div',
                            attr: {
                                class: 'box',
                                style: 'display: none;'
                            },
                            children: [
                                createCompleteElement({
                                    tagname: 'div',
                                    attr: {
                                        class: 'changetab',
                                    },
                                    children: [
                                        createCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                id: 'showtab0',
                                            },
                                            text: '开奖信息',
                                        }),
                                        createCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                id: 'showtab1',
                                            },
                                            text: '清理动态',
                                        }),
                                        createCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                id: 'showtab2',
                                            },
                                            text: '错误信息',
                                        }),
                                        createCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                id: 'showtab3',
                                            },
                                            text: '设置',
                                        }),
                                    ]
                                }),
                                createCompleteElement({
                                    tagname: 'div',
                                    attr: {
                                        class: 'tabs',
                                    },
                                    children: [
                                        createCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                class: 'tab info',
                                            },
                                            children: [
                                                createCompleteElement({
                                                    tagname: 'button',
                                                    attr: {
                                                        title: '自动下滚显示(wait 1s)',
                                                        id: 'autoscroll',
                                                        style: 'position: absolute;right: 30px;bottom: 80px;'
                                                    },
                                                    text: '自动下滚',
                                                }),
                                                createCompleteElement({
                                                    tagname: 'button',
                                                    attr: {
                                                        title: '显示并刷新开奖信息',
                                                        id: 'showlottery',
                                                        style: 'position: absolute;right: 30px;bottom: 50px;'
                                                    },
                                                    text: '显示开奖',
                                                }),
                                                createCompleteElement({
                                                    tagname: 'button',
                                                    attr: {
                                                        title: '启动脚本',
                                                        id: 'lottery',
                                                        style: 'position: absolute;right: 30px;bottom: 20px;'
                                                    },
                                                    text: '启动脚本',
                                                }),
                                            ]
                                        }),
                                        createCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                class: 'tab rmdy',
                                            },
                                            children: [
                                                createCompleteElement({
                                                    tagname: 'button',
                                                    attr: {
                                                        title: '仅移除动态',
                                                        id: 'rmdy',
                                                        style: 'position: absolute;right: 30px;bottom: 50px;'
                                                    },
                                                    text: '推荐模式',
                                                }),
                                                createCompleteElement({
                                                    tagname: 'button',
                                                    attr: {
                                                        title: '强力',
                                                        id: 'sudormdy',
                                                        style: 'position: absolute;right: 30px;bottom: 20px;'
                                                    },
                                                    text: '强力模式',
                                                }),
                                                createCompleteElement({
                                                    tagname: 'form',
                                                    attr: {
                                                        id: 'rmdyform',
                                                    },
                                                    children: [
                                                        createCompleteElement({
                                                            tagname: 'h3',
                                                            text: '推荐模式:',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '(使用存储在本地的动态id和开奖时间进行判断，移除过期的动态)',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'h3',
                                                            text: '强力模式:',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '(默认移除所有转发动态或临时关注up,使用前请在在白名单内填入不想移除的动态,请定期使用此功能清空无法处理的动态和本地存储信息)',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'span',
                                                            text: '移除',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'day',
                                                                value: '15',
                                                            }
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'span',
                                                            text: '天前的动态',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'br',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'span',
                                                            text: '或',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'page',
                                                                value: '5',
                                                            }
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'span',
                                                            text: '页前的动态',
                                                        })
                                                    ]
                                                })
                                            ]
                                        }),
                                        createCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                class: 'tab error',
                                            }
                                        }),
                                        createCompleteElement({
                                            tagname: 'div',
                                            attr: {
                                                class: 'tab config',
                                            },
                                            children: [
                                                createCompleteElement({
                                                    tagname: 'button',
                                                    attr: {
                                                        id: 'save',
                                                        style: 'position: absolute;right: 30px;bottom: 20px;'
                                                    },
                                                    text: '保存设置',
                                                }),
                                                createCompleteElement({
                                                    tagname: 'form',
                                                    attr: {
                                                        id: 'config',
                                                    },
                                                    children: [
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '当前版本'+Script.version+Script.author,
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'a',
                                                            attr: {
                                                                href: "https://greasyfork.org/zh-CN/scripts/415724",
                                                                target: '_blank'
                                                            },
                                                            text: '屏蔽自己的抽奖动态',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'h3',
                                                            text: '模式选择',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'label',
                                                            text: '转发官方抽奖',
                                                            children: [
                                                                createCompleteElement({
                                                                    tagname: 'input',
                                                                    attr: {
                                                                        type: 'checkbox',
                                                                        name: 'model'
                                                                    },
                                                                    script: el=>{
                                                                        config.model[0] === '1' ? el.checked = 'checked' : void 0;
                                                                    }
                                                                })
                                                            ]
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'label',
                                                            text: '转发非官方抽奖',
                                                            children: [
                                                                createCompleteElement({
                                                                    tagname: 'input',
                                                                    attr: {
                                                                        type: 'checkbox',
                                                                        name: 'model'
                                                                    },
                                                                    script: el=>{
                                                                        config.model[1] === '1' ? el.checked = 'checked' : void 0;
                                                                    }
                                                                })
                                                            ]
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'br',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'label',
                                                            text: '官方抽奖自动评论',
                                                            children: [
                                                                createCompleteElement({
                                                                    tagname: 'input',
                                                                    attr: {
                                                                        type: 'checkbox',
                                                                        name: 'chatmodel'
                                                                    },
                                                                    script: el => {
                                                                        config.chatmodel[0] === '1' ? el.checked = 'checked' : void 0;
                                                                    }
                                                                })
                                                            ]
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'label',
                                                            text: '非官方抽奖自动评论',
                                                            children: [
                                                                createCompleteElement({
                                                                    tagname: 'input',
                                                                    attr: {
                                                                        type: 'checkbox',
                                                                        name: 'chatmodel'
                                                                    },
                                                                    script: el => {
                                                                        config.chatmodel[1] === '1' ? el.checked = 'checked' : void 0;
                                                                    }
                                                                })
                                                            ]
                                                        }),
                                                        
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '开奖时间(默认-1:不限):',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'maxday',
                                                                value: config.maxday
                                                            },
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'span',
                                                            text: '天内',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '再次扫描间隔(完成所有转发后进行停止等待,于指定时间间隔后再次进行操作):',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'scan_time',
                                                                value: (Number(config.scan_time) / 60000).toString(),
                                                            }
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'span',
                                                            text: '分钟',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '转发间隔(每条动态的转发间隔时间):',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'wait',
                                                                value: (Number(config.wait) / 1000).toString(),
                                                            }
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'span',
                                                            text: '秒',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: 'up主粉丝数至少:',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'input',
                                                            attr: {
                                                                type: 'number',
                                                                name: 'minfollower',
                                                                value: config.minfollower,
                                                            }
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'span',
                                                            text: '人',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '动态描述屏蔽词(!注意!以下每一句用英文逗号分割):',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'blockword',
                                                                title: "转发动态中的屏蔽词"
                                                            },
                                                            text: config.blockword.toString(),
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '此处存放黑名单(用户UID或动态的ID):',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'blacklist',
                                                                title: "不再参与相关的的抽奖活动,动态的id指的是点进动态之后链接中的那一串数字,此处内容格式同上"
                                                            },
                                                            text: config.blacklist,
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '此处存放白名单(动态的ID):',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'whitelist',
                                                                title: "批量取关删动态时的受保护名单,此处内容格式同上"
                                                            },
                                                            text: config.whitelist,
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '转发动态评语',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'relay',
                                                                title: '可以自行增加@ 此处内容格式同上'
                                                            },
                                                            text: config.relay.toString(),
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '随机评论内容:',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'chat',
                                                                title: '此处内容格式同上'
                                                            },
                                                            text: config.chat.toString(),
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '监视的UID:',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'UIDs',
                                                                title: '此处内容格式同上'
                                                            },
                                                            text: config.UIDs.toString(),
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'p',
                                                            text: '监视的话题:',
                                                        }),
                                                        createCompleteElement({
                                                            tagname: 'textarea',
                                                            attr: {
                                                                cols: '65',
                                                                rows: '10',
                                                                name: 'TAGs',
                                                                title: '此处内容格式同上'
                                                            },
                                                            text: config.TAGs.toString(),
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
            const self = this
                , shanmitemenu = document.querySelector('.shanmitemenu')
                , box = shanmitemenu.querySelector('.box')
                , tabsarr = shanmitemenu.querySelectorAll('.tab')
                , infotab = shanmitemenu.querySelector('.tab.info')
                , configForm = shanmitemenu.querySelector('#config')
                , rmdyForm = shanmitemenu.querySelector('#rmdyform')
                , show = num => {
                    for (let index = 0; index < tabsarr.length; index++) {
                        const element = tabsarr[index];
                        element.style.display = index == num ? 'block' : 'none';
                    }
                }
            errorbar = shanmitemenu.querySelector('.tab.error');
            show(0);
            tabsarr[0].addEventListener(
                'scroll',
                Base.throttle(async (ev) => {
                    const tab = ev.target;
                    if(tab.scrollHeight - tab.scrollTop <= 310 && self.offset !=='-1')
                        await self.sortInfoAndShow();
                },1000)
            );
            shanmitemenu.addEventListener('click', ev => {
                const id = ev.target.id;
                switch (id) {
                    case 'showall':
                        if (box.style.display == 'block') {
                            box.style.display = 'none';
                        } else {
                            show(0);
                            box.style.display = 'block';
                        }
                        break;
                    case 'showtab0':
                        show(0);
                        break;
                    case 'showtab1':
                        show(1);
                        break;
                    case 'showtab2':
                        show(2);
                        break;
                    case 'showtab3':
                        show(3);
                        break;
                    case 'lottery':
                        eventBus.emit('Turn_on_the_Monitor');
                        break;
                    case 'showlottery':
                        {
                            const childcard = infotab.querySelectorAll('.card');
                            this.offset = '0';
                            childcard.forEach(card => {
                                infotab.removeChild(card);
                            })
                            this.sortInfoAndShow();
                        }
                        break;
                    case 'autoscroll':
                        {
                            const childcard = infotab.querySelectorAll('.card')
                                , self = this;
                            self.offset = '0';
                            childcard.forEach(card => {
                                infotab.removeChild(card);
                            });
                            (async function autoscroll(){
                                await self.sortInfoAndShow();
                                await Base.delay(1000);
                                if (self.offset !== '-1')
                                    autoscroll()
                            })()
                        }
                        break;
                    case 'rmdy':
                        (async () => {
                            let [i,j,k] = [0,0,0];
                            const str = await GlobalVar.getAllMyLotteryInfo()
                                , AllMyLotteryInfo = JSON.parse(str);
                            for (const odyid in AllMyLotteryInfo) {
                                if ({}.hasOwnProperty.call(AllMyLotteryInfo, odyid)) {
                                    const [dyid, ts, ouid] = AllMyLotteryInfo[odyid];
                                    if (ts === 0) {
                                        k++;
                                    } else {
                                        i++;
                                        if (ts < (Date.now() / 1000)) {
                                            j++;
                                            const { isMe } = await BiliAPI.getLotteryNotice(dyid);
                                            isMe === '中奖了！！！' ? alert(`恭喜！！！中奖了 前往https://t.bilibili.com/${dyid}查看`) : Tooltip.log('未中奖');
                                            Tooltip.log(`移除过期官方或非官方动态${dyid}`);
                                            BiliAPI.rmDynamic(dyid);
                                            BiliAPI.cancelAttention(ouid);
                                            await GlobalVar.deleteLotteryInfo(odyid)
                                        }
                                    }
                                }
                            }
                            alert(`清理动态完毕\n共查看${i + k}条动态\n能识别开奖时间的:共${i}条 过期${j}条 未开奖${i - j}条\n`);
                        })()
                        break;
                    case 'sudormdy':
                        (async () => {
                            const isKillAll = confirm('是否进入强力清除模式(建议在关注数达到上限时使用)\n请确认是否需要在白名单内填入不想移除的动态');
                            if (isKillAll) {
                                if (!confirm('请再次确定')) return;
                                const a = prompt('只删除动态请输入"1"\n只移除关注请输入"2"\n全选请输入"3"\n移除动态和移除关注最好分开进行');
                                const time = prompt('停顿时间(单位秒)');
                                const {
                                    day,
                                    page
                                } = rmdyForm;
                                let offset = '0';
                                const _time = Date.now()/1000 - Number(day.value)*86400;
                                if (a === "1" || a === "3") {
                                    for (let index = 0; index < 1000; index++) {
                                        const { allModifyDynamicResArray, offset: _offset } = await self.checkAllDynamic(GlobalVar.myUID, 1, Number(time) * 1000, offset);
                                        offset = _offset;
                                        if (index < Number(page.value)) {
                                            Tooltip.log(`跳过第${index}页(12条)`);
                                        } else {
                                            Tooltip.log(`开始读取第${index}页(12条)`);
                                            for (let index = 0; index < allModifyDynamicResArray.length; index++) {
                                                const res = allModifyDynamicResArray[index];
                                                const { type, createtime, dynamic_id } = res;
                                                if (type === 1) {
                                                    const reg1 = new RegExp(dynamic_id);
                                                    if (createtime < _time) {
                                                        !reg1.test(config.whitelist) ? BiliAPI.rmDynamic(dynamic_id) : void 0;
                                                    }
                                                }
                                            }
                                            Tooltip.log(`第${index}页中的转发动态全部删除成功`)
                                        }
                                        if (offset === '0') break;
                                    }
                                }
                                if (a === "2"|| a === "3") {
                                    const tagid = await BiliAPI.checkMyPartition();
                                    if (tagid === 0) { Tooltip.log('未能成功获取关注分区id'); return }
                                    let rmup = [];
                                    for (let index = 1; index < 42; index++) {
                                        const uids = await BiliAPI.getPartitionUID(tagid, index);
                                        rmup.push(...uids);
                                        if (uids.length === 0) break;
                                    }
                                    for (let index = 0; index < rmup.length; index++) {
                                        const uid = rmup[index];
                                        BiliAPI.cancelAttention(uid);
                                        await Base.delay(Number(time) * 1000);
                                    }
                                }
                                alert('成功清除,感谢使用');
                                if (confirm('如果动态数量少于10条请点击确定以清空本地存储')) {
                                    Base.storage.set(GlobalVar.myUID, '{}');
                                }
                            }
                        })()
                        break;
                    case 'save': {
                        let newConfig = {
                            model: '',
                            chatmodel: '',
                            maxday: '',
                            scan_time: '',
                            wait: '',
                            minfollower: '',
                            blockword: [],
                            blacklist: '',
                            whitelist: '',
                            relay: [],
                            chat: [],
                            UIDs: [],
                            TAGs: []
                        }
                        const {
                            model,
                            chatmodel,
                            maxday,
                            scan_time,
                            wait,
                            minfollower,
                            blockword,
                            blacklist,
                            whitelist,
                            relay,
                            chat,
                            UIDs,
                            TAGs
                        } = configForm;
                        for (let i = 0; i < 2; i++) {
                            model[i].checked ? newConfig.model += '1' : newConfig.model += '0';
                            chatmodel[i].checked ? newConfig.chatmodel += '1' : newConfig.chatmodel += '0';
                        }
                        newConfig.maxday = Number(maxday.value) < 0 ? '-1' : maxday.value;
                        newConfig.scan_time = (Number(scan_time.value) * 60000).toString();
                        newConfig.wait = (Number(wait.value) * 1000).toString();
                        newConfig.minfollower = minfollower.value;
                        newConfig.blockword = blockword.value.split(',');
                        newConfig.blacklist = blacklist.value;
                        newConfig.whitelist = whitelist.value;
                        newConfig.relay = relay.value.split(',');
                        newConfig.chat = chat.value.split(',');
                        newConfig.UIDs = UIDs.value.split(',');
                        newConfig.TAGs = TAGs.value.split(',');
                        config = newConfig;
                        eventBus.emit('Modify_settings', JSON.stringify(newConfig));
                    }
                        break;
                    case 'btn1':
                        BiliAPI.rmDynamic(ev.target.dataset.dyid);
                        BiliAPI.cancelAttention(ev.target.dataset.uid);
                        infotab.removeChild(ev.target.parentNode);
                        break;
                    case 'btn2':
                        BiliAPI.rmDynamic(ev.target.dataset.dyid)
                        infotab.removeChild(ev.target.parentNode);
                        break;
                    default:
                        break;
                }
            })
        }
        /**
         * 排序后展示
         * @returns {Promise<void>}
         */
        async sortInfoAndShow() {
            const self = this
            let protoArr = await this.fetchDynamicInfo();
            if (protoArr === []) return;
            /**
             * 按ts从小到大排序
             */
            protoArr.sort((a, b) => {
                return b.ts - a.ts;
            })
            protoArr.forEach(one => {
                if (one.ts === 0||one.ts > Date.now() / 1000) {
                    self.creatLotteryDetailInfo(one, 'color:green;')
                } else {
                    self.creatLotteryDetailInfo(one, 'color:red;')
                }
            })
            return;
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
            let allMDResArray = await this.getNextDynamic();
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
                    ? await BiliAPI.getLotteryNotice(one.origin_dynamic_id) 
                    : Base.getLotteryNotice(one.origin_description);
                LotteryNotice.origin_description = one.origin_description;
                LotteryNotice.dynamic_id = one.dynamic_id;/* 用于删除动态 */
                LotteryNotice.origin_uid = one.origin_uid;/* 取关 */
                LotteryNotice.origin_uname = one.origin_uname;/* 查看用户名 */
                LotteryNotice.origin_dynamic_id = one.origin_dynamic_id/* 用于查看开奖信息 */
                elemarray.push(LotteryNotice);
            }
            return elemarray;
        }
        async getNextDynamic() {
            const self = this;
            const {allModifyDynamicResArray, offset} = await self.checkAllDynamic(GlobalVar.myUID,5,200,this.offset);
            if (offset === '0') {
                self.offset = '-1';
            } else {
                self.offset = offset;
            }
            return allModifyDynamicResArray
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
        creatLotteryDetailInfo(info,color) {
            const createCompleteElement = Base.createCompleteElement
                , infocards = document.querySelector('.tab.info')
                , LotteryDetailInfo = createCompleteElement({
                    tagname: 'div',
                    attr: {
                        class: 'card',
                    },
                    children: [
                        createCompleteElement({
                            tagname: 'p',
                            attr: {
                                style: 'color:#fb7299;'
                            },
                            text: info.origin_uname+':',
                        }),
                        createCompleteElement({
                            tagname: 'p',
                            attr: {
                                title: info.origin_description,
                                style: 'height:40px;color:gray;display:-webkit-box;overflow: hidden;-webkit-line-clamp: 2;-webkit-box-orient: vertical;'
                            },
                            text: info.origin_description
                        }),
                        createCompleteElement({
                            tagname: 'p',
                            attr: {
                                style: color
                            },
                            text: info.text
                        }),
                        createCompleteElement({
                            tagname: 'p',
                            attr: {
                                style: 'color:#ffa726;'
                            },
                            text: '奖品:'+info.item
                        }),
                        createCompleteElement({
                            tagname: 'span',
                            attr: {
                                style: 'color:green;'
                            },
                            text: info.isMe+'   '
                        }),
                        createCompleteElement({
                            tagname: 'a',
                            attr: {
                                href: 'https://t.bilibili.com/'+info.origin_dynamic_id,
                                target: '_blank'
                            },
                            text: '查看详情'
                        }),
                        createCompleteElement({
                            tagname: 'button',
                            attr: {
                                id: 'btn1',
                                'data-dyid': info.dynamic_id,
                                'data-uid': info.origin_uid
                            },
                            text: '删除动态并取关',
                        }),
                        createCompleteElement({
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

    }
    /**主函数 */
    (async function main() {
        if (/(?<=space\.bilibili\.com\/)[0-9]*(?=\/?)/.exec(window.location.href)[0] !== GlobalVar.myUID) {
            Tooltip.log(document.title);
            return;
        }
        if (/(compatible|Trident)/.test(navigator.appVersion)) {
            alert('[Bili动态抽奖助手]当前浏览器内核为IE内核,请使用非IE内核浏览器!');
            return;
        } else {
            if (!/Chrome/.test(navigator.appVersion)) alert('[Bili动态抽奖助手]出现问题请使用Chrome或Edge浏览器')
        }
        /* 注册事件 */
        { 
            {
                let i = 0;
                eventBus.on('Turn_on_the_Monitor', () => {
                    if (Lottery.length === 0) {Tooltip.log('抽奖信息为空');return}
                    if (i === Lottery.length) {
                        Tooltip.log('所有动态转发完毕');
                        Tooltip.log('[运行结束]目前无抽奖信息,过一会儿再来看看吧');
                        i = 0;
                        Tooltip.log(`${Number(config.scan_time) / 60000}分钟后再次扫描`);
                        setTimeout(() => {
                            eventBus.emit('Turn_on_the_Monitor');
                        }, Number(config.scan_time))
                        return;
                    }
                    (new Monitor(Lottery[i++])).init();
                });
            }
            eventBus.on('Modify_settings', async ({ detail }) => {
                await Base.storage.set('config', detail);
                Tooltip.log('设置修改成功');
            })
            eventBus.on('Show_Main_Menu', async () => {
                Tooltip.log('加载主菜单');
                let configstr = await Base.storage.get('config');
                if (typeof configstr === 'undefined') {
                    await Base.storage.set('config', JSON.stringify(config));
                    Tooltip.log('设置初始化成功');
                } else {
                    /**本地设置 */
                    let _config = JSON.parse(configstr);
                    Object.keys(config).forEach(key => {
                        if (typeof _config[key] === 'undefined') {
                            _config[key] = config[key]
                        } else {
                            if (key === 'blacklist') _config[key] = Array.from(new Set([..._config[key].split(','), ...config[key].split(',')])).toString();
                        }
                    })
                    config = _config;
                }
                (new MainMenu()).init();
            })
        }
        await GlobalVar.getAllMyLotteryInfo();/* 转发信息初始化 */
        const sjson = await Base.getMyJson(); /* 默认设置 */
        [ Script, config ] = (() => {
            eval(sjson.dynamicScript);/* 仅用于推送消息,请放心使用 */
            return [
                {
                    version: '|version: 3.7.10',
                    author: '@shanmite',
                },
                sjson.config
            ]
        })()
        if (sjson.version !== Script.version) {
            const isupdate = confirm(`[更新提醒]最新版本为${sjson.version}\n是否更新?`);
            isupdate ? window.location.href = 'https://greasyfork.org/zh-CN/scripts/412468-bili%E5%8A%A8%E6%80%81%E6%8A%BD%E5%A5%96%E5%8A%A9%E6%89%8B' : void 0;
        }
        const Lottery = [...config.UIDs,...config.TAGs];
        eventBus.emit('Show_Main_Menu');
        BiliAPI.sendChat('453380690548954982', (new Date(Date.now())).toLocaleString() + Script.version, 17, false);
    })()
})();