
class SearchBox extends HTMLElement{
    #searchBox = document.createElement('input');
    searchIcon = document.createElement('span');
    searchEvent = value=>{};
    constructor(){
        super();
        this.searchIcon.innerText = '';
        this.searchIcon.addEventListener(MouseEventEnum.CLICK, ()=>{
            this.searchBox.focus();
        });
        this.searchBox.type='text';
        this.searchBox.addEventListener('keyup', (e)=>{
            if(e.keyCode !== 13){
                return;
            }
            this.searchEvent(this.searchBox.value);
        });
    }
    
    connectedCallback(){
        this.setAttribute('hint', 'Search box');
        this.searchIcon.classList.add('icon');
        this.appendChild(this.searchIcon);
        this.appendChild(this.searchBox);
    }

    get value(){
        return this.searchBox.value;
    }

    set value(value){
        this.searchBox.value = value;
    }

    get searchBox(){
        return this.#searchBox
    }
}
customElements.define('sw-searchbox', SearchBox);

(()=>{
    const mainMenu=()=>{
        let menu = document.getElementById('main-menu');
        menu.innerHTML = '';
        const searchBox = document.createElement('sw-searchbox');
        searchBox.classList.add('searchbox');
        menu.appendChild(searchBox);
        
        let dropdownMenu = document.createElement('ul', {is:'sw-dropdown'});
        dropdownMenu.classList.add('header-item', 'nonselectable');
        dropdownMenu.displayName = 'Menu';
        dropdownMenu.dropdownObject.classList.add('icon');
        menu.appendChild(dropdownMenu);
        dropdownMenu.addItem('File Setting', ()=>{});

        
    };
    window.addEventListener('load', mainMenu);
})();


