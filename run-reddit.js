var mysql = require('mysql');
var inquirer = require("inquirer");
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'jameskrug',
  password : '',
  database: 'reddit'
});
// load our API and pass it the connection
var reddit = require('./reddit');
var redditAPI = reddit(connection);


function getNewUserInfo(){
    var newUserInfo = {};
    inquirer.prompt({
        type: "input",
        name: "username",
        message: "What is the new user name?",
    }).then(
    function(answer){
        newUserInfo.username = answer.username;
    inquirer.prompt({
        type: "input",
        name: "userpassword",
        message: "What is the new password?",
    }).then(
    function(answer){
        newUserInfo.password = answer.userpassword;
        console.log(newUserInfo);
        createNewUser(newUserInfo);
    });
    });
}
        
function createNewUser(newUser){        
    redditAPI.createUser({
        username: newUser.username,
        password: newUser.password
    }, function(err, user) {
        if (err) {
            console.log(err);
        }
        else {
            createPost(user);
        }
    });
}

function createPost(user){
    console.log(user);
    var postInfo = {};
    inquirer.prompt({
        type: "input",
        name: "thePost",
        message: "What should the post say?",
    }).then(
    function(answer){
        postInfo.thePost = answer.thePost;
        inquirer.prompt({
            type: "input",
            name: "postUrl",
            message: "What is the URL?",
    }).then(
    function(answer){
        postInfo.postUrl = answer.postUrl;
        inquirer.prompt({
            type: "input",
            name: "srID",
            message: "What is the subreddit ID?",
    }).then(
    function(answer){
        postInfo.srID = answer.srID;
        console.log(postInfo);
        redditAPI.createPost({
            title: postInfo.thePost,
            url: postInfo.postUrl,
            srID: postInfo.srID,
            userId: user.id
        }, function(err, post) {
            if (err) {
                console.log(err);
            }
            else {
                console.log(post);
            }
        connection.end();
    });
    });
    });
});
}

function showAllPosts(){
    var displayThisMany = {numPerPage:25,page:0};
    redditAPI.getAllPosts(displayThisMany, function(err, results){
        if (err){
            console.log("PROBLEMS!!",err);
        }
        else{
            console.log(results);
        }
    
        connection.end();
    });
}

function showUsersPosts(){
    inquirer.prompt({
        type: "input",
        name: "userId",
        message: "What is the user Id whos posts you want to display?",
    }).then(
    function(answer){
        var toPass = {numPerPage:25,page:0,userId:answer.userId};
        redditAPI.getUsersPosts(toPass, function(err, results){
            if (err){
                console.log("PROBLEMS!!",err);
            }
            else{
                if (results[0]){
                    console.log(JSON.stringify(results, null, 4));
                }
                else{
                    console.log("no posts from this user");
                }
            }
            connection.end();
    });
    });
}

function showSinglePost(){
     inquirer.prompt({
        type: "input",
        name: "whichPost",
        message: "What is the ID of the post you want to display?",
    }).then(
    function(answer){
    redditAPI.getOnePost(answer.whichPost, function(err, result){
        if (err){
            console.log("issues", err);
        }
        else{
            console.log(JSON.stringify(result, null, 4));
        }
        connection.end();
    });
    });
}

function makeNewSubreddit(){
    var newSubInfo = {};
    inquirer.prompt({
        type: "input",
        name: "newSubName",
        message: "What is the name of the new subreddit?",
    }).then(
    function(answer){
        newSubInfo.name = answer.newSubName;
        inquirer.prompt({
            type: "input",
            name: "newSubDesc",
            message: "Optional description:"
    }).then(
    function(answer){
        newSubInfo.desc = answer.newSubDesc;
        redditAPI.createSubreddit(newSubInfo, function(err, data){
            if (err){
                console.log("dear god no", err);
            }
            else{
                console.log(JSON.stringify(data, null, 4));
            }
        });
    }); 
    });
}

function showAllSubs(){
    redditAPI.showAllSubs(function(err, data){
        if (err){
            console.log("not again",err);
        }
        else{
            data.forEach(function(x,idx){
                console.log("#"+(idx+1)+": "+x.title);
            });            
        }
    });
}


function mainMenu(){
    var menuChoices = [
      {name: 'CREATE USER', value: 'CREATEUSER'},
      {name: 'CREATE POST', value: 'CREATEPOST'},
      {name: 'SHOW ALL POSTS', value: 'SHOWPOSTS'},
      {name: 'SHOW ALL POSTS FROM USER', value: 'SHOWUSERPOSTS'},
      {name: 'SHOW ONE POST', value: 'ONEPOST'},
      {name: "NEW SUBREDDIT", value: "NEWSUB"},
      {name: "SHOW ALL SUBREDDITS", value: "SHOWALLSUBS"},
      {name: "EXIT", value: "EXIT"}
    ];
    
    inquirer.prompt({
      type: 'list',
      name: 'menu',
      message: 'What do you want to do?',
      choices: menuChoices
    }).then(
      function(answers) {
        switch (answers.menu){
            case "CREATEUSER":
                getNewUserInfo();
                break;
            case "CREATEPOST":
                var thisUser = {};
                thisUser.id = 3;
                createPost(thisUser);
                break;
            case "SHOWPOSTS":
                showAllPosts();
                break;
            case "SHOWUSERPOSTS":
                showUsersPosts();
                break;
            case "ONEPOST":
                showSinglePost();
                break;
            case "NEWSUB":
                makeNewSubreddit();
                break;
            case "SHOWALLSUBS":
                showAllSubs();
                break;
            case "EXIT":
                console.log("You'll be back");
                break;
        }
      }
    );
}


mainMenu();