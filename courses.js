function revealLinkedCard(){const target=document.getElementById(location.hash.slice(1));if(target?.matches('details'))target.open=true;}
revealLinkedCard();
window.addEventListener('hashchange',revealLinkedCard);
