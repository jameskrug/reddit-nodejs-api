var mysql = require('mysql');
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

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:false}));
app.use(checkLoginToken);


function checkLoginToken(req,res,next){
  if (req.cookies.SESSION){
    redditAPI.checkUserSession(req.cookies.SESSION, function(err, data){
      if(err){
        console.log("erererer");
      }
      else if (data){
        req.loggedInAs = data[0];  
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

app.set("view engine", "pug");

app.get("/posts", function(req,res){
  var listThisMany = {};
  if (req.query.onePost > 0){
    listThisMany = {numPerPage:1, page:0};
  }
  else{
    listThisMany = {numPerPage:25, page:0};
  }
  redditAPI.getAllPosts(listThisMany, "NEW", function(err,data){
    if (err){
      console.log("errorz");
    }
    else{
      res.render('post-list', {posts:data, username: "logged in as: "+ req.loggedInAs.username});
    }
  });
});

app.get("/createContent", function(req,res){
  res.render('create-content', {login: "logged in as: "+ req.loggedInAs.username});
});


app.post("/createContent",function(req,res){
  if (!req.loggedInAs){
    res.send("must be logged in");
  }
  else{
    var postInfo = {userId: req.loggedInAs.id, srID : 4};
    postInfo.title = req.body.title;
    postInfo.url = req.body.url;
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
  console.log(req.body.numOfPosts);
  if (req.query.sort){
    sortThis = req.query.sort;
  }
  if (req.query.numOfPosts){
    listThisMany.numPerPage = Number(req.query.numOfPosts);
  }
  redditAPI.getAllPosts(listThisMany, sortThis, function(err, data){
    if (err){
      console.log("homepage problems");
    }
    else{
      res.render('post-list', {posts:data, login: "logged in as: "+ req.loggedInAs.username});
    }
  });
});

app.get("/subreddits", function(req,res){
  redditAPI.showAllSubs(function(err, data){
    if (err){
      console.log("subreddit error", err);
    }
    else{
      res.render('subreddit-list', {subreddits: data, username: req.loggedInAs.username});
    }
  });
});

app.get("/r/:subreddit", function(req,res){
  console.log(req.params.subreddit);
  redditAPI.showSubreddit(req.params.subreddit, function(err, data){
    if (err){
      console.log("subreddit woes", err);
    }
    else{
      res.render('subreddit-posts', {posts: data, theTitle: req.params.subreddit, theDescription: data[0].description});
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



app.get('/login', function(req,res){
  res.render('login-account');
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

app.get('/vote', function(req,res,next){
  if(!req.loggedInAs){
    res.send("must be logged in to vote");
  }
  else{
    var theVote = {num: req.query.vote, post: req.query.postID};
    redditAPI.voteCast(theVote, req.loggedInAs, function(err, result){
      if (err){
        console.log(err);
      }
      else{
        res.redirect("/home");
      }
    });
  }
});






/* YOU DON'T HAVE TO CHANGE ANYTHING BELOW THIS LINE :) */

// Boilerplate code to start up the web server
var server = app.listen(process.env.PORT, process.env.IP, function () {
    var host = server.address().address;
    var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});


