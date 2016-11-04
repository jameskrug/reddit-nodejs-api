SELECT 
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
GROUP BY posts.id 
ORDER BY (((COUNT(votes.vote)) * (COUNT(votes.vote))) WHERE votes.vote = 1) / ((COUNT(votes.vote)) WHERE votes.vote = -1))); 


    SELECT 
        COUNT(vote) WHERE (vote = -1),
        COUNT(vote) AS "upvote" WHERE (vote = 1)
        FROM votes;
        
        
    (IF voteScore > 0) THEN 
        (COUNT(votes.vote) * (COUNT(votes.vote) WHERE votes.vote = 1) / (COUNT(votes.vote WHERE votes.vote = -1)) 
    ELSE COUNT(votes.vote) * ((COUNT(votes.vote) WHERE votes.vote = -1) / (COUNT(votes.vote WHERE votes.vote = 1))
END IF));


