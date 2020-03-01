const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');
const cors = require('cors');


const app = express();

app.use(cors());

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB({ region: 'us-east-1' });

app.get('/', async (req, res) => {
    let list = await getAllSongs(res);
    res.render('index', { keys: createArtistList(list) })
});

app.get('/genres', async (req, res) => {
    res.json(await getGenresDDB());
});

app.get('/artists/for/genre', async (req, res) => {
    res.json(await getArtistForGenre(req.query.genre));
});

app.get('/albums/for/artist', async (req, res) => {
    res.json(await getAlbumsForArtist(req.query.artist));
});

app.get('/songs/for/album', async (req, res) => {
    res.json(await getSongsForAlbum(req.query.album));
});

app.get('/song', async (req, res) => {
    res.json(await getSongDDB(req.query.song));
});

app.post('/save-user', async (req, res) => {
    let userID = req.query.id;
    let name = req.query.name;
    let email = req.query.email;

    putDBItem("users", userID);
    putDBItem(userID, email);
    putDBItem(email, name);

});

//listening to server 3000
app.listen(3000, () => {
    console.log('Server running on port 3000');
});


async function getAllSongs(res) {
    const getParams = {
        Bucket: 'awsmusicservice'
    };

    let allKeys = [];

    const data = await s3.listObjects(getParams).promise()
        .catch(
            (err) => {
                console.error(err, err.stack);
                Promise.reject(err);
            });

    data.Contents.forEach((song) => {
        allKeys.push(song.Key);
    });
    return allKeys;
}

async function getSongURL(filename) {
    const getParams = {
        Bucket: 'awsmusicservice',
        Key: filename
    };
    const url = await s3.getSignedUrlPromise('getObject', getParams)
        .catch(
            (err) => {
                console.error(err, err.stack);
                Promise.reject(err);
            });
    console.log(url);
    return url;
}

//list items look like artist/album/song
function createArtistList(list) {
    let artistList = {};

    list.forEach(key => {
        let split_song = key.split('/');
        let artist = split_song[0];
        let album = split_song[1];
        let song = split_song[2];
        if (artistList[artist] != null) {
            if (artistList[artist][album] == null) {
                artistList[artist][album] = [];
                artistList[artist][album].push(song);
            } else {
                artistList[artist][album].push(song);
            }
        } else {
            artistList[artist] = {};
            artistList[artist][album] = [];
            artistList[artist][album].push(song);
        }
    });

    return artistList;
}

async function getGenresDDB() {
    let getParams = {
        TableName: "Music-Table",
        ExpressionAttributeValues: {
            ':genre': { S: "genres" }
        },
        KeyConditionExpression: 'PK = :genre'
    }

    let result = await dynamodb.query(getParams).promise()
        .catch(
            (err) => {
                console.error(err, err.stack);
                Promise.reject(err);
            });

    let returnObject = [];
    result.Items.forEach((genreObject) => {
        returnObject.push(genreObject["SK"]["S"]);
    });
    return returnObject;
}

async function getSongDDB(songTitle) {
    let getParams = {
        TableName: "Music-Table",
        ExpressionAttributeValues: {
            ':songTitle': { S: songTitle }
        },
        KeyConditionExpression: 'PK = :songTitle'
    }

    let result = await dynamodb.query(getParams).promise()
        .catch(
            (err) => {
                console.error(err, err.stack);
                Promise.reject(err);
            });

    let songURL = [];
    result.Items.forEach((songObject) => {
        songURL.push(songObject["SK"]["S"]);
    });
    return await getSongURL(songURL[0]);
}

async function getArtistForGenre(genre) {
    let getParams = {
        TableName: "Music-Table",
        ExpressionAttributeValues: {
            ':genre': { S: genre }
        },
        KeyConditionExpression: 'PK = :genre'
    }

    let result = await dynamodb.query(getParams).promise()
        .catch(
            (err) => {
                console.error(err, err.stack);
                Promise.reject(err);
            });

    let returnObject = [];
    result.Items.forEach((artistObject) => {
        returnObject.push(artistObject["SK"]["S"]);
    });
    return returnObject;
}

async function getAlbumsForArtist(artist) {
    let getParams = {
        TableName: "Music-Table",
        ExpressionAttributeValues: {
            ':artist': { S: artist }
        },
        KeyConditionExpression: 'PK = :artist'
    }

    let result = await dynamodb.query(getParams).promise()
        .catch(
            (err) => {
                console.error(err, err.stack);
                Promise.reject(err);
            });

    let returnObject = [];
    result.Items.forEach((albumObject) => {
        returnObject.push(albumObject["SK"]["S"]);
    });
    return returnObject;
}

async function getSongsForAlbum(album) {
    let getParams = {
        TableName: "Music-Table",
        ExpressionAttributeValues: {
            ':album': { S: album }
        },
        KeyConditionExpression: 'PK = :album'
    }

    let result = await dynamodb.query(getParams).promise()
        .catch(
            (err) => {
                console.error(err, err.stack);
                Promise.reject(err);
            });

    let returnObject = [];
    result.Items.forEach((songObject) => {
        returnObject.push(songObject["SK"]["S"]);
    });
    return returnObject;
}

async function putDBItem(PK, SK) {
    let DBParams = {};
    if(SK == ""){
        DBParams = {
            TableName: "User-Table",
            Item: { "PK": {"S": PK},"SK": {"S": "NULL"} }
        };
    } else {
        DBParams = {
            TableName: "User-Table",
            Item: { "PK": {"S": PK},"SK": {"S": SK} }
        };
    };
    
    dynamodb.putItem(DBParams).promise()
        .then(
            console.log("Item added to dynamoDB")
        )
        .catch(
            (err) => {
            console.error(err, err.stack);
            });
    return;
}