export function setupFramePicker(select){
 const list=document.createElement('div');list.id='framePicker';list.setAttribute('role','listbox');list.setAttribute('aria-label','컷 작성 도구');select.after(list);select.hidden=true;
 const paths={rect:'M8 8H132V32H8z',poly:'M8 22L66 5L132 20V33H8z',pen:'M8 28C26 3 48 8 66 17S110 30 132 8V33H8z'};
 const sync=()=>{for(const b of list.children){const on=b.dataset.value===select.value;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;}};
 for(const option of select.options){const b=document.createElement('button');b.type='button';b.dataset.value=option.value;b.setAttribute('role','option');b.setAttribute('aria-label',option.text);b.innerHTML=`<svg viewBox="0 0 140 40" aria-hidden="true"><path d="${paths[option.value]}"/></svg><span></span>`;b.querySelector('span').textContent=option.text;b.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change'));sync();};b.onkeydown=e=>{const buttons=[...list.children],i=buttons.indexOf(b),next={ArrowDown:i+1,ArrowUp:i-1,Home:0,End:buttons.length-1}[e.key];if(next===undefined)return;e.preventDefault();const target=buttons[Math.max(0,Math.min(buttons.length-1,next))];target.click();target.focus();};list.append(b);}
 select.addEventListener('change',sync);sync();
}
