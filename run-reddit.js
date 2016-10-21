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
var loginId = {id: 0, username: ""};

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
            loginId.id = user.id;
            loginId.username = user.username;
            mainMenu();
        }
    });
}

function createPost(){
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
            userId: loginId.id
        }, function(err, post) {
            if (err) {
                console.log(err);
            }
            else {
                console.log(post);
            }
        // connection.end();
        mainMenu();
    });
    });
    });
});
}

function showAllPosts(){
    var displayThisMany = {numPerPage:25,page:0};
    inquirer.prompt({
        type: "list",
        name: "sortType",
        message: "How to sort?",
        choices: [{name: "TOP", value: "TOP"},{name: "NEWEST", value: "NEWEST"},{name: "HOT", value : "HOT"},{name: "CONTROVERSIAL *not working*", value: "CONTROVERSIAL"}]
    }).then(
    function(answer){
        var theQuery = "";
        var sortString = "";
        console.log(answer.sortType);
        if (answer.sortType == "TOP"){
            sortString = "ORDER BY SUM(votes.vote)";
                        
        }
        else if (answer.sortType == "NEWEST"){
            sortString =  "ORDER BY posts.createdAt DESC";
        }
        else if (answer.sortType == "CONTROVERSIAL"){
            sortString = "ORDER BY (IF SUM(votes.vote) > 0 THEN (COUNT(votes.vote) * (numUpvotes / numDownvotes) : totalVotes * (numDownvotes / numUpvotes)";
        }
        else if (answer.sortType == "HOT"){
            sortString = "ORDER BY (SUM(votes.vote)/posts.id)";
        }
        
        theQuery = `SELECT 
                          posts.id, 
                          posts.title, 
                          posts.url,
                          posts.userId, 
                          posts.createdAt, 
                          posts.updatedAt, 
                          users.username, 
                          users.createdAt AS "usersince", 
                          users.updatedAt AS "userupdate",
                          subreddits.title AS "subredditName",
                          subreddits.description AS "subredditDesc",
                          subreddits.createdAt AS "subredditSince",
                          subreddits.updatedAt AS "subredditUpdate",
                          SUM(votes.vote) AS "voteScore"
                        FROM posts
                        JOIN users ON (posts.userId = users.id)
                        LEFT JOIN subreddits ON (subreddits.id = posts.subreddit_id)
                        LEFT JOIN votes ON (posts.id = votes.postid)
                        GROUP BY posts.id ` + sortString + `
                        LIMIT ? OFFSET ?;`;
    redditAPI.getAllPosts(displayThisMany, theQuery, function(err, results){
        if (err){
            console.log("PROBLEMS!!",err);
        }
        else{
            console.log(results);
        }
        mainMenu();
        // connection.end();
    });
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
            mainMenu();
            // connection.end();
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
        mainMenu();
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
        // connection.end();
        mainMenu();
    });
}

function logUserIn(){
    console.log("here");
    inquirer.prompt({
        type: "input",
        name: "userid",
        message: "what is your login #?"
    }).then(
    function(answer){
        redditAPI.userLookup(answer.userid, function(err, data){
            if (err){
                console.log("username sucks", err);
            }
            else{
                loginId.id = data[0].id;
                loginId.username = data[0].username;
                mainMenu();
            }
        });
    
    });
}

function castVote(){
    var theVote = {};
    inquirer.prompt({
        type: "input",
        name: "postVote",
        message: "What is the ID of the vote you want to vote on?"
    }).then(
    function(answer){
        theVote.post = answer.postVote;
        inquirer.prompt({
            type: "list",
            name: "voteType",
            message: "Upvote or Downvote?",
            choices:[{name: "UP", value: 1}, {name: "DOWN", value: -1}, {name: "CANCEL", value: 0}]
        }).then(
        function(answer){
            theVote.num = answer.voteType;
            redditAPI.voteCast(theVote, loginId, function(err, data){
                if (err){
                    console.log("voter fraud",err);
                }
                else{
                    console.log("vote cast!");
                    mainMenu();
                }
            });
        });
    });
}

function leaveComment(){
    var commentStuff = {};
    inquirer.prompt({
        type: "input",
        name: "whichOne",
        message: "Which post are you commenting on?"
    }).then(
    function(answer){
        commentStuff.num = answer.whichOne;
        inquirer.prompt({
            type:"input",
            name:"theComment",
            message: "What is your comment?"
        }).then(
        function(answer){
            commentStuff.comment = answer.theComment;
            inquirer.prompt({
                type: "input",
                name: "parent",
                message: "What is the parent number? (0 for None)"
            }).then(
            function(answer){
                if(commentStuff.parent != 0){
                    commentStuff.parent = answer.parent;
                }
                else{
                    commentStuff.parent = null;
                }
                redditAPI.leaveTheComment(commentStuff, loginId, function (err, data){
                    if (err){
                        console.log("no comments here", err);
                    }
                    else{
                        // console.log(data);
                        mainMenu();
                    }
                });
            });
            
        });
    });
}

function getCommentsForPost(){
    inquirer.prompt({
        type: "input",
        name: "whichPost",
        message: "Comments for which post?"
    }).then(
    function(answer){
        redditAPI.getTheComments(answer.whichPost, function(err, data){
            if (err){
                console.log("get your own comments",err);
            }
            else{
                console.log(data);
            }
        });
    });
}


function mainMenu(){
    if (loginId.id == 0){
        console.log("not currently logged in");
    }
    else{
        console.log("login ID: ",loginId.id, "username: ", loginId.username);
    }
    
    var menuChoices = [
      {name: "LOGIN", value : "LOGIN"},
      {name: 'CREATE USER', value: 'CREATEUSER'},
      {name: 'CREATE POST', value: 'CREATEPOST'},
      {name: 'SHOW ALL POSTS', value: 'SHOWPOSTS'},
      {name: 'SHOW ALL POSTS FROM USER', value: 'SHOWUSERPOSTS'},
      {name: 'SHOW ONE POST', value: 'ONEPOST'},
      {name: "NEW SUBREDDIT", value: "NEWSUB"},
      {name: "SHOW ALL SUBREDDITS", value: "SHOWALLSUBS"},
      {name: "VOTE ON POST", value: "VOTE"},
      {name: "CREATE COMMENT", value: "COMMENT"},
      {name: "GET COMMENTS FOR POST", value: "GETCOMMENTS"},
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
            case "LOGIN":
                logUserIn();
                break;
            case "CREATEUSER":
                getNewUserInfo();
                break;
            case "CREATEPOST":
                console.log(loginId);
                if (loginId.id == 0){
                    console.log("please log in or create account");
                    mainMenu();
                }
                else{
                    createPost();
                }
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
            case "VOTE":
                if (loginId.id == 0){
                    console.log("VOTER FRAUD! please log in or create account");
                    mainMenu();
                }
                else{
                    castVote();
                }
                break;
            case "COMMENT":
                if (loginId.id == 0){
                    console.log("please log in or create account");
                    mainMenu();
                }
                else{
                    leaveComment();
                }
                break;
            case "GETCOMMENTS":
                getCommentsForPost();
                break;
            case "EXIT":
                console.log("You'll be back");
                connection.end();
                break;
        }
      }
    );
}


mainMenu();