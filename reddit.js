var bcrypt = require('bcrypt');
var HASH_ROUNDS = 10;
var secureRandom = require("secure-random");

module.exports = function RedditAPI(conn) {
  return {
    
    removeSession: function(token, callback){
      conn.query(`
        DELETE FROM sessions
        WHERE token = ?`,[token],function(err,result){
          if(err){
            callback("still have cookie" ,err);
          }
          else{
            callback(null,result);
          }
        })
    },
    createSession: function(userId, callback){
      var token = secureRandom.randomArray(100).map(code => code.toString(36)).join('');
      conn.query('INSERT INTO sessions SET username = ?, token = ?, user_id = ?', [userId.username, token, userId.id], function(err, result) {
          if(err) {
            callback(err);
          }
          else {
            // console.log(token);
            callback(null, token);
          }
    });
    },
    
    checkUserSession: function(token, callback){
      conn.query(`
      SELECT
        users.username,
        users.id
      FROM users
      LEFT JOIN sessions ON (users.id = sessions.user_id)
      WHERE (sessions.token = ?);
      `, [token], function(err, result){
        if (err){
          callback("token issues", err);
        }
        else{
          callback(null,result);
        }
      });
    },
    
    createUser: function(user, callback) {
      // first we have to hash the password...
      bcrypt.hash(user.password, HASH_ROUNDS, function(err, hashedPassword) {
        if (err) {
          callback(err);
        }
        else {
          conn.query(
            'INSERT INTO users (username,password, createdAt) VALUES (?, ?, ?)', [user.username, hashedPassword, new Date()],
            function(err, result) {
              if (err) {
                /*
                There can be many reasons why a MySQL query could fail. While many of
                them are unknown, there's a particular error about unique usernames
                which we can be more explicit about!
                */
                if (err.code === 'ER_DUP_ENTRY') {
                  callback(new Error('A user with this username already exists'));
                }
                else {
                  callback(err);
                }
              }
              else {
                /*
                Here we are INSERTing data, so the only useful thing we get back
                is the ID of the newly inserted row. Let's use it to find the user
                and return it
                */
                conn.query(
                  'SELECT id, username, createdAt, updatedAt FROM users WHERE id = ?', [result.insertId],
                  function(err, result) {
                    if (err) {
                      callback(err);
                    }
                    else {
                      /*
                      Finally! Here's what we did so far:
                      1. Hash the user's password
                      2. Insert the user in the DB
                      3a. If the insert fails, report the error to the caller
                      3b. If the insert succeeds, re-fetch the user from the DB
                      4. If the re-fetch succeeds, return the object to the caller
                      */
                        callback(null, result[0]);
                    }
                  }
                );
              }
            }
          );
        }
      });
    },
    
    checkLogin : function(user, pass, callback) {
      conn.query('SELECT * FROM users WHERE username = ?', [user], function(err, result) {
        if(err){
          callback(err);
        }
        else if (result.length == 0) {
          callback(new Error('no user of this name'));
        }
        else {
          bcrypt.compare(pass, result[0].password, function(err, match) {
            if (err){
              callback(err);
            }
            else if(match == true) {
              callback(null, result[0]);
            }
            else {
              callback(new Error('bad password'));
            }
          });
        }
      });
    },
    
    createPost: function(post, callback) {
      console.log(post);
      conn.query(
        'INSERT INTO posts (userId, title, url, subreddit_id, createdAt) VALUES (?, ?, ?, ?, ?)', [post.userId, post.title, post.url, post.srID, new Date()],
        function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            /*
            Post inserted successfully. Let's use the result.insertId to retrieve
            the post and send it to the caller!
            */
            conn.query(
              'SELECT id,title,url,userId, createdAt, updatedAt FROM posts WHERE id = ?', [result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
            );
          }
        }
      );
    },
    
    createSubreddit: function(newSub, callback) {
      console.log(newSub);
      conn.query(
        `INSERT INTO subreddits (title, description, createdAt) VALUES (?, ?, ?);`, 
        [newSub.name, newSub.desc, new Date()], function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            conn.query('SELECT title, description, createdAt FROM subreddits WHERE id = ?;',[result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
            );
          }
        }
      );
    },
  
    
    getAllPosts: function(options, answer, callback) {
      var sortString = "";
      // In case we are called without an options parameter, shift all the parameters manually
      if (answer== "TOP"){
          sortString = "ORDER BY SUM(votes.vote) DESC";
      }
      else if (answer == "NEW"){
          sortString =  "ORDER BY posts.createdAt DESC";
      }
      else if (answer == "OLDEST"){
          sortString =  "ORDER BY posts.createdAt ASC";
      }
      else if (answer == "CONTROVERSIAL"){
          sortString = "ORDER BY (IF SUM(votes.vote) > 0 THEN (COUNT(votes.vote) * (numUpvotes / numDownvotes) : totalVotes * (numDownvotes / numUpvotes)";
      }
      else if (answer == "HOT"){
          sortString = " ORDER BY (SUM(votes.vote)) / (CURRENT_TIMESTAMP - posts.createdAt) ";
      }
     
      var theQuery = `SELECT 
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
      
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page) * limit;
      conn.query(theQuery, [limit, offset],
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
             var theData = results.map(function(x){
              return {id: x.id, title: x.title, url:x.url, createdAt:x.createdAt, updatedAt:x.updatedAt, user:{userId:x.userId, username:x.username,createdAt:x.usersince,updatedAt:x.userupdate}, subreddit: {title: x.subredditName, description: x.subredditDesc, createdAt: x.subredditSince, updatedAt: x.subredditUpdate},voteScore: x.voteScore};
            });
            callback(null, theData);
          }
        }
      );
    },
    
    getUsersPosts: function(options, callback) {
      if (!callback) {
        callback = options;
        options = {};
      }
      var thisUser = options.userId;
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;
      conn.query(`
        SELECT posts.id, title, url, userId, posts.createdAt, posts.updatedAt, users.username, users.createdAt AS "usersince", users.updatedAt AS "userupdate"
        FROM posts
        JOIN users ON (posts.userId = users.id)
        WHERE (users.id = ?)
        ORDER BY createdAt ASC
        LIMIT ? OFFSET ?`
        , [thisUser, limit, offset],
        function(err, results) {
          if (err) {
            callback(err);
          }
           else {
             var theData = results.map(function(x){
              return {id: x.id, title: x.title, url:x.url, createdAt:x.createdAt, updatedAt:x.updatedAt, user:{userId:x.userId, username:x.username,createdAt:x.usersince,updatedAt:x.userupdate}};
            });
            callback(null, theData);
          }
        }
      );
    },
    
    getOnePost: function(options, callback) {
      var postId = options;
      conn.query(`
        SELECT 
          posts.id, 
          title, 
          url, 
          posts.userId, 
          posts.createdAt,
          posts.updatedAt, 
          users.username, 
          users.createdAt AS "usersince", 
          users.updatedAt AS "userupdate",
          comments.id AS "commentid",
          comments.userid AS "commentuserid",
          comments.parentid AS "parentid",
          comments.comment,
          comments.postid
        FROM posts
        JOIN users ON (posts.userId = users.id)
        LEFT JOIN comments ON (posts.id = comments.postid)
        WHERE (posts.id = ?)
        ORDER BY createdAt ASC`
        // LIMIT ? OFFSET ?`
        , [postId],
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            var theData = results.map(function(x){
              return {comment: x.comment, username: x.username, postid: x.postid, commentid: x.commentid, commentuserid: x.commentuserid, parentid: x.parentid, id: x.id, title: x.title, url:x.url, createdAt:x.createdAt, updatedAt:x.updatedAt, user:{userId:x.userId, username:x.username,createdAt:x.usersince,updatedAt:x.userupdate}};
            });
            callback(null, theData);
          }
        }
      );
    },
    
    showAllSubs: function(callback) {
      conn.query(`
        SELECT 
          title,
          description
        FROM subreddits
        ORDER BY createdAt ASC;`,
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            callback(null, results);
          }
        }
      );
    },
    
    showSubreddit: function(thisSub, answer, callback){
      var sortString = "";
      // In case we are called without an options parameter, shift all the parameters manually
      if (answer== "TOP"){
          sortString = "ORDER BY SUM(votes.vote) DESC";
      }
      else if (answer == "NEW"){
          sortString =  "ORDER BY posts.createdAt DESC";
      }
      else if (answer == "OLDEST"){
          sortString =  "ORDER BY posts.createdAt ASC";
      }
      else if (answer == "CONTROVERSIAL"){
          sortString = "ORDER BY (IF SUM(votes.vote) > 0 THEN (COUNT(votes.vote) * (numUpvotes / numDownvotes) : totalVotes * (numDownvotes / numUpvotes)";
      }
      else if (answer == "HOT"){
          sortString = " ORDER BY (SUM(votes.vote)) / (CURRENT_TIMESTAMP - posts.createdAt) ";
      }
      
      conn.query(`
      SELECT
        posts.id,
        posts.title,
        posts.url,
        posts.userId,
        posts.subreddit_id,
        subreddits.title AS "subredditTitle",
        subreddits.description,
        users.username,
        SUM(votes.vote) AS "voteScore"
      FROM posts
      LEFT JOIN subreddits ON (subreddits.id = posts.subreddit_id)
      LEFT JOIN users ON (users.id = posts.userId)
      LEFT JOIN votes ON (votes.postid = posts.id)
      WHERE subreddits.title = ?
      GROUP BY posts.id ` + sortString + `;`
      , [thisSub], 
      
      // 
      function(err, data){
        if (err){
          callback(err);
        }
        else{
          callback(null, data);
        }
      });
    },
    
    userLookup: function(thisUser, callback) {
      conn.query(`
        SELECT id, username
        FROM users
        WHERE (users.id = ?)`, [thisUser],
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            callback(null, results);
          }
        }
      );
    },
    
    voteCast: function(votes, user, callback){
      conn.query(`
      INSERT INTO votes 
      SET postId=?, 
      userId=?, 
      vote=?, 
      createdAt=? 
      ON DUPLICATE KEY UPDATE vote=?;`,[votes.post, user.id, votes.num, new Date(), votes.num],
      function(err, results){
        if(err){
          callback(err);
        }
        else{
          callback(null, results);
        }
      });
    },
    
    leaveTheComment: function(theStuff, userStuff, callback){
      conn.query(`
      INSERT INTO comments 
      SET userid = ?, 
      postid = ?, 
      parentid = ?, 
      comment = ?,
      createdAt = ?
      ;`,[userStuff.id, theStuff.num, theStuff.parent, theStuff.comment, new Date()],
      function(err, results){
        if(err){
          callback(err);
        }
        else{
          console.log("we got your comment");
          callback(null, results[0]);
        }
      });
    },
    
    getTheComments: function(thisPost, callback){
      conn.query(`
      SELECT
        comments.id AS "commentid",
        comments.postid,
        comments.parentid,
        comments.comment,
        posts.title,
        posts.url,
        posts.id,
        users.id,
        users.username
      FROM comments
      JOIN posts ON (comments.postid = posts.id)
      LEFT JOIN users ON (users.id = comments.userid)
      WHERE (posts.id = ?)
      ORDER BY comments.parentid;`, [thisPost],
      function(err, results){
        if (err){
          callback(err);
        }
        else{
          callback(null, results);
        }
      });
    }
  };
};
