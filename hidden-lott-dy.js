// ==UserScript==
// @name         屏蔽自己的抽奖动态
// @namespace    shanmite
// @version      0.2
// @description  移除自己的抽奖动态(只是隐藏)
// @author       Shanmite
// @include      /^https?:\/\/t\.bilibili\.com\/\?/
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    let uname = '';
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
    })();
    const createCompleteElement = (StructInfo) => {
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
    };
    document.body.appendChild(createCompleteElement({
        tagname: 'button',
        attr: {
            style: "position:fixed;z-index:99999;right:30px;top:65%;"
        },
        script: el => {
            el.addEventListener('click',()=>{uname = window.prompt("请输入要屏蔽的用户名","")})
        },
        text: `点击输入要屏蔽的用户名`,
    }));
    document.body.appendChild(createCompleteElement({
        tagname: 'button',
        attr: {
            style: "position:fixed;z-index:99999;right:30px;top:70%;"
        },
        script: el => {
            el.addEventListener('click', () => { eventBus.emit('clear', uname); el.innerText = `屏蔽${uname}` });
        },
        text: `屏蔽`,
    }));
    eventBus.on('clear',({ detail })=>{
        if (detail === '') {alert('请输入用户名');return}
        let cards = document.querySelectorAll('div.card');
        cards.forEach(card => {
            let c_pointer = card.querySelectorAll('a.c-pointer');
            c_pointer.forEach(c => {
                c.innerText === detail ? card.parentNode.removeChild(card) : void 0;
            });
        });
    })
})();