var html=jsToHtml.html;
function agregaLogoAlElemento(id){
    
    if(!document.getElementById('logo-encuesta')){
        var imagen=html.img({"id":"logo-encuesta",src:"logos.png"}).create();
        id.appendChild(imagen);
    }
    
    
}