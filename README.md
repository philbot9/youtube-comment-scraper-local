Youtube Comment Scraper
=================
A Youtube Comment Scraper written in NodeJS. Scrapes all comments from a Youtube video and stores them in an SQLite database. ***This is still a Work-In-Progress!***
###Installation
```
$ npm install
```
###Usage
```
$ node index.js '{video_id}'
```
Where `video_id` is Youtube's own video ID. 

Example: *youtube.com/watch?v=* ***5yB3n9fu-rM***

```
$ node index.js '5yB3n9fu-rM'
```

###Output
The database is stored in 'comments.db' in the app's directory. A new table is created for each video in which all of its comments are stored. The comments are ordered chronologically by 'Newest First', except when they are replies to another comment. Replies are stored (themselves chronologically) immediately after the comment they apply to and are marked as such.
#####Database Table layout
```
|----+--------------------+------------+------------+-----------+---------+-----------+--------------+---------------|
| id |  youtubeCommentID  |    user    |    date    |  dateYT   |  likes  |  replyTo  |  numReplies  |  commentText  |
|----+--------------------+------------+------------+-----------+---------+-----------+--------------+---------------|
|  0 | z12dczwilty5z...   |   user1    | YYYY-MM-DD | 1 week go |    1    |    -1     |      1       | "durpadurp"   |
|  1 | z132cziltayYz...   |   user1    | YYYY-MM-DD | 1 week go |    0    |     0     |      0       | "adurpdurp"   |
```

#####Columns
| *Name* | *Type* |  *Description* |
|-----|-----|-----|
|id|_INTEGER_| **Primary Key**, unique id for each comment|
|youtubeCommentID| _TEXT_ | Youtube's own comment id |
|user| _TEXT_ | username of the comment's author |
|date| _TEXT_ | the current date minus Youtube's date (i.e. minus 1 year for '_1 year ago_')|
|dateYT| _TEXT_ | The date as it is shown on the Youtube website (i.e. '_1 year ago_')|
|likes| _INTEGER_ | the number of upvotes minus the number of downvotes (always >=0)|
|replyTo| _INTEGER_ | the id of the comment this comment is a reply to, -1 if it's not a reply |
|numReplies| _INTEGER_| the number of replies the comment has had |
|commentText|_TEXT_|the actual content of the comment|
