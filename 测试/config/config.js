const main = document.querySelector('.shanmitemain');
const info = main.querySelector('.shanmiteinfos');
info.style.display = 'block';
// info.style.display = 'none';
main.addEventListener('click',(ev)=>{
    switch (ev.target.id) {
        case 'refresh':
            info.innerHTML = '';
            break;
        case 'info':
            if (info.style.display === 'none') {
                info.style.display = 'block';
            } else {
                info.style.display = 'none';
            }
            break;
        case 'button1':
            alert(ev.target.dataset.dyid)
            break;
        case 'button2':
            alert(ev.target.dataset.originuname)
            break;
        default:
            break;
    }
})