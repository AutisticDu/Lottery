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
function creatCompleteElement(StructInfo) {
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
}
// eslint-disable-next-line no-unused-vars
let ele0 = {
    tagname: 'h1',
    attr: {
        class: 'c',
        id: 'i',
    },
    script: (el) => {
        el.onclick = () => { alert('click') }
    },
    text: '点击',
    children: []
}
// eslint-disable-next-line no-unused-vars
let ele1 = {
    tagname: 'div',
    attr: {
        class: 'class',
        id: 'id',
    },
    text: '第一层',
    children: [
        creatCompleteElement({
            tagname: 'li',
            attr: {
                class: 'class',
                id: 'id',
            },
            text: 'li',
            children: [
                creatCompleteElement({
                    tagname: 'div',
                    attr: {
                        class: 'class',
                        id: 'id',
                    },
                    text: '第二层',
                    children: [
                        creatCompleteElement({
                            tagname: 'li',
                            attr: {
                                class: 'class',
                                id: 'id',
                            },
                            text: 'li',
                        })
                    ]
                })
            ]
        })
    ]
}
document.body.appendChild(creatCompleteElement(ele0));
