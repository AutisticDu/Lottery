const eventBus = (() => {
    const eTarget = new EventTarget()
        , module = {
            on: (type, fn, opt) => {
                eTarget.addEventListener(type, fn, opt);
            },
            off: (type, fn, opt) => {
                eTarget.removeEventListener(type, fn, opt);
            },
            emit: (type, detail) => {
                const event = new CustomEvent(type, { detail });
                eTarget.dispatchEvent(event);
            }
        }
    return module;
}
)();
eventBus.on('run', ({ detail }) => {
    console.log(detail);
});
setTimeout(() => {
    eventBus.emit('run', 'hello')
}, 2000)