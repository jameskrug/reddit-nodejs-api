$(document).ready(function(){
    $(".upvote").each(function(e){
        if ($(this).data("alreadyvoted") == "1"){
            $(this).css("background-color", "green");
        }
    })
    $(".downvote").each(function(e){
        if ($(this).data("alreadyvoted") == "-1") {
            $(this).css("background-color", "red");
        }
    });
});


$(".upvote").on("click", function(e){
    console.log("start",$(this).attr("data-alreadyvoted"));
    if ($(this).attr("data-alreadyvoted") == "1"){
        console.log("already voted");
    }

    if ($(this).attr("data-alreadyvoted") != "1"){
        var previousScore = parseInt($(this).parent().parent().children(".showScore").attr("data-val"));
        previousScore+=1;
        if ($(this).attr("data-alreadyvoted") == "-1"){
            previousScore+=1;
            $(this).parent().children(".downvote").css("background-color", "black");
        }
        
        $(this).css("background-color", "green");
        
        
        $(this).attr("data-alreadyvoted",1);
        $(this).parent().children(".downvote").attr("data-alreadyvoted",1);

        $(this).parent().parent().children(".showScore").attr("data-val", previousScore);
        $(this).parent().parent().children(".showScore").text("Vote Score: "+previousScore);
        
    }
});

$(".downvote").on("click", function(e){
    console.log("start",$(this).attr("data-alreadyvoted"));
    if ($(this).attr("data-alreadyvoted") == "-1"){
        console.log("already voted");
    }
    if ($(this).attr("data-alreadyvoted") != "-1"){
        var previousScore = parseInt($(this).parent().parent().children(".showScore").attr("data-val"));
        previousScore -= 1;
        if ($(this).attr("data-alreadyvoted") == "1"){
            previousScore -= 1;
            $(this).parent().children(".upvote").css("background-color", "black");
        }
        $(this).css("background-color", "red");
        
        
        
        $(this).attr("data-alreadyvoted",-1);

        $(this).parent().children(".upvote").attr("data-alreadyvoted",-1)
        
        
        $(this).parent().parent().children(".showScore").attr("data-val", previousScore);
        $(this).parent().parent().children(".showScore").text("Vote Score: "+previousScore);
        
    }
})


$(".suggestname").on("click", function(e){
    var theUrl = $(this).parent().children("input").val();
    var toSearch = "/suggestTitle?url="+theUrl;
    window.location.replace(toSearch);
});

$(".votebutton").on("click", function(e){
    console.log("you clicked a vote button", $(this).val(), $(this).data("postid"));
    $.post('/vote?vote='+$(this).val()+"&postID="+$(this).data("postid"));
});


$("#autocomplete").autocomplete({
    serviceUrl: "/getSuggestion",
    onSelect: function(suggestions){
        console.log("sugesting")
        console.log(suggestions);
    }
});