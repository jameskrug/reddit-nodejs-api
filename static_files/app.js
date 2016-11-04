
$(".suggestname").on("click", function(e){
    var theUrl = $(this).parent().children("input").val();
    var toSearch = "/suggestTitle?url="+theUrl;
    window.location.replace(toSearch);
})