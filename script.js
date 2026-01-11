const CARDS_PER_PAGE = 9;
const CARDS_PER_VIEW = 18; 
let allCards = [];
let currentViewIndex = 0;

const pageLeft = document.getElementById('page-left');
const pageRight = document.getElementById('page-right');
const contentLeft = document.getElementById('content-left');
const contentRight = document.getElementById('content-right');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageIndicator = document.getElementById('page-indicator');

function initBinder() {
    allCards = []; 
    pageIndicator.innerText = "Álbum vacío";
    renderSpread(false);
}

function renderSpread(animate = false) {
    const start = currentViewIndex * CARDS_PER_VIEW;
    const leftBatch = allCards.slice(start, start + CARDS_PER_PAGE);
    const rightBatch = allCards.slice(start + CARDS_PER_PAGE, start + CARDS_PER_VIEW);

    if (!animate) {
        fillPage(contentLeft, leftBatch, start);
        fillPage(contentRight, rightBatch, start + CARDS_PER_PAGE);
        updateControls();
    }
}

function fillPage(container, cards, startIndex) {
    container.innerHTML = ''; 

    cards.forEach((card, index) => {
        const globalIndex = startIndex + index; 
        const slot = document.createElement('div');
        slot.className = 'card-slot';

        let imgUrl = card.image_uris?.normal || card.card_faces?.[0].image_uris?.normal;
        if (!imgUrl) return; 

        let price = card.prices?.eur ? `${card.prices.eur}€` : '';

        slot.innerHTML = `
            <img src="${imgUrl}" class="card-image" loading="lazy">
            ${price ? `<div class="price-tag">${price}</div>` : ''}
        `;

        slot.onclick = () => openDetails(card, globalIndex);
        container.appendChild(slot);
    });

    while (container.children.length < 9) {
        const empty = document.createElement('div');
        container.appendChild(empty);
    }
}

function changePage(direction) {
    const totalViews = Math.ceil(allCards.length / CARDS_PER_VIEW);
    const nextIndex = currentViewIndex + direction;

    if (nextIndex < 0 || nextIndex >= totalViews) return;

    if (direction === 1) {
        pageRight.classList.add('flip-next');
    } else {
        pageLeft.classList.add('flip-prev');
    }

    setTimeout(() => {
        currentViewIndex = nextIndex;
        
        const start = currentViewIndex * CARDS_PER_VIEW;
        const leftBatch = allCards.slice(start, start + CARDS_PER_PAGE);
        const rightBatch = allCards.slice(start + CARDS_PER_PAGE, start + CARDS_PER_VIEW);

        fillPage(contentLeft, leftBatch, start);
        fillPage(contentRight, rightBatch, start + CARDS_PER_PAGE);
        updateControls();

        pageRight.classList.remove('flip-next');
        pageLeft.classList.remove('flip-prev');

    }, 300); 
}

prevBtn.onclick = () => changePage(-1);
nextBtn.onclick = () => changePage(1);

function updateControls() {
    if (allCards.length === 0) {
        pageIndicator.innerText = "Álbum Vacío";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        prevBtn.style.opacity = 0.3;
        nextBtn.style.opacity = 0.3;
        return;
    }

    const total = Math.ceil(allCards.length / CARDS_PER_VIEW);
    pageIndicator.innerText = `Página ${currentViewIndex + 1} de ${total}`;
    
    prevBtn.disabled = currentViewIndex === 0;
    nextBtn.disabled = currentViewIndex === total - 1;
    prevBtn.style.opacity = prevBtn.disabled ? 0.3 : 1;
    nextBtn.style.opacity = nextBtn.disabled ? 0.3 : 1;
}

const modal = document.getElementById('card-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalText = document.getElementById('modal-oracle');
const reprintsDiv = document.getElementById('reprints-list');
const closeDetails = document.querySelector('.close-modal');

function openDetails(card, index) {
    modalImg.src = card.image_uris?.png || card.card_faces?.[0].image_uris?.png;
    modalTitle.innerText = card.name;
    modalText.innerText = card.oracle_text || card.card_faces?.[0].oracle_text || "";
    reprintsDiv.innerHTML = '<span style="color:#888">Buscando versiones...</span>';
    
    modal.classList.remove('hidden');

    if(card.prints_search_uri) {
        fetch(card.prints_search_uri)
            .then(res => res.json())
            .then(data => {
                reprintsDiv.innerHTML = '';
                const reprints = data.data || [];
                
                reprints.slice(0, 15).forEach(rp => {
                    if(rp.id === card.id) return; 

                    const thumb = document.createElement('img');
                    thumb.src = rp.image_uris?.small || rp.card_faces?.[0].image_uris?.small;
                    thumb.className = 'reprint-thumb';
                    thumb.title = `Cambiar a versión: ${rp.set_name}`;
                    
                    thumb.onclick = () => {
                        allCards[index] = rp; 
                        renderSpread(false); 
                        openDetails(rp, index); 
                    };
                    
                    reprintsDiv.appendChild(thumb);
                });
                
                if(reprintsDiv.children.length === 0) reprintsDiv.innerHTML = '<span>No hay más versiones.</span>';
            });
    }
}
closeDetails.onclick = () => modal.classList.add('hidden');

const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const doSearchBtn = document.getElementById('do-search-btn');
const resultsGrid = document.getElementById('search-results');
const closeSearch = document.querySelector('.close-search');
const addBtn = document.getElementById('add-card-btn');

addBtn.onclick = () => {
    searchModal.classList.remove('hidden');
    searchInput.focus();
}
closeSearch.onclick = () => searchModal.classList.add('hidden');

doSearchBtn.onclick = performSearch;
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch() });

async function performSearch() {
    const query = searchInput.value.trim();
    if(!query) return;

    resultsGrid.innerHTML = '<p style="color:#ccc">Buscando...</p>';

    try {
        const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        resultsGrid.innerHTML = '';

        if(!data.data || data.code === "not_found") {
            resultsGrid.innerHTML = '<p style="color:#ccc">No encontrado.</p>';
            return;
        }

        data.data.slice(0, 15).forEach(card => {
            const img = card.image_uris?.normal || card.card_faces?.[0].image_uris?.normal;
            if(!img) return;

            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<img src="${img}">`;
            
            div.onclick = () => {
                allCards.push(card); 
                searchModal.classList.add('hidden');
                const lastPage = Math.ceil(allCards.length / CARDS_PER_VIEW) - 1;
                currentViewIndex = lastPage >= 0 ? lastPage : 0;
                
                renderSpread(false);
            };
            resultsGrid.appendChild(div);
        });

    } catch(e) {
        resultsGrid.innerHTML = '<p style="color:red">Error de conexión</p>';
    }
}

// ARRANQUE
initBinder();