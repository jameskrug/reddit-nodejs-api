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


var theQuery = "SELECT posts.id, posts.title, posts.url, posts.userId,  posts.createdAt,  posts.updatedAt,  users.username,  users.createdAt AS 'usersince',  users.updatedAt AS 'userupdate', subreddits.title AS 'subredditName', subreddits.description AS 'subredditDesc', subreddits.createdAt AS 'subredditSince', subreddits.updatedAt AS 'subredditUpdate', SUM(votes.vote) AS 'voteScore' FROM posts JOIN users ON (posts.userId = users.id) LEFT JOIN subreddits ON (subreddits.id = posts.subreddit_id) LEFT JOIN votes ON (posts.id = votes.postid) GROUP BY posts.id ORDER BY posts.createdAt DESC LIMIT ? OFFSET ?;";


app.get('/hello', function(req,res){
  var x = "";
  //https://redditnodejsapi-jameskrug.c9users.io/hello?firstname=bob
  console.log(req.method + ' ' + req.query.firstname);
  x = "hello, " + req.query.firstname+ " im watching you";
  res.send(x);
});

app.get("/hi/:name", function(req,res){
  //https://redditnodejsapi-jameskrug.c9users.io/hi/bill
  res.send("Hi "+req.params.name);
});

app.get("/calculator/:operation", function(req,res){
  var theOperation = {};
  theOperation.op = req.params.operation;
  theOperation.num1 = parseInt(req.query.num1);
  theOperation.num2 = parseInt(req.query.num2);
  switch (theOperation.op) {
    case "add":
      //https://redditnodejsapi-jameskrug.c9users.io/calculator/add?num1=7&num2=124324
      theOperation.solution = theOperation.num1 + theOperation.num2;
      break;
    case "sub":
      //https://redditnodejsapi-jameskrug.c9users.io/calculator/sub?num1=22&num2=12
      theOperation.solution = theOperation.num1 - theOperation.num2;
    break;
    case "mult":
      //https://redditnodejsapi-jameskrug.c9users.io/calculator/mult?num1=3&num2=55
      theOperation.solution = theOperation.num1 * theOperation.num2;
    break;
    case "div":
      //https://redditnodejsapi-jameskrug.c9users.io/calculator/div?num1=344&num2=17
      theOperation.solution = theOperation.num1 / theOperation.num2;
    break;
    default:
      res.sendStatus(402);
  }
  res.send(JSON.stringify(theOperation, null, 4));
});

app.set("view engine", "pug");

app.get("/posts", function(req,res){
  var listThisMany = {};
  if (req.query.onePost > 0){
    listThisMany = {numPerPage:1, page:0};
  }
  else{
    listThisMany = {numPerPage:6, page:0};
  }
  redditAPI.getAllPosts(listThisMany, theQuery, function(err,data){
    if (err){
      console.log("errorz");
    }
    else{
      res.render('post-list', {posts:data});
      // var redditData = (`
      //     <div id="contents">
      //       <h1>List of contents</h1>
      //         <ul class="contents-list">
      //           <li class="content-item">`);
      // if (req.query.onePost > 0){
      //   redditData += `<h2 class="content-item__title">
        
      //       <a href=${data[0].url}>${data[0].title}</a>
      //       </h2>
      //       <p>Created by ${data[0].user.username}</p>`
      //   }
      // else{
      //   for (var i = 0; i < data.length; i++){
      //     redditData += `<h2 class="content-item__title">
        
      //       <a href=${data[i].url}>${data[i].title}</a>
      //       </h2>
      //       <p>Created by ${data[i].user.username}</p>`
      //   }
      // }
      //   redditData += (`
      //         </li>
      //       </ul>
      //     </div>`);
      // res.send(redditData);
    }
  });
});

app.get("/createContent", function(req,res){
  res.send(`<form action="/createContent" method="POST">
  <div>
    <input type="text" name="url" placeholder="Enter a URL to content">
  </div>
  <div>
    <input type="text" name="title" placeholder="Enter the title of your content">
  </div>
  <button type="submit">Create!</button>
</form>`);
  
});

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:false}));

app.post("/createContent",function(req,res){
  var postInfo = {userId:7,srID:7};
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
});

app.get('/', function (req, res) {
  res.send('<h1>Hello World!xyz</h1>\n');
  console.log(req.method + ' ' + req.url);
});

app.get("/home", function (req,res){
  var listThisMany = {numPerPage:25, page:0};
  var sortThis = "NEWEST";
  if (req.query.sort){
    sortThis = req.query.sort;
  }
  if (req.query.posts){
    listThisMany.numPerPage = Number(req.query.posts);
  }
  console.log(listThisMany);
  redditAPI.getAllPosts(listThisMany, sortThis, function(err, data){
    if (err){
      console.log("homepage problems");
    }
    else{
      res.render('post-list', {posts:data});
    }
  });
});

app.post('/home', function (req, res){
  res.redirect("/home/?sort="+req.body.sortType+"&posts="+req.body.numOfPosts);
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






/* YOU DON'T HAVE TO CHANGE ANYTHING BELOW THIS LINE :) */

// Boilerplate code to start up the web server
var server = app.listen(process.env.PORT, process.env.IP, function () {
    var host = server.address().address;
    var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});


