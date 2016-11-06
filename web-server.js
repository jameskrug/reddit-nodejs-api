var mysql = require('mysql');
var request = require("request");
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'jameskrug',
  password : '',
  database: 'reddit'
});
// load our API and pass it the connection
var reddit = require('./reddit');
var redditAPI = reddit(connection);

var bodyParser = require("body-parser");
var express = require('express');
var pug = require("pug");
var cookieParser = require("cookie-parser");
var app = express();

app.use('/files', express.static('static_files'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:false}));
app.use(checkLoginToken);
app.set("view engine", "pug");

function checkLoginToken(req,res,next){
  if (req.cookies.SESSION){
    redditAPI.checkUserSession(req.cookies.SESSION, function(err, data){
      if(err){
        console.log("erererer");
      }
      else if (data){
        req.loggedInAs = data[0];
        res.locals.user = data[0];
      }
      next();
    });
  }
  else{
    next();
  }
}

// app.get('/hello', function(req,res){
//   var x = "";
//   //https://redditnodejsapi-jameskrug.c9users.io/hello?firstname=bob
//   console.log(req.method + ' ' + req.query.firstname);
//   x = "hello, " + req.query.firstname+ " im watching you";
//   res.send(x);
// });
// app.get("/hi/:name", function(req,res){
//   //https://redditnodejsapi-jameskrug.c9users.io/hi/bill
//   res.send("Hi "+req.params.name);
// });
// app.get("/calculator/:operation", function(req,res){
//   var theOperation = {};
//   theOperation.op = req.params.operation;
//   theOperation.num1 = parseInt(req.query.num1);
//   theOperation.num2 = parseInt(req.query.num2);
//   switch (theOperation.op) {
//     case "add":
//       //https://redditnodejsapi-jameskrug.c9users.io/calculator/add?num1=7&num2=124324
//       theOperation.solution = theOperation.num1 + theOperation.num2;
//       break;
//     case "sub":
//       //https://redditnodejsapi-jameskrug.c9users.io/calculator/sub?num1=22&num2=12
//       theOperation.solution = theOperation.num1 - theOperation.num2;
//     break;
//     case "mult":
//       //https://redditnodejsapi-jameskrug.c9users.io/calculator/mult?num1=3&num2=55
//       theOperation.solution = theOperation.num1 * theOperation.num2;
//     break;
//     case "div":
//       //https://redditnodejsapi-jameskrug.c9users.io/calculator/div?num1=344&num2=17
//       theOperation.solution = theOperation.num1 / theOperation.num2;
//     break;
//     default:
//       res.sendStatus(402);
//   }
//   res.send(JSON.stringify(theOperation, null, 4));
// });

app.get("/posts", function(req,res){
  var listThisMany = {};
  if (req.query.onePost > 0){
    listThisMany = {numPerPage:1, page:0};
    req.query.sort = "NEW";
  }
  else{
    listThisMany = {numPerPage:25, page:0};
  }
  redditAPI.getAllPosts(listThisMany, req.query.sort, req.loggedInAs? req.loggedInAs.id : 0, function(err,data){
    if (err){
      console.log("errorz");
    }
    else{
      res.render('post-list', {needsSorting : true, posts:data, theTitle : "Posts", theDescription: "Some posts for you to view"});
    }
  });
});

app.get("/createContent", function(req,res){
  if (!req.loggedInAs){
    res.render("must-be-logged-in");
  }
  else{
    var previousUrl = "Enter a URL to content";
    res.render('create-content', {gotSrId: req.query.srID, previousUrl: previousUrl});
  }
});

app.post("/createContent",function(req,res){
  if (!req.loggedInAs){
    res.send("must be logged in");
    res.redirect("/home");
  }
  else{
    var postInfo = {userId: req.loggedInAs.id, srID : req.body.gotSrId, title : req.body.title, url : req.body.url};
    redditAPI.createPost(postInfo, function(err, data){
      if (err){
        console.log("errrrrror");
      }
      else{
        res.redirect("/posts?onePost="+data.id);
      }
    });
  }
});

app.get('/', function (req, res) {
  res.redirect("/home");
});

app.get("/home", function (req,res){
  var listThisMany = {numPerPage:25, page:0};
  var sortThis = "NEW";
  if (req.query.sort){
    sortThis = req.query.sort;
  }
  if (req.query.numOfPosts){
    listThisMany.numPerPage = Number(req.query.numOfPosts);
  }
  redditAPI.getAllPosts(listThisMany, sortThis, req.loggedInAs? req.loggedInAs.id : 0, function(err, data){
    if (err){
      console.log("homepage problems", err);
    }
    else{
      res.render('post-list', {needsSorting : true, posts:data, theTitle: "Homepage", theDescription: "Home to all of Reddit"});
    }
  });
});

app.get("/subreddits", function(req,res){
  redditAPI.showAllSubs(function(err, data){
    if (err){
      console.log("subreddit error", err);
    }
    else{
      res.render('subreddit-list', {subreddits:data});
    }
  });
});

app.get("/r/:subreddit", function(req,res){

  redditAPI.showSubreddit(req.params.subreddit, req.query.sort, function(err, data){
    if (err){
      console.log("subreddit woes", err);
    }
    else{
      if (data.length == 0){
        res.send("there are no posts in this subreddit");
      }
      else{
        data.forEach(function(x, idx){
          data[idx].user = {};
          data[idx].user.username = x.username;
        });
        // data.user.username = data.username;
        res.render('post-list', {needsSorting : true, theSrId: data[0].subreddit_id, posts: data, theTitle: req.params.subreddit, theDescription: "description: " + data[0].description});
      }        
    }
  });
});

app.get("/newSub", function(req,res){
  res.render("new-subreddit");
});

app.post("/newSub",function(req,res){
  redditAPI.createSubreddit({name:req.body.subTitle, desc: req.body.subDesc}, function(err,data){
    if (err){
      console.log("no new sub", err);
    }
    else{
      console.log(data);
      res.redirect("/subreddits");
    }
  });
});

app.get("/createAccount", function(req,res){
  res.render('create-account-page');
});

app.post('/createAccount', function (req, res){
  var userInfo = {username : req.body.newUsername, password : req.body.newPassword};
  redditAPI.createUser(userInfo, function(err, data){
    if (err){
      console.log("username sucks");
      res.send("didn't work");
    }
    else{
      redditAPI.createSession(data, function(err, result){
        if (err){
          console.log(err);
        }
        else{
          res.cookie("SESSION",result);
          res.redirect("/home");
        }
      });
    }
  });
});

app.get("/fullpost/:postid", function(req,res){
  redditAPI.getTheComments(req.params.postid, function(err, data, postInfo){
    if (err){
      console.log("no comments for you", err);
    }
    
    else{
      var indexedComments = [];
      data.forEach(function(x){
          var found = false;
          if (x.parentid == 0){
              indexedComments.push({commentid: x.commentid, comment: x.comment, username: x.username, parentid: x.parentid, replies: []});
          }
          else{
              indexedComments.forEach(function(y, idx){
                  if (y.commentid == x.parentid){
                      indexedComments[idx].replies.push({commentid: x.commentid, comment: x.comment, username: x.username, parentid: x.parentid, replies: []});
                      found = true;
                  }
              });
              if (!found){
                  for (var i = 0; i < indexedComments.length; i++){
                      indexedComments[i].replies.forEach(function(z, idx){
                          if (z.commentid == x.parentid){
                              indexedComments[i].replies[idx].replies.push({commentid: x.commentid, comment: x.comment, username: x.username, parentid: x.parentid, replies: []});
                              found = true;
                          }
                      });
                  }
              }
          }
      });
      res.render('comment', {postDetails: postInfo, comments: indexedComments, postid : req.params.postid});
    }
  });
});

app.get('/replyThis/:postid/:parentid', function(req, res){
  if(!req.loggedInAs){
    res.send("must be logged in to comment");
  }
  else{
    console.log(req.params.postid);
    res.render('leave-comment', {postid: req.params.postid, parentid: req.params.parentid});
  }
});
    
app.post('/replyThis', function(req,res){
  console.log(req.loggedInAs);
  var postInfo = {num : req.body.postid, parent: req.body.parentid, comment: req.body.comment};
  redditAPI.leaveTheComment(postInfo,{id:req.loggedInAs.id}, function(err, result){
    if (err){
      console.log(err);
    }
    else{
      res.redirect('/fullpost/'+req.body.postid);
    }
  });
});

app.get('/suggestTitle', function(req,res){
  var previousUrl = req.query.url;
  request(req.query.url, function(err, data){
    if (err){
      console.log(err);
    }
    else{
      var stringData = JSON.stringify(data);
      var suggestTitle = stringData.split('<title>').pop().split('</title>').shift();
      res.render('create-content', {suggest: suggestTitle, previousUrl: previousUrl});
    }
  });
});

app.get('/login', function(req,res){
  res.render('login-account', {needsSorting:false});
});

app.post('/login', function(req,res){
  redditAPI.checkLogin(req.body.thisUsername, req.body.thisPassword, function(err, data){
    if (err){
      res.send(400);
      res.send("bad password");
      console.log(err);
    }
    else{
      redditAPI.createSession(data, function(err, result){
        if (err){
          console.log(err);
        }
        else{
          res.cookie("SESSION",result);
          res.redirect("/home");
        }
      });
    }
  });
});

app.post('/vote', function(req,res,next){
  if(!req.loggedInAs){
    res.render("must-be-logged-in");
  }
  else{
    var theVote = {num: req.query.vote, post: req.query.postID};
    console.log(theVote, req.loggedInAs);
    redditAPI.voteCast(theVote, req.loggedInAs, function(err, result){
      if (err){
        console.log(err);
      }
      else{
        console.log(result);
      }
    });
  }
});

// app.post('/vote', function(req,res){
//   redditAPI.voteCast(theVote, req.loggedInAs, function(err, result){
//       if (err){
//         console.log(err);
//       }
//       else{
//         res.redirect(req.headers.referer);
//       }
//     });
// });

app.get('/logout', function(req,res){
  req.loggedInAs = null;
  res.clearCookie("SESSION", req.cookies.SESSION);
  redditAPI.removeSession(req.cookies.SESSION, function(err, result){
    if (err){
      console.log(err);
    }
    else{
      res.redirect("/home");
    }
  });
});

app.get("/getSuggestion", function(req,res){
  redditAPI.suggestsub(req.query.query, function(err, suggestion){
    if(err){
      console.log("no suggesting", err)
    }
    else{
      console.log("in web server")
      console.log(suggestion)
      var viewSuggestions = {
        query: "Unit",
        suggestions: suggestion
}
      console.log("view", viewSuggestions)
      res.json(viewSuggestions);
    }
  })
  // console.log(req)
})





/* YOU DON'T HAVE TO CHANGE ANYTHING BELOW THIS LINE :) */

// Boilerplate code to start up the web server
var server = app.listen(process.env.PORT, process.env.IP, function () {
    var host = server.address().address;
    var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});