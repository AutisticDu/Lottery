
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
            }
                break;
            case 'showtab1': {
                show(1);
            }
                break
            case 'showtab2': {
                show(2);
            }
                break
            case 'save': {
                let model = ''
                    , maxday = ''
                    , newConfig = {
                        scan_time: '',
                        wait: '',
                        relay: '',
                        chat: '',
                        UIDs: '',
                        TAGs: ''
                        }
                configForm.mode[0].checked ? model = '1' : model = '0';
                for (let i = 1; i < 2; i++) {
                    configForm.mode[i].checked ? model += '1' : model += '0';
                }
                maxday = configForm['maxday'].value === '' ? '' : configForm['maxday'].value;
                for (const key in newConfig) {
                    newConfig[key] = configForm[key].value;
                }
                newConfig['model'] = model;
                newConfig['maxday'] = maxday;
                // config = newConfig;
                // eventBus.emit('Modify_settings',JSON.stringify(newConfig));
            }
                break;
            case 'btn1':
                // API.rmDynamic(ev.target.dataset.dyid);
                // API.cancelAttention(ev.target.dataset.uid);
                infotab.removeChild(ev.target.parentNode);
                break;
            case 'btn2':
                // API.rmDynamic(ev.target.dataset.dyid)
                infotab.removeChild(ev.target.parentNode);
                break;
            default:
                break;
        }
    })
